# Yachtdrop - Marine Nano Tech Hackathon Project

Yachtdrop is a technical prototype developed for the **Marine Nano Tech Hackathon**. It is a specialized e-commerce interface designed to aggregate and present marine supply data from external sources like nautichandler.com into a modern, mobile-responsive dashboard.

**🌐 Live Prototype**: [nautichandler-production.up.railway.app](https://nautichandler-production.up.railway.app/)

---

## 📸 Project Overview

![Yachtdrop Interface](file:///c:/Users/gkdnz/OneDrive/Belgeler/ProjectsAI/nautiChandler/yachtdrop/public/yachtDropLogo.png)

This project explores the technical feasibility of real-time data scraping and presentation in the marine logistics space. The goal was to build a functional, responsive shopping interface that leverages a robust data pipeline to serve live product information.

---

## ⚓ Technical Features

### Data & Search
- **Dynamic Scraped Data**: Utilizes a Puppeteer-based pipeline to ingest product data from existing providers.
- **Filtering System**: Implements category-based filtering, price range adjustments, and brand sorting.
- **Search Architecture**: Optimized search hooks for querying both product titles and categories.

### Interface & Experience
- **Mobile-First Prototype**: Designed specifically for touch interactions and small-screen utility.
- **State Management**: Uses Zustand for minimal, reactive cart and UI state handling.
- **Animation Layer**: Subtle feedback provided via Framer Motion for better user interaction cues.

---

## 🛠 Technical Stack

### Core Technologies
- **Frontend**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database/Auth**: [Supabase](https://supabase.com/)

### Data Pipeline (Scraping)
- **Scraper Engine**: [Puppeteer](https://pptr.dev/) with `puppeteer-extra-plugin-stealth` for reliable data extraction.
- **Parsing Utilities**: [Cheerio](https://cheerio.js.org/) for DOM parsing and [Axios](https://axios-http.com/) for network requests.
- **Automation**: Custom scripts to trigger full-catalog or single-page scrapes to maintain data freshness.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/m4ck1nho/nautiChandler.git
   cd nautiChandler/yachtdrop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

### Scraping Data
To refresh the data from the source:
```bash
npm run scrape
```

---

## 📄 License

This project is licensed under the MIT License.

---
*Built for the Marine Nano Tech Hackathon.*
