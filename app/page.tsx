'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { BrandLogos } from '@/components/landing/BrandLogos';
import { Footer } from '@/components/layout/Footer';
import { StickyCartBar } from '@/components/layout/StickyCartBar';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useCartStore } from '@/store/cartStore';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const initialQuery = searchParams.get('search') || '';

  const { initializeCart, isInitialized } = useCartStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeCart();
    }
  }, [initializeCart, isInitialized]);

  // Handle search from Hero Command Bar: redirect to /search page
  const handleHeroSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Fixed Navbar */}
      <Navbar />

      {/* Hero Section with central search bar */}
      <Hero onSearch={handleHeroSearch} initialQuery={initialQuery} />

      {/* Features / Slogans */}
      <Features />

      {/* Brand Logos */}
      <BrandLogos />

      {/* Footer */}
      <Footer />

      {/* Sticky Cart Bar */}
      <StickyCartBar onOpenCart={() => setIsCartOpen(true)} />

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Navbar Skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 rounded-full bg-white/10 animate-pulse" />
              <div className="h-9 w-20 rounded-full bg-white animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Skeleton */}
      <div className="min-h-[85vh] bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
        <div className="text-center px-4">
          <div className="h-4 w-48 bg-white/10 rounded-full mx-auto mb-8 animate-pulse" />
          <div className="h-12 w-80 bg-white/10 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-64 bg-white/10 rounded mx-auto mb-10 animate-pulse" />
          <div className="h-16 w-full max-w-2xl bg-white rounded-2xl mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}
