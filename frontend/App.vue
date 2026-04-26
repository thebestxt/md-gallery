<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import galleryData from '@/structure.json';

const siteTitle = import.meta.env.VITE_SITE_TITLE;
const siteSubtitle = import.meta.env.VITE_SITE_SINA;
const icp = import.meta.env.VITE_ICP;
const copyright = import.meta.env.VITE_COPYRIGHT;

const scrollMain = ref(null);
const albumRefs = ref({});

const handleWheel = (e) => {
  if (window.innerWidth > 768 && scrollMain.value) {
    e.preventDefault();
    scrollMain.value.scrollLeft += (e.deltaY + e.deltaX) * 10;
  }
};

onMounted(() => {
  if (scrollMain.value) {
    scrollMain.value.addEventListener('wheel', handleWheel, { passive: false });
  }
});

onUnmounted(() => {
  if (scrollMain.value) {
    scrollMain.value.removeEventListener('wheel', handleWheel);
  }
});

const scrollToAlbum = (name) => {
  const el = albumRefs.value[name];
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
  }
};
const detail = ref({})
const showDetail = ref(false)
const handleCardClick = v => {
    console.log('v', v)

    showDetail.value = true
    detail.value = v
}
const handleCloseDetail = () => {
    detail.value = {}
    showDetail.value = false
}
</script>

<template>
  <div class="app-container">
    <header class="site-header">
        <div class="site-title">{{ siteTitle }}</div>
        <div class="site-subtitle">{{ siteSubtitle }}</div>
        <nav class="category-nav">
           <span v-for="album in galleryData" :key="album.name" @click="scrollToAlbum(album.name)">
             {{ album.name }}
           </span>
        </nav>
    </header>

    <main class="content-scroll-area" ref="scrollMain">
        <div class="content-inner">
            <section 
              v-for="album in galleryData" 
              :key="album.name" 
              class="album-wrapper"
              :ref="el => albumRefs[album.name] = el"
            >
                <div class="album-sticky-header">
                    <div class="album-label">
                        <span class="name">{{ album.name }}</span>
                        <span class="date">{{ album.createAt.split(' ')[0] }}</span>
                    </div>
                </div>

                <div class="photo-list">
                    <div v-for="item in album.items" :key="item.url" class="photo-card" @click="handleCardClick(item)">
                        <div class="img-box">
                            <img :src="item.thumbUrl" loading="lazy" />
                            <div v-if="item.type === 'video'" class="video-play">▶</div>
                        </div>
                        
                        <div class="exif-details" v-if="item.exif">
                            <div class="exif-params">
                                <div class="param-item">
                                    <svg viewBox="0 0 24 24" class="icon"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg>
                                    <span>{{ item.exif.model || 'Unknown Device' }}</span>
                                </div>
                                <div class="param-item">
                                    <span class="label">F</span><b>{{ item.exif.aperture }}</b>
                                </div>
                                <div class="param-item">
                                    <span class="label">S</span><b>{{ item.exif.shutter }}s</b>
                                </div>
                                <div class="param-item">
                                    <span class="label">ISO</span><b>{{ item.exif.iso }}</b>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <footer class="site-footer">
        <div class="powerby">Power By MD gallery</div>
        <div class="copyright">{{ copyright }}</div>
        <a class="icp" target="_blank" href="https://beian.miit.gov.cn/">{{ icp }}</a>
    </footer>
  </div>
  <div :class="['detail-container', showDetail ? 'show' : 'hide']">
    <div class="detail-inner-container">
        <svg class="close-btn" @click="handleCloseDetail" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <div class="detail-item">
            <img class="detail-image" v-if="detail.type === 'image'" :src="detail.url" :alt="detail.filename">
            <video class="detail-video" v-if="detail.type === 'video'" :src="detail.url" controls></video>
        </div>
        <div class="exif-params" v-if="detail.exif">
            <div class="param-item">
                <svg viewBox="0 0 24 24" class="icon"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/></svg>
                <span>{{ detail.exif.model || 'Unknown Device' }}</span>
            </div>
            <div class="param-item">
                <span class="label">F</span><b>{{ detail.exif.aperture }}</b>
            </div>
            <div class="param-item">
                <span class="label">S</span><b>{{ detail.exif.shutter }}s</b>
            </div>
            <div class="param-item">
                <span class="label">ISO</span><b>{{ detail.exif.iso }}</b>
            </div>
        </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$accentColor: #8b4513;

:deep(*) {
    scrollbar-width: none;
    -ms-overflow-style: none;
    box-sizing: border-box; 
    &::-webkit-scrollbar { display: none !important; }
}

@keyframes rotate {
    0% {
        transform: rotate(0);
    }
    50% {
        transform: rotate(180deg);
    }
    99% {
        transform: rotate(359deg);
    }
}

