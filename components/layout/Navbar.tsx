'use client';

import { User as SupabaseUser } from '@supabase/supabase-js';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Menu, User, ShoppingBag, LogOut, ChevronDown, Search, Heart, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const pathname = usePathname();
  /* Safe pathname check */
  /* Safe pathname check - keeping variable if needed for future or removing if truly unused. Lint said unused. Removing. */
  // const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
          setUser(user);
        } catch (error) {
          console.error('Auth check error:', error);
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setIsLoadingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabase();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session?.user);
        setUser(session?.user || null);
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
                <div className="relative z-[51]">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full text-sm font-medium transition-all bg-zinc-100 text-black hover:bg-zinc-200 whitespace-nowrap border border-zinc-200 shadow-sm active:scale-95"
                    aria-label="User menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center overflow-hidden">
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="hidden sm:inline-block max-w-[100px] truncate">
                      {/* @ts-ignore - metadata is dynamic */}
                      {user?.user_metadata?.full_name?.split(' ')[0] || 'Member'}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                        >
                          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1 px-2">Account</p>
                            <div className="flex items-center gap-3 px-2 py-1">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center overflow-hidden">
                                {user?.user_metadata?.avatar_url ? (
                                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                  {/* @ts-ignore - metadata is dynamic */}
                                  {user?.user_metadata?.full_name || 'Yachtdrop Member'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                              </div>
                            </div>
                          </div>

                          <div className="p-1.5">
                            <button
                              onClick={async () => {
                                setIsUserMenuOpen(false);
                                const { signOut } = await import('@/lib/auth-helpers');
                                await signOut();
                                router.refresh();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors text-left"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors bg-zinc-100 text-black hover:bg-zinc-200 whitespace-nowrap"
                    aria-label="Log in"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-[13px] sm:text-sm font-medium transition-colors bg-black text-white hover:bg-zinc-800 whitespace-nowrap"
                    aria-label="Sign up"
                  >
                    Sign up
                  </Link>
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-zinc-200 pb-safe md:hidden">
        <div className="flex items-center justify-around h-16 px-2">

          {/* 1. Categories (Search Icon) */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-black active:text-black transition-colors"
          >
            <Search className="w-6 h-6" strokeWidth={isDrawerOpen ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Categories</span>
          </button>

          {/* 2. Favorites */}
          <Link
            href="/favorites"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/favorites' ? 'text-black' : 'text-zinc-500 hover:text-black'
              }`}
          >
            <Heart className="w-6 h-6" strokeWidth={pathname === '/favorites' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Favorites</span>
          </Link>

          {/* 3. Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/' ? 'text-black' : 'text-zinc-500 hover:text-black'
              }`}
          >
            <Home className="w-6 h-6" strokeWidth={pathname === '/' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* 4. Profile / Login */}
          <Link
            href={isLoggedIn ? "/account" : "/login"}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname?.startsWith('/account') || pathname === '/login' ? 'text-black' : 'text-zinc-500 hover:text-black'
              }`}
          >
            <User className="w-6 h-6" strokeWidth={(pathname?.startsWith('/account') || pathname === '/login') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>

          {/* 5. Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-zinc-500 hover:text-black active:text-black transition-colors relative"
          >
            <ShoppingBag className="w-6 h-6" strokeWidth={isCartOpen ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Cart</span>
          </button>

        </div>
      </nav>
    </>
  );
}
