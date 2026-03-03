# Yachtdrop ⚓
### Advanced Marine Supply Aggregator (Serverless Edition)

![Yachtdrop Demo Placeholder](https://via.placeholder.com/1600x900.png?text=Yachtdrop+Architecture+&+Interface+Demo)

Yachtdrop is a technical prototype developed for the **Marine Nano Tech Hackathon**. It is a specialized e-commerce interface and automated data pipeline designed to aggregate marine supply data into a modern, mobile-responsive dashboard.

Originally built as a Dockerized Node.js application, this version has been migrated to a **Serverless Architecture** using Cloudflare Workers and the Browser Rendering API for maximum scalability and performance.

---

## ⚓ Technical Architecture

- **Serverless Compute**: [Cloudflare Workers](https://workers.cloudflare.com/) (ES Modules)
- **Dynamic Scraping**: [Cloudflare Browser Rendering API](https://developers.cloudflare.com/browser-rendering/) (Puppeteer-based)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL & Row Level Security)
- **Frontend**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🚀 Key Features

- **Automated Data Pipeline**: Real-time product ingestion from marine suppliers via headless browser automation.
- **Serverless Scaling**: Scraper runs on the edge, triggered via HTTP or CRON jobs.
- **Mobile-First UX**: Optimized for touch interactions and on-the-go utility for yacht crews.
- **Real-time Sync**: Direct integration with Supabase for instant data availability across the dashboard.

---

## 🛠 Local Setup & Deployment

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Supabase Account & Project

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/m4ck1nho/nautiChandler.git
   cd nautiChandler
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.dev.vars` file for local development:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```
4. Run locally:
   ```bash
   npx wrangler dev
   ```

### Deployment
Deploy to Cloudflare Workers with a single command:
```bash
npx wrangler deploy
```

---

## 🤖 Development & Tools

This project utilizes advanced AI tools for development, including refactoring legacy Node.js code into modern ES modules, implementing serverless migration patterns, and optimizing frontend components for mobile-first utility.

---
*Built for the Marine Nano Tech Hackathon.*