.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-image: radial-gradient(rgba(0, 0, 0, .1) 1.5px, transparent 1.5px), url('/images/desk-bg.webp');
    background-size: 30px 30px, cover;
    background-attachment: fixed;
    overflow: hidden;

    .site-header {
        flex-shrink: 0; padding: 30px 0 10px; z-index: 200;
        .site-title { font-size: 32px; text-align: center; color: #333; font-weight: 800; }
        .site-subtitle { text-align: center; font-size: 16px; color: #666; margin-top: 5px; }
        .category-nav {
            display: flex; justify-content: center; flex-wrap: wrap; gap: 15px; padding: 15px;
            span { cursor: pointer; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; &:hover { color: $accentColor; font-weight: bold; } }
        }
    }

    .content-scroll-area {
        flex: 1; overflow-x: auto; overflow-y: hidden;
        .content-inner { display: flex; height: 100%; align-items: center; padding-right: 100px; }
    }

    .album-wrapper {
        display: flex; height: 65vh; margin-left: 60px; flex-shrink: 0;
        .album-sticky-header {
            position: sticky; left: 0; z-index: 10; height: 100%; display: flex; align-items: center;
            .album-label {
                background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); padding: 25px 12px; border-radius: 2px;
                box-shadow: 4px 4px 20px rgba(0,0,0,0.08); writing-mode: vertical-lr; display: flex; flex-direction: row-reverse; 
                align-items: center; gap: 12px; border-left: 5px solid $accentColor;
                .name { font-weight: bold; font-size: 22px; color: #222; }
                .date { font-size: 11px; color: #aaa; }
            }
        }

        .photo-list {
            display: flex; gap: 45px; padding: 0 45px;
            .photo-card {
                background: #fff; padding: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                width: 420px; height: 100%; display: flex; flex-direction: column; flex-shrink: 0;
                &:nth-child(odd) { transform: rotate(1deg); }
                &:nth-child(even) { transform: rotate(-1deg); }
                
                .img-box { flex: 1; overflow: hidden; position: relative; img { width: 100%; height: 100%; object-fit: cover; } }
                
                /* ✨ EXIF 样式优化 */
                .exif-details {
                    padding-top: 12px; border-top: 1px dashed #eee; margin-top: 10px;
                    .exif-row { display: flex; align-items: center; gap: 6px; color: #444; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
                    .exif-params {
                        display: flex; justify-content: space-between; align-items: center;
                        .param-item {
                            display: flex; align-items: center; gap: 4px; font-size: 11px; color: #777;
                            .label { color: #bbb; margin-right: 2px; }
                            b { color: #555; }
                        }
                    }
                    .icon { width: 14px; height: 14px; fill: #bbb; }
                }
                .video-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 40px; color: rgba(255,255,255,0.8); }
            }
        }
    }

    .site-footer {
        flex-shrink: 0; padding: 15px 0; background: rgba(255,255,255,0.05); backdrop-filter: blur(5px);
        text-align: center; color: #999; font-size: 11px; display: flex; justify-content: center; gap: 30px;
        .icp { text-decoration: none; color: inherit; &:hover { color: $accentColor; } }
    }

    @media (max-width: 768px) {
        .content-scroll-area {
            overflow-y: auto; overflow-x: hidden;
            .content-inner { flex-direction: column; height: auto; padding: 0 15px 60px; }
        }
        .album-wrapper {
            flex-direction: column; height: auto; margin-left: 0; margin-bottom: 40px; width: 100%;
            .album-sticky-header {
                position: sticky; top: 0; width: calc(100% + 30px); margin-left: -15px; z-index: 150;
                .album-label { writing-mode: horizontal-tb; flex-direction: row; justify-content: space-between; border-left: none; border-bottom: 4px solid $accentColor; padding: 12px 20px; border-radius: 0; }
            }
            .photo-list {
                flex-direction: column; padding: 15px 0 0 0; gap: 20px; width: 100%;
                .photo-card { width: 100% !important; aspect-ratio: auto; height: auto; transform: none !important; margin: 0; .img-box { aspect-ratio: 3/2; } }
            }
        }
        .site-header { padding: 20px 0; .site-title { font-size: 26px; } }
        .site-footer {
            font-size: 8px;
        }
    }
}
.detail-container {
    width: 100vw;
    height: 100vh;
    background-color: rgba($color: #000000, $alpha: .5);
    position: fixed;
    left: 0;
    top: 0;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .detail-inner-container {
        width: 80%;
        height: 80%;
        background: #fff; padding: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        display: flex; flex-direction: column; flex-shrink: 0;
        transition: ease-in-out .2s transform;

        .close-btn {
            position: absolute;
            top: -40px;
            right: 0px;
            width: 40px;
            height: 40px;
            &:hover {
                animation: rotate 1s;
            }
        }
        .detail-item {
            width: 100%;
            height: auto;
            flex-grow: 1;
            background-color: #efeff5;
            overflow: hidden;

            .detail-image, .detail-video {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .detail-image {}
            .detail-video {}
        }
        .exif-params {
            display: flex; justify-content: space-between; align-items: center;
            .param-item {
                display: flex; align-items: center; gap: 4px; font-size: 11px; color: #777;
                .label { color: #bbb; margin-right: 2px; }
                b { color: #555; }
            }
        }

        @media (max-width: 768px) {
            height: 50%;
        }
    }

    &.show {
        transform: scale(1);
        .detail-inner-container {
            transform: rotateY(0deg);
        }
    }
    &.hide {
        transform: scale(0);
        .detail-inner-container {
            transform: rotateY(90deg);
        }
    }
}
</style>