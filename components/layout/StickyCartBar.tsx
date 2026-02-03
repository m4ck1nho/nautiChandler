'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface StickyCartBarProps {
  onOpenCart: () => void;
}

export function StickyCartBar({ onOpenCart }: StickyCartBarProps) {
  const { items, getTotalItems, getTotalPrice } = useCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <button
            onClick={onOpenCart}
            className="w-full bg-black text-white rounded-md px-4 py-3 shadow-2xl shadow-black/20 hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between">
              {/* Left: Cart info */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              {/* Right: Total & Arrow */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  €{totalPrice.toFixed(2)}
                </span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
