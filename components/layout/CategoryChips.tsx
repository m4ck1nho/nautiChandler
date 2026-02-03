'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface Category {
  id: string;
  name: string;
  link: string;
}

interface CategoryChipsProps {
  onCategorySelect: (categoryId: string, categoryUrl?: string, categoryName?: string) => void;
  selectedCategory?: string;
}

const fallbackCategories: Category[] = [
  { id: 'featured', name: 'All', link: '/en/' },
  { id: 'anchors', name: 'Anchors', link: '/en/100810-anchors' },
  { id: 'ropes', name: 'Ropes', link: '/en/101100-ropes' },
  { id: 'safety', name: 'Safety', link: '/en/101050-safety' },
  { id: 'maintenance', name: 'Maintenance', link: '/en/101000-maintenance' },
  { id: 'electronics', name: 'Electronics', link: '/en/100950-electronics' },
];

export function CategoryChips({ onCategorySelect, selectedCategory = 'featured' }: CategoryChipsProps) {
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [selected, setSelected] = useState(selectedCategory);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
          const cleanCategories = data.categories.slice(0, 10).map((c: Category & { emoji?: string }) => ({
            ...c,
            name: c.id === 'featured' ? 'All' : c.name,
          }));
          setCategories(cleanCategories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    setSelected(selectedCategory);
  }, [selectedCategory]);

  const handleSelect = (category: Category) => {
    setSelected(category.id);
    onCategorySelect(category.id, category.link, category.name);
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 px-4 py-4 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-20 rounded-full bg-zinc-100 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-4 no-scrollbar">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          onClick={() => handleSelect(category)}
          whileTap={{ scale: 0.97 }}
          className={`
            px-4 py-2 rounded-full text-sm font-medium
            whitespace-nowrap transition-all duration-150 flex-shrink-0 border
            ${
              selected === category.id
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
            }
          `}
        >
          {category.name}
        </motion.button>
      ))}
    </div>
  );
}
