# MD-gallery

[简体中文] | [English](./documents/README_en.md)

![](./gallery-root/md-icon.png)

MD Gallery 是一个依靠于 Cloudflare R2 和 Cloudflare Pages 的影集 SSG 工具，你只需要在本地组织影集结构，MD Gallery 的脚本可以自动处理原图上传、缩略图生成、相册目录结构生成、前端页面生成。

## 环境准备

```sh
$ node -v
v22.22.2

$ pnpm -v
9.12.1
```

+ Cloudflare 账号

+ Cloudflare 绑定域名

+ 开通 Cloudflare R2 对象存储并创建存储桶

+ 开通 Cloudflare Pages 并创建项目

## 安装依赖

```sh
$ pnpm install
```

## 使用步骤

### 1. 准备 env 文件

```sh
$ cp .env.example .env
```

|字段|解释|
|:--:|:--:|
|R2_ACCESS_KEY_ID|R2 API 令牌 ID|
|R2_SECRET_ACCESS_KEY|R2 API 令牌 secret|
|R2_BUCKET_NAME|R2 存储桶名称|
|R2_ENDPOINT|R2 端点 URL|
|R2_REGION|默认是 auto|
|R2_IMAGE_BASE_URL|存储桶公开 url 前缀|
|CF_PAGES_PROJECT_NAME|Cloudflare Pages 名字|
|VITE_SITE_TITLE|站点名，会显示在页面上|
|VITE_SITE_SINA|站点副标题，会显示在页面上|
|VITE_ICP|ICP 备案信息，会显示在页脚|
|VITE_COPYRIGHT|版权信息，会显示在页脚|

### 2. 上传文件
```sh
$ pnpm run sync-file && pnpm run gen-preview && pnpm run build-json && pnpm run deploy-cfpage
```

### 3. 构建 & 部署

```sh
$ pnpm run deploy-cfpage
```

### 4. 访问页面

访问你的 Cloudflare Pages 地址，此时应该可以看到页面效果了。

## 功能

### 1. 同步文件

```sh
$ pnpm run sync-file
```

这条命令会调用脚本 `./scripts/syncFile.js` 对 R2 上的文件进行差量更新。

如果你希望本地和云端保持一致，可以使用全量同步。

```sh
$ pnpm run sync-file-full
```

### 2. 生成缩略图

```sh
$ pnpm run gen-preview
```

这条命令会调用脚本 `./scripts/generatePreview.js`，在云端创建一个 `_thumbs` 目录，并将压缩后的缩略图上传上去。

### 3. 构建影集数据

```sh
$ pnpm run build-json
```

这条命令会调用 `node ./scripts/generateStructure.js`,扫描 R2 上的文件，生成影集结构和数据，并使用 `exifr` 抓取照片的 exif 信息。

### 4. 部署

```sh
$ pnpm run deploy-cfpage
```

这条命令会调用 `wrangler` 来将构建产物部署到 Cloudflare Pages。

## 开源协议

MIT
