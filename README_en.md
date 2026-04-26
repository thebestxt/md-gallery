# MD-Gallery

[English] | [简体中文](./README.md)

![](./gallery-root/example/md-icon.png)

**MD-Gallery** is a lightweight, high-performance Static Site Generation (SSG) tool for photo galleries, powered by **Cloudflare R2** and **Cloudflare Pages**. It automates the entire workflow—from organizing local files and uploading original images to generating thumbnails, extracting EXIF data, and deploying the frontend.

## ⚡️ Key Features

* **Cloudflare Native**: Seamless integration with R2 for storage and Pages for hosting.
* **Automatic Image Processing**: Generates WebP thumbnails and video covers automatically.
* **EXIF Data Extraction**: Automatically displays camera model, aperture, shutter speed, and ISO for every photo.
* **Zero-Cost Hosting**: Fully compatible with Cloudflare's free tier (R2 10GB / Pages unlimited).
* **Responsive Design**: Horizontal scroll gallery optimized for both Desktop and Mobile.

## 🛠 Prerequisites

Ensure you have the following environments ready:

```sh
$ node -v  # v22.22.2 or higher recommended
$ pnpm -v  # 9.12.1 or higher
```

* **Cloudflare Account**: With R2 and Pages enabled.
* **Bucket Configuration**: A Public R2 bucket with a custom domain or R2.dev URL.

## 🚀 Installation

Install the project dependencies:

```sh
$ pnpm install
```

## 📖 Usage Guide

### 1. Configuration
Copy the example environment file and fill in your Cloudflare credentials:

```sh
$ cp .env.example .env
```

| Field | Description |
| :--- | :--- |
| `R2_ACCESS_KEY_ID` | R2 API Token ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret |
| `R2_BUCKET_NAME` | Name of your R2 Bucket |
| `R2_ENDPOINT` | R2 Endpoint URL |
| `R2_REGION` | Usually set to `auto` |
| `R2_IMAGE_BASE_URL` | The public URL prefix of your bucket |
| `CF_PAGES_PROJECT_NAME` | Your Cloudflare Pages project name |
| `VITE_SITE_TITLE` | The title displayed on the website |
| `VITE_SITE_SINA` | Website subtitle |
| `VITE_ICP` | ICP registration info (for CN users) |
| `VITE_COPYRIGHT` | Copyright text in the footer |

### 2. Full Workflow
Run the following command to sync files, generate previews, build the index, and deploy:

```sh
$ pnpm run sync-file && pnpm run gen-preview && pnpm run build-json && pnpm run deploy-cfpage
```

## 🧩 Detailed Module Description

### Sync Files
```sh
$ pnpm run sync-file
```
Triggers `./scripts/syncFile.js` to perform an incremental update between your local folder and R2. Use `sync-file-full` for a total sync.

### Generate Previews
```sh
$ pnpm run gen-preview
```
Triggers `./scripts/generatePreview.js`. It creates a `_thumbs` directory in R2, generating optimized WebP thumbnails for images and frame-grabs for videos.

### Build Gallery Metadata
```sh
$ pnpm run build-json
```
Triggers `node ./scripts/generateStructure.js`. It scans R2 to create `structure.json`, using `exifr` to extract photography parameters like Focal Length and Lens Model.

### Deployment
```sh
$ pnpm run deploy-cfpage
```
Uses `wrangler` to build the frontend and deploy the static assets to Cloudflare Pages.

## 📄 License

This project is licensed under the **MIT License**.

---

Should I add a "Troubleshooting" section specifically for the Cloudflare CORS settings we discussed?