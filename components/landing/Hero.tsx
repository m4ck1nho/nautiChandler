'use client';

import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Hero({ onSearch, initialQuery = '' }: HeroProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    },
    [searchQuery, onSearch]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <section className="relative h-screen bg-white overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] h-full">
        {/* Left Column - Content */}
        <div className="flex flex-col justify-center items-start px-4 sm:px-8 lg:px-16 py-8 pt-20 sm:pt-32 lg:py-0 z-10">


          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold text-black tracking-tight leading-[1.1] mb-4 sm:mb-6"
          >
            Sail anywhere.
            <br />
            We&apos;ll meet you there.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-zinc-500 font-medium mt-4 sm:mt-6 mb-6 sm:mb-8"
          >
            Find what you need
          </motion.p>

          {/* Search Component */}
          <motion.form
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleSubmit}
            className="w-full max-w-xl bg-white border-2 border-zinc-100 shadow-xl rounded-xl overflow-hidden"
          >
            <div className="flex items-center">
              {/* Search Input */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 px-3 sm:px-5 py-3 sm:py-4">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="What do you need?"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="flex-1 bg-transparent outline-none text-black placeholder:text-zinc-400 text-sm sm:text-base min-w-0"
                />
              </div>

              {/* Search Button - Icon on mobile, text on desktop */}
              <button
                type="submit"
                className="bg-black text-white px-4 sm:px-8 py-3 sm:py-4 font-medium text-sm sm:text-base hover:bg-zinc-800 transition-colors flex-shrink-0 h-full flex items-center justify-center"
              >
                <Search className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </motion.form>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center gap-3 mt-8"
          >
            <span className="text-zinc-400 text-sm">Popular:</span>
            {['Anchors', 'Ropes', 'Safety', 'Electronics'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSearchQuery(item.toLowerCase());
                  onSearch(item.toLowerCase());
                }}
                className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-600 text-sm hover:bg-zinc-200 hover:text-zinc-800 transition-colors"
              >
                {item}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Right Column - Image */}
        <div className="relative hidden lg:block h-screen">
          {/* Main Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sideImage.jpg"
            alt="Yacht provisioning service"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Gradient Overlay - blends image into white left side */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/50 to-transparent" />
        </div>
      </div>

      {/* Mobile Image (shown below content on small screens) */}
      <div className="relative h-[40vh] lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sideImage.jpg"
          alt="Yacht provisioning service"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Top gradient for mobile */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
      </div>
    </section>
  );
}
