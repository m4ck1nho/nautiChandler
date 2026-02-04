import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Cart item interface
export interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  link?: string | null;
  quantity: number;
}

// Order type for delivery toggle
export type OrderType = 'delivery' | 'pickup';

// Cart store state interface
interface CartState {
  items: CartItem[];
  orderType: OrderType;
  isInitialized: boolean;

  // Actions
  initializeCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity' | 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;

  // Computed helpers
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

// Generate unique ID for cart items
const generateId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Parse price string to number (handles "€12.99" format)
const parsePrice = (priceStr: string): number => {
  const cleaned = priceStr.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'delivery',
      isInitialized: false,

      // Initialize cart (mark as ready)
      initializeCart: () => {
        set({ isInitialized: true });
      },

      // Add item to cart
      addItem: (item) => {
        const { items } = get();

        // Check if item already exists (match by title + price)
        const existingIndex = items.findIndex(
          (i) => i.title === item.title && i.price === item.price
        );

        if (existingIndex !== -1) {
          // Update quantity of existing item
          set((state) => ({
            items: state.items.map((i, idx) =>
              idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
            ),
          }));
        } else {
          // Add new item
          const newItem: CartItem = {
            ...item,
            id: generateId(),
            quantity: 1,
          };

          set((state) => ({
            items: [...state.items, newItem],
          }));
        }
      },

      // Remove item from cart
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      // Update item quantity
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
      },

      // Clear entire cart
      clearCart: () => {
        set({ items: [] });
      },

      // Set order type (delivery or pickup)
      setOrderType: (type) => {
        set({ orderType: type });
      },

      // Get total number of items in cart
      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      // Get total price of cart
      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          const price = parsePrice(item.price);
          return total + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'yachtdrop-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
      }),
    }
  )
);

// Hook to initialize cart on mount
export const useInitializeCart = () => {
  const { initializeCart, isInitialized } = useCartStore();

  if (typeof window !== 'undefined' && !isInitialized) {
    initializeCart();
  }
};
