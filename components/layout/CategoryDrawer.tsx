'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

interface Category {
  id: string;
  name: string;
  link: string;
}

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string, categoryUrl?: string, categoryName?: string) => void;
  selectedCategory?: string;
}

export function CategoryDrawer({ 
  open, 
  onClose, 
  onSelectCategory,
  selectedCategory = 'featured' 
}: CategoryDrawerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
          // Clean up category names
          const cleanCategories = data.categories.map((c: Category & { emoji?: string }) => ({
            id: c.id,
            name: c.id === 'featured' ? 'All Products' : c.name,
            link: c.link,
          }));
          setCategories(cleanCategories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (open && categories.length === 0) {
      fetchCategories();
    }
  }, [open, categories.length]);

  const handleSelect = (category: Category) => {
    if (category.id === 'featured') {
      onSelectCategory('', undefined, undefined);
    } else {
      onSelectCategory(category.id, category.link, category.name);
    }
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="left">
      <DrawerContent className="h-full w-[85%] max-w-sm left-0 right-auto rounded-none">
        {/* Header - Black */}
        <DrawerHeader className="border-b border-zinc-200 bg-black text-white p-0">
          <div className="flex items-center justify-between p-4">
            <DrawerTitle className="text-lg font-bold text-white">Categories</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Categories List - Clean Black & White */}
        <div className="flex-1 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="p-4 space-y-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-12 bg-zinc-50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div>
              <AnimatePresence>
                {categories.map((category, index) => (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleSelect(category)}
                    className={`
                      w-full flex items-center justify-between px-4 py-4
                      border-b border-zinc-100 transition-colors text-left
                      ${selectedCategory === category.id 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black hover:bg-zinc-50'
                      }
                    `}
                  >
                    <span className="text-sm font-medium">
                      {category.name}
                    </span>
                    <ChevronRight className={`
                      w-4 h-4
                      ${selectedCategory === category.id ? 'text-white' : 'text-zinc-400'}
                    `} />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-4 bg-zinc-50">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
            Data from nautichandler.com
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
