'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, User, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { CategoryDrawer } from './CategoryDrawer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { getSupabase } from '@/lib/supabase';

interface NavbarProps {
  onCategorySelect?: (categoryId: string, categoryUrl?: string, categoryName?: string) => void;
}

export function Navbar({ onCategorySelect }: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  /* Safe pathname check */
  /* Safe pathname check - keeping variable if needed for future or removing if truly unused. Lint said unused. Removing. */
  // const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  /* Fallback for Auth Loading */
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingAuth(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          setIsLoggedIn(!!user);
        } catch (error) {
          console.error('Auth check error:', error);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
      setIsLoadingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabase();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session?.user);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Sync search query with URL params
  useEffect(() => {
    const query = searchParams.get('search') || '';
    setSearchQuery(query);
  }, [searchParams]);

  const handleCategorySelect = (categoryId: string, categoryUrl?: string, categoryName?: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId, categoryUrl, categoryName);
    } else if (categoryName) {
      // Navigate to search with category filter
      router.push(`/search?category=${encodeURIComponent(categoryName)}`);
    } else if (categoryId) {
      router.push(`/search?category=${encodeURIComponent(categoryId)}`);
    }
    setIsDrawerOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };



  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${isScrolled
            ? 'bg-white border-b border-zinc-200 shadow-sm'
            : 'bg-white border-b border-zinc-200'
          }
        `}
      >
        <div className="w-full px-3 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-24">

            {/* Left: Hamburger Menu (First) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-full transition-colors hover:bg-zinc-100 text-black flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
            </button>

            {/* Left: Logo (Second, Linked) */}
            <div className="flex-shrink-0">
              <Link href="/" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/yachtDropLogo.png"
                  alt="Yachtdrop"
                  className="h-10 sm:h-20 w-auto object-contain"
                />
              </Link>
            </div>

            <div className="flex-1" /> {/* Spacer to push Cart to right */}

            {/* Right: Cart & Auth */}
            <div className="flex items-center gap-4 flex-shrink-0 ml-auto pr-4">

              {/* Cart Icon (Added) */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5 text-black" />
                {/* Optional badge can go here */}
              </button>

              {/* Auth Buttons */}
              {isLoggedIn ? (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors bg-zinc-100 text-black hover:bg-zinc-200 whitespace-nowrap"
                  aria-label="Profile"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors bg-zinc-100 text-black hover:bg-zinc-200 whitespace-nowrap"
                    aria-label="Log in"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </button>
                  <button
                    className="hidden sm:inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors bg-black text-white hover:bg-zinc-800 whitespace-nowrap"
                    aria-label="Sign up"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Category Drawer */}
      <CategoryDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectCategory={handleCategorySelect}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </>
  );
}
