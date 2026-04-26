// deploy.js
import { execSync } from 'child_process';
import 'dotenv/config';

// 从环境变量中读取项目名称，如果没有配置则报错提醒
const PROJECT_NAME = process.env.CF_PAGES_PROJECT_NAME; 

async function deploy() {
    if (!PROJECT_NAME) {
        console.error("❌ 错误: 未在 .env 中找到 CF_PAGES_PROJECT_NAME 配置");
        process.exit(1);
    }

    try {
        console.log(`🚀 开始构建项目 [${PROJECT_NAME}]...`);
        execSync('npm run build', { stdio: 'inherit' });

        console.log("☁️ 正在上传到 Cloudflare Pages...");
        // 使用 npx 直接运行 wrangler，避免全局安装依赖
        execSync(`npx wrangler pages deploy ./dist --project-name ${PROJECT_NAME}`, { stdio: 'inherit' });

        console.log(`✅ 部署成功！老板，项目 ${PROJECT_NAME} 已上线。`);
    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        process.exit(1);
    }
}

deploy();