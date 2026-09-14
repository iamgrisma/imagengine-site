# ImageEngine Marketing & Documentation Portal

Official static website, developer documentation, and drop-in integration client for **ImageEngine Edge CDN**.

* **Live Site**: [https://imagengine.grisma.info.np](https://imagengine.grisma.info.np)
* **Primary Edge CDN**: [https://img.grisma.info.np](https://img.grisma.info.np)
* **TopNepali Ecosystem CDN**: [https://img.topnepali.com](https://img.topnepali.com)

---

## Cloudflare Pages Deployment Configuration

* **Framework Preset**: None (Plain HTML)
* **Build Command**: *(leave empty)*
* **Build Output Directory**: `/` (or `.` / root)
* **Production Branch**: `main`
* **Custom Domain**: `imagengine.grisma.info.np`

---

## Key Benefits of Decoupled Architecture

1. **Independent Caching**: Purging cache or updating marketing copy on `imagengine.grisma.info.np` never purges image assets on `img.grisma.info.np` or `img.topnepali.com`.
2. **Zero Serverless Load**: 100% of website visits are served statically from Cloudflare's Edge, preserving 100% of Vercel invocation allowances exclusively for real image encoding.
3. **Fail-Safe Client**: The included `engine.js` features intelligent origin fallback and automatic DPR detection.
