'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, User, Search, X } from 'lucide-react';
import { CategoryDrawer } from './CategoryDrawer';
import { Input } from '@/components/ui/input';
import { getSupabase } from '@/lib/supabase';

interface NavbarProps {
  onCategorySelect?: (categoryId: string, categoryUrl?: string, categoryName?: string) => void;
}

export function Navbar({ onCategorySelect }: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

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

  const handleSearchClear = () => {
    setSearchQuery('');
    router.push('/search');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">
            {/* Left: Logo */}
            <a href="/" className="flex items-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yachtLogo.png"
                alt="Yachtdrop"
                className="h-8 w-auto object-contain"
              />
            </a>

            {/* Hamburger Menu */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-full transition-colors hover:bg-zinc-100 text-black flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
            </button>

            {/* Center: Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10 rounded-md bg-white border-zinc-200 text-black placeholder:text-zinc-400 focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                )}
              </div>
            </form>

            {/* Right: Auth Buttons */}
            <div className="flex items-center gap-4 flex-shrink-0 ml-auto pr-4">
              {!isLoadingAuth && (
                <>
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
    </>
  );
}
