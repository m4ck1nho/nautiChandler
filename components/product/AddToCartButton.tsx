'use client';

import { Plus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button'; // Assuming we have or will treat as inline

export default function AddToCartButton({ product }: { product: Product }) {
    const { addItem } = useCartStore();

    const handleAdd = () => {
        addItem({
            title: product.title,
            price: product.price,
            image: product.image || '',
            link: product.link,
        });
    };

    return (
        <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-black text-white text-lg font-bold rounded-full hover:bg-zinc-800 transition-colors active:scale-95"
        >
            <Plus className="w-5 h-5" />
            Add to Basket
        </button>
    );
}
