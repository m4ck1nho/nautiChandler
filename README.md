# Yachtdrop Online Chandlery

Yachtdrop is a premium, high-performance e-commerce platform specifically engineered for yacht crews. It provides a seamless, app-like experience for browsing and purchasing marine supplies, bridging the gap between traditional chandleries and modern on-demand delivery services.

**🌐 Live Demo**: [nautichandler-production.up.railway.app](https://nautichandler-production.up.railway.app/)

---

## 📸 Preview

![Yachtdrop Interface](file:///c:/Users/gkdnz/OneDrive/Belgeler/ProjectsAI/nautiChandler/yachtdrop/public/yachtDropLogo.png)

> [!NOTE]
> The platform is built with a **Mobile-First** philosophy, ensuring that yacht crews can quickly find and order supplies directly from their mobile devices while on the move or working on deck.

---

## ⚓ Key Features

### Smart Search & Discovery
- **Real-time Filtering**: Narrow down thousands of products by category, price range, color, size, brand, and material.
- **Intelligent Category Mapping**: Structured navigation that mimics the organizational flow of a physical chandlery.
- **Advanced Sorting**: Sort by price, name, or featured status to find exactly what you need.

### Optimized Shopping Experience
- **Interactive UI**: Desktop users enjoy hover-activated "Add to Basket" functionality, while mobile users benefit from a tap-optimized, persistent interaction model.
- **Smooth Transitions**: Powered by Framer Motion, every interaction—from opening the side-drawer cart to adding items—is fluid and responsive.
- **Order Flexibility**: Supports both "Delivery" and "Pickup" order types with real-time subtotal and total calculations.

---

## 🛠 Technical Stack

### Core Framework & UI
- **Framework**: [Next.js](https://nextjs.org/) (App Router) - Leveraging server components for performance and SEO.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) - Utilizing the latest utility-first CSS features for a custom zinc-based design system.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) - Ensuring a premium, "app-like" feel through micro-animations.
- **Icons**: [Lucide React](https://lucide.dev/) - A consistent and clean iconography set.

### State & Data Management
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) - Minimalist state management for the shopping cart and UI transitions.
- **Backend/Auth**: [Supabase](https://supabase.com/) - Handling user authentication and persistent data storage.
- **Networking**: [Axios](https://axios-http.com/) - Robust HTTP client for API interactions.

### Scraping & Data Pipeline
- **Automation**: [Puppeteer](https://pptr.dev/) & [Puppeteer-Extra](https://github.com/berstend/puppeteer-extra) - Advanced scraping engine used to aggregate real-time product data from nautichandler.com.
- **Stealth Integration**: Uses the `puppeteer-extra-plugin-stealth` to ensure reliable data extraction from complex web environments.
- **Parsing**: [Cheerio](https://cheerio.js.org/) and [Playwright](https://playwright.dev/) are also integrated into the pipeline for specialized scraping tasks and document parsing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm, yarn, or pnpm

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
To refresh the product database using the Puppeteer-based scraper:
```bash
npm run scrape
```

---

## 📄 License

This project is licensed under the MIT License.

---
*Developed for the high seas by the Yachtdrop Team.*
