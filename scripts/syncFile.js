import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import { glob } from "glob";
import fs from "fs";
import path from "path";
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

// 媒体类型映射表
const MIME_TYPES = {
    // 图片
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    // 视频
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo'
};

const ALLOWED_EXTS = Object.keys(MIME_TYPES);

const multibar = new cliProgress.MultiBar({
    clearOnDone: false,
    hideCursor: true,
    format: ' {bar} | {percentage}% | {value}/{total} | {action} : {file}',
}, cliProgress.Presets.shades_grey);

async function sync() {
    try {
        console.log("🔍 正在扫描本地媒体文件 (含视频)...");
        
        // 1. 获取本地文件并过滤非媒体文件
        const allLocalFiles = await glob(`**/*`, { cwd: LOCAL_ROOT, nodir: true, posix: true });
        const localFiles = allLocalFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ALLOWED_EXTS.includes(ext);
        });

        // 2. 获取云端文件列表 (排除 _thumbs)
        const remoteFiles = [];
        let isTruncated = true;
        let continuationToken;
        while (isTruncated) {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken,
            }));
            if (response.Contents) {
                const filtered = response.Contents
                    .map(c => c.Key)
                    .filter(key => !key.startsWith('_thumbs/'));
                remoteFiles.push(...filtered);
            }
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        // 计算差集：本地有，云端没有
        const toUpload = localFiles.filter(f => !remoteFiles.includes(f));

        if (toUpload.length === 0) {
            console.log("✅ 云端已同步，没有发现新的媒体文件。");
            multibar.stop();
            return;
        }

        // 3. 执行单向上传
        const upBar = multibar.create(toUpload.length, 0, { action: '⬆️ 上传', file: '等待中' });
        
        for (let i = 0; i < toUpload.length; i++) {
            const file = toUpload[i];
            const ext = path.extname(file).toLowerCase();
            const filePath = path.join(LOCAL_ROOT, file);
            
            upBar.update(i, { file: file });

            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file,
                Body: fs.readFileSync(filePath),
                ContentType: MIME_TYPES[ext] || 'application/octet-stream'
            }));
            
            upBar.update(i + 1);
        }

        multibar.stop();
        console.log(`\n✨ 同步完成！共上传了 ${toUpload.length} 个媒体文件。`);

    } catch (error) {
        if (multibar) multibar.stop();
        console.error("\n❌ 同步出错:", error.message);
    }
}

sync();