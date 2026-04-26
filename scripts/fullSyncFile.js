import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import { glob } from "glob";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from 'url';
import cliProgress from 'cli-progress';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_ROOT = path.resolve(__dirname, "../gallery-root");
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// 初始化进度条管理器
const multibar = new cliProgress.MultiBar({
    clearOnDone: false,
    hideCursor: true,
    format: ' {bar} | {percentage}% | {value}/{total} | {action} : {file}',
}, cliProgress.Presets.shades_grey);

async function sync() {
    try {
        console.log("🔍 正在扫描文件状态...");
        
        // 1. 获取本地文件
        const localFiles = await glob(`**/*`, { cwd: LOCAL_ROOT, nodir: true, posix: true });

        // 2. 获取云端文件
        const remoteFiles = [];
        let isTruncated = true;
        let continuationToken;
        while (isTruncated) {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken,
            }));
            if (response.Contents) remoteFiles.push(...response.Contents.map(c => c.Key));
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        const toUpload = localFiles.filter(f => !remoteFiles.includes(f));
        const toDownload = remoteFiles.filter(f => !localFiles.includes(f));

        if (toUpload.length === 0 && toDownload.length === 0) {
            console.log("✅ 已经是最新状态，无需同步。");
            multibar.stop();
            return;
        }

        // 3. 执行同步过程
        // 上传进度条
        if (toUpload.length > 0) {
            const upBar = multibar.create(toUpload.length, 0, { action: '⬆️ 上传', file: '准备中' });
            for (let i = 0; i < toUpload.length; i++) {
                const file = toUpload[i];
                upBar.update(i + 1, { file: file });
                
                const filePath = path.join(LOCAL_ROOT, file);
                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: file,
                    Body: fs.readFileSync(filePath),
                    ContentType: file.toLowerCase().endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream'
                }));
            }
            upBar.update(toUpload.length, { file: '全部上传完成' });
        }

        // 下载进度条
        if (toDownload.length > 0) {
            const downBar = multibar.create(toDownload.length, 0, { action: '⬇️ 下载', file: '准备中' });
            for (let i = 0; i < toDownload.length; i++) {
                const file = toDownload[i];
                downBar.update(i + 1, { file: file });
                
                const localFilePath = path.join(LOCAL_ROOT, file);
                fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

                const response = await s3Client.send(new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: file,
                }));
                await pipeline(response.Body, fs.createWriteStream(localFilePath));
            }
            downBar.update(toDownload.length, { file: '全部下载完成' });
        }

        multibar.stop();
        console.log("\n✨ 麦迪的照片库双向同步已完成！");

    } catch (error) {
        multibar.stop();
        console.error("\n❌ 同步失败:", error.message);
    }
}

sync();