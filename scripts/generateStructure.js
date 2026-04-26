import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import exifr from 'exifr';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_JSON = path.resolve(__dirname, "../frontend/structure.json");
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const BASE_URL = process.env.R2_IMAGE_BASE_URL?.replace(/\/$/, "") || "";
const THUMBS_PREFIX = "_thumbs";

const s3Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.avi'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

// 格式化函数
const pad = (n) => n.toString().padStart(2, '0');
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// --- 核心：从字符串提取日期 ---
function extractDateFromFolderName(name) {
    const match = name.match(/^(\d{4})(\d{2})(\d{2})/); // 匹配开头的 YYYYMMDD
    if (match) {
        const [_, y, m, d] = match;
        return new Date(`${y}-${m}-${d} 00:00:00`);
    }
    return null;
}

async function generate() {
    try {
        console.log("📂 正在解析云端结构并从合集名提取日期...");

        const allObjects = [];
        let continuationToken;
        do {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            }));
            if (response.Contents) allObjects.push(...response.Contents);
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        const rawObjects = allObjects.filter(o => {
            const ext = path.extname(o.Key).toLowerCase();
            return !o.Key.startsWith(`${THUMBS_PREFIX}/`) && [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
        });

        const collectionsMap = {};

        for (const obj of rawObjects) {
            const fullKey = obj.Key;
            const parts = fullKey.split('/');
            if (parts.length < 2) continue; 

            const albumName = parts[0];
            const relativePath = parts.slice(1).join('/');
            const ext = path.extname(fullKey).toLowerCase();
            const isVideo = VIDEO_EXTS.includes(ext);

            if (!collectionsMap[albumName]) {
                // 尝试从合集名提取日期
                const folderDate = extractDateFromFolderName(albumName);
                collectionsMap[albumName] = { 
                    name: albumName, 
                    createAt: folderDate ? formatDate(folderDate) : null,
                    sortTimestamp: folderDate ? folderDate.getTime() : Infinity, // 用于合集间的排序
                    items: [] 
                };
            }

            let exifData = {};
            let currentMs = obj.LastModified.getTime();

            if (!isVideo) {
                try {
                    const rangeResponse = await s3Client.send(new GetObjectCommand({
                        Bucket: BUCKET_NAME, Key: fullKey, Range: "bytes=0-65535"
                    }));
                    const chunks = [];
                    for await (const chunk of rangeResponse.Body) chunks.push(chunk);
                    const buffer = Buffer.concat(chunks);
                    const rawExif = await exifr.parse(buffer, {
                        pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel']
                    });

                    if (rawExif && rawExif.DateTimeOriginal) {
                        currentMs = new Date(rawExif.DateTimeOriginal).getTime();
                        
                        // ✨ 优化：处理浮点数精度，防止出现 1.779999... 这种怪东西
                        const formatAperture = (f) => f ? `f/${Number(f).toFixed(1).replace(/\.0$/, '')}` : null;
                        const formatFocal = (fl) => fl ? `${Math.round(fl)}mm` : null; // 焦距通常取整即可，手机的 6.76mm 一般看作 7mm

                        exifData = {
                            make: rawExif.Make,
                            model: rawExif.Model,
                            lens: rawExif.LensModel,
                            shutter: rawExif.ExposureTime ? `1/${Math.round(1 / rawExif.ExposureTime)}` : null,
                            // 这里应用格式化
                            aperture: formatAperture(rawExif.FNumber),
                            iso: rawExif.ISO,
                            focalLength: formatFocal(rawExif.FocalLength)
                        };
                    }
                } catch (e) { }
            }

            // 如果合集名没日期，则用合集内最早的图片时间兜底
            if (!collectionsMap[albumName].createAt || currentMs < collectionsMap[albumName].sortTimestamp) {
                if (!extractDateFromFolderName(albumName)) {
                    collectionsMap[albumName].sortTimestamp = currentMs;
                    collectionsMap[albumName].createAt = formatDate(currentMs);
                }
            }

            const thumbPath = fullKey.replace(/\.[^.]+$/, '.webp');
            const thumbUrl = `${BASE_URL}/${THUMBS_PREFIX}/${thumbPath}`;

            collectionsMap[albumName].items.push({
                filename: path.parse(relativePath).name,
                type: isVideo ? 'video' : 'image',
                url: `${BASE_URL}/${fullKey}`,
                thumbUrl: thumbUrl,
                createAt: formatDate(currentMs),
                timestamp: currentMs,
                exif: isVideo ? null : exifData
            });
        }

        const result = Object.values(collectionsMap).map(album => {
            album.items.sort((a, b) => b.timestamp - a.timestamp);
            album.items.forEach(item => delete item.timestamp);
            return album;
        });

        // 最终按合集排序
        result.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
        result.forEach(album => delete album.sortTimestamp);

        fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
        fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));

        console.log(`✨ 索引构建完成！已优先匹配合集名日期进行排序。`);

    } catch (error) {
        console.error("❌ 构建索引失败:", error);
    }
}

generate();