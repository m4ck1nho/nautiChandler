'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, Truck, Store, Package } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { useCartStore, OrderType } from '@/store/cartStore';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DELIVERY_FEE = 5.0;
const FREE_DELIVERY_THRESHOLD = 50.0;

// Grayscale placeholder
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f4f4f5' width='100' height='100'/%3E%3Crect fill='%23e4e4e7' x='25' y='25' width='50' height='50' rx='4'/%3E%3C/svg%3E";

function getProxiedImageUrl(url: string | undefined): string {
  if (!url) return PLACEHOLDER_IMAGE;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  if (url.includes('nautichandler.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    items,
    orderType,
    setOrderType,
    removeItem,
    updateQuantity,
    getTotalPrice,
    clearCart,
  } = useCartStore();

  const subtotal = getTotalPrice();
  const deliveryFee = orderType === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD 
    ? DELIVERY_FEE 
    : 0;
  const total = subtotal + deliveryFee;

  const handleQuantityChange = (id: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQty);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh] bg-white">
        {/* Header - Black */}
        <DrawerHeader className="border-b border-zinc-200 p-4 bg-black text-white">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold text-white">Cart</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </DrawerClose>
          </div>

          {/* Delivery Toggle */}
          <div className="flex gap-2 mt-4">
            <OrderTypeButton
              type="delivery"
              currentType={orderType}
              onClick={() => setOrderType('delivery')}
              icon={<Truck className="w-3.5 h-3.5" />}
              label="Delivery"
            />
            <OrderTypeButton
              type="pickup"
              currentType={orderType}
              onClick={() => setOrderType('pickup')}
              icon={<Store className="w-3.5 h-3.5" />}
              label="Pickup"
            />
          </div>
        </DrawerHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50">
          {items.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-zinc-200"
                  >
                    <img
                      src={getProxiedImageUrl(item.image)}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-12 h-12 rounded-md object-cover bg-zinc-100 border border-zinc-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs line-clamp-2 text-black">
                        {item.title}
                      </h4>
                      <p className="text-black font-bold text-sm mt-0.5">
                        {item.price}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                        className="w-7 h-7 rounded-md border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 transition-colors"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3 h-3 text-black" />
                        ) : (
                          <Minus className="w-3 h-3 text-black" />
                        )}
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-black">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                        className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-xs text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-md transition-colors"
                >
                  Clear cart
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <DrawerFooter className="border-t border-zinc-200 p-4 bg-white">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-medium text-black">€{subtotal.toFixed(2)}</span>
              </div>
              
              {orderType === 'delivery' && (
                <div className="flex justify-between text-zinc-500">
                  <span>Delivery</span>
                  <span className="font-medium text-black">
                    {deliveryFee === 0 ? 'Free' : `€${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}

              {orderType === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="bg-zinc-100 p-2.5 rounded-md">
                  <p className="text-xs text-zinc-600">
                    Add €{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} for free delivery
                  </p>
                </div>
              )}

              <div className="flex justify-between font-bold text-base pt-2 border-t border-zinc-200">
                <span>Total</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="w-full h-10 rounded-md bg-black text-white text-sm font-medium hover:bg-zinc-800 transition-colors mt-3"
              onClick={() => alert('Checkout coming soon!')}
            >
              Checkout
            </button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface OrderTypeButtonProps {
  type: OrderType;
  currentType: OrderType;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function OrderTypeButton({ type, currentType, onClick, icon, label }: OrderTypeButtonProps) {
  const isActive = type === currentType;
  
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 h-9 rounded-md
        text-sm font-medium transition-all duration-150
        ${isActive 
          ? 'bg-white text-black' 
          : 'bg-transparent text-white/70 hover:text-white border border-white/20'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
        <Package className="w-6 h-6 text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-black mb-1">
        Cart is empty
      </h3>
      <p className="text-xs text-zinc-500">
        Add items to get started
      </p>
    </div>
  );
}
