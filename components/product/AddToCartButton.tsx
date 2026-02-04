'use client';

import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/lib/types';

interface AddToCartButtonProps {
    product: Product;
    variant?: 'default' | 'circle';
}

export default function AddToCartButton({ product, variant = 'default' }: AddToCartButtonProps) {
    const { addItem } = useCartStore();
    const [justAdded, setJustAdded] = useState(false);

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        addItem({
            title: product.title,
            price: product.price,
            image: product.image || '',
            link: product.link,
        });

        // Show success feedback
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
    };

    // Circle variant - small round button with plus icon (shows checkmark when added)
    if (variant === 'circle') {
        return (
            <button
                onClick={handleAdd}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 shadow-lg ${justAdded
                        ? 'bg-green-500 text-white'
                        : 'bg-black text-white hover:bg-zinc-800'
                    }`}
                title={justAdded ? 'Added!' : 'Add to basket'}
            >
                {justAdded ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <Plus className="w-4 h-4" />
                )}
            </button>
        );
    }

    // Default variant - full button with text
    return (
        <button
            onClick={handleAdd}
            className={`flex items-center justify-center gap-1.5 w-full px-4 py-2 text-sm font-medium rounded-full transition-all active:scale-95 ${justAdded
                    ? 'bg-green-500 text-white'
                    : 'bg-black text-white hover:bg-zinc-800'
                }`}
        >
            {justAdded ? (
                <>
                    <Check className="w-4 h-4" />
                    Added!
                </>
            ) : (
                <>
                    <Plus className="w-4 h-4" />
                    Add to Basket
                </>
            )}
        </button>
    );
}
