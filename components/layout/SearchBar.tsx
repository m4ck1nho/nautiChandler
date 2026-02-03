'use client';

import { useState, useCallback } from 'react';
import { Search, X, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CategoryChips } from './CategoryChips';
import { CategoryDrawer } from './CategoryDrawer';

interface SearchBarProps {
  onSearch: (query: string, categoryUrl?: string) => void;
  initialQuery?: string;
}

export function SearchBar({ onSearch, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('featured');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(query);
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleCategorySelect = useCallback(
    (categoryId: string, categoryUrl?: string) => {
      setSelectedCategory(categoryId || 'featured');
      if (!categoryId || categoryId === 'featured') {
        setQuery('');
        onSearch('', undefined);
      } else {
        setQuery(categoryId);
        onSearch(categoryId, categoryUrl);
      }
    },
    [onSearch]
  );

  return (
    <>
      <div className="sticky top-0 z-50 bg-white border-b border-zinc-200">
        {/* Header */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu - Black */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 rounded-md hover:bg-zinc-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-black" strokeWidth={2} />
            </button>

            {/* Logo */}
            <div className="flex-1">
              <h1 className="text-lg font-bold text-black tracking-tight">Yachtdrop</h1>
            </div>

            {/* Badge */}
            <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full font-medium uppercase tracking-wide">
              Live
            </span>
          </div>

          {/* Search Input - White with zinc border */}
          <form onSubmit={handleSubmit} className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-10 rounded-md bg-white border-zinc-200 text-black placeholder:text-zinc-400 focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            )}
          </form>
        </div>

        {/* Category Chips */}
        <CategoryChips
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Category Drawer */}
      <CategoryDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectCategory={handleCategorySelect}
        selectedCategory={selectedCategory}
      />
    </>
  );
}
