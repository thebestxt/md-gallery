import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import cliProgress from 'cli-progress';
import pLimit from 'p-limit'; // ✨ 需要执行: npm install p-limit

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.resolve(__dirname, "../.temp_processing");
const TARGET_PREFIX = "_thumbs";
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// ✨ M2 芯片建议并发数设为 8-10，兼顾带宽和核心性能
const limit = pLimit(10); 

const s3Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const isVideo = (file) => /\.(mp4|mov|webm|avi)$/i.test(file);
const isImage = (file) => /\.(jpg|jpeg|png|webp|heic)$/i.test(file);

async function processFile(obj, bar) {
    const key = obj.Key;
    const ext = path.extname(key);
    // 使用随机 ID 防止并发冲突
    const fileId = Math.random().toString(36).substring(7);
    const tempSource = path.join(TEMP_DIR, `source_${fileId}${ext}`);
    const tempVideoThumb = path.join(TEMP_DIR, `vthumb_${fileId}.webp`);
    const targetKey = `${TARGET_PREFIX}/${key.replace(/\.[^.]+$/, '.webp')}`;

    try {
        // 1. 下载
        const downloadResponse = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        const chunks = [];
        for await (const chunk of downloadResponse.Body) chunks.push(chunk);
        const sourceBuffer = Buffer.concat(chunks);

        let finalBuffer;

        if (isVideo(key)) {
            // 视频依然需要存一下临时文件给 ffmpeg
            fs.writeFileSync(tempSource, sourceBuffer);
            await new Promise((resolve, reject) => {
                ffmpeg(tempSource)
                    .screenshots({ timestamps: [2], folder: TEMP_DIR, filename: `vthumb_${fileId}.webp`, size: '800x?' })
                    .on('end', resolve)
                    .on('error', reject);
            });
            finalBuffer = await sharp(tempVideoThumb).webp({ quality: 50 }).toBuffer();
        } else {
            // ✨ 图片直接在内存处理，不走磁盘，极快！
            finalBuffer = await sharp(sourceBuffer)
                .resize(1200, null, { withoutEnlargement: true })
                .webp({ quality: 50 })
                .toBuffer();
        }

        // 2. 上传
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: targetKey,
            Body: finalBuffer,
            ContentType: "image/webp"
        }));

    } catch (e) {
        console.error(`\n❌ 处理 ${key} 出错:`, e.message);
    } finally {
        // 清理
        [tempSource, tempVideoThumb].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
        bar.increment();
    }
}

async function run() {
    try {
        console.log("☁️ 正在拉取列表...");
        const allObjects = [];
        let continuationToken;
        do {
            const response = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, ContinuationToken: continuationToken }));
            if (response.Contents) allObjects.push(...response.Contents);
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        const rawFiles = allObjects.filter(o => !o.Key.startsWith(`${TARGET_PREFIX}/`) && (isImage(o.Key) || isVideo(o.Key)));
        const existingThumbs = new Set(allObjects.filter(o => o.Key.startsWith(`${TARGET_PREFIX}/`)).map(o => o.Key));

        const toProcess = rawFiles.filter(raw => {
            const thumbKey = `${TARGET_PREFIX}/${raw.Key.replace(/\.[^.]+$/, '.webp')}`;
            return !existingThumbs.has(thumbKey);
        });

        if (toProcess.length === 0) return console.log("✅ 无需处理");

        console.log(`🚀 M2 并发模式启动，处理 ${toProcess.length} 个文件...`);
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
        bar.start(toProcess.length, 0);

        // ✨ 使用 p-limit 进行并发控制
        const tasks = toProcess.map(obj => limit(() => processFile(obj, bar)));
        await Promise.all(tasks);

        bar.stop();
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log("\n✨ 同步完成！");
    } catch (error) {
        console.error("\n❌ 失败:", error);
    }
}

run();