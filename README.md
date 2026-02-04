# Yachtdrop Online Chandlery

Yachtdrop is a premium e-commerce platform tailored for yacht crews, providing a seamless way to browse and purchase marine supplies. Built with a mobile-first approach, it offers a high-performance, app-like experience for finding everything from anchoring gear to safety equipment.

![Yachtdrop Preview](/yachtdrop-preview.png)

## ⚓ Key Features

- **Advanced Search & Discovery**:
  - Real-time filtering by Category, Price Range, Color, Size, Brand, and Material.
  - Smart category mapping for intuitive navigation.
  - Sorting by Price (Low/High), Name, and Featured items.
- **Dynamic Product Experience**:
  - Interactive product cards with hover-activated "Add to Basket" buttons (Desktop).
  - Tap-optimized interaction with persistent cart buttons on Mobile.
  - Visual feedback with animations when adding items to the cart.
- **Seamless Cart Management**:
  - Side-drawer cart for quick access.
  - Support for both Delivery and Pickup order types.
  - Real-time subtotal and total calculations.
- **Premium Design Shell**:
  - Minimalist, zinc-based design language.
  - Smooth transitions and micro-animations using Framer Motion.
  - Fully responsive layout optimized for all device sizes.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Cart & UI state)
- **Backend Data**: Static JSON database for high performance and reliability.
- **Deployment**: [Vercel](https://vercel.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/m4ck1nho/nautiChandler.git
   cd nautiChandler/yachtdrop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable UI components (Cart, Layout, Product, Search, etc.).
- `hooks/`: Custom React hooks for search and data fetching.
- `lib/`: Utility functions and type definitions.
- `public/`: Static assets and the product database (`products.json`).
- `store/`: Zustand state stores for cart and application state.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Designed for Yacht Crews by Yachtdrop.*
