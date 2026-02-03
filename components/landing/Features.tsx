'use client';

import { Monitor, Lock, Globe, ShoppingBag } from 'lucide-react';

export function Features() {
    const features = [
        {
            icon: Monitor, // Using Monitor as proxy for "Grid/Computer"
            title: '+450 BRANDS',
            description: 'Wide selection of products',
        },
        {
            icon: Lock,
            title: 'SECURE PAYMENT',
            description: 'Card, PayPal, or bank transfer',
        },
        {
            icon: Globe,
            title: 'INTERNATIONAL SHIPPING',
            description: 'Worldwide delivery',
        },
        {
            icon: ShoppingBag,
            title: 'CLICK & COLLECT',
            description: 'Buy online, collect in-store',
        },
    ];

    return (
        <section className="bg-zinc-50 py-16 border-b border-zinc-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-white rounded-2xl shadow-sm">
                                <feature.icon className="w-8 h-8 text-black" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-sm font-bold text-black uppercase tracking-wide mb-1">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-zinc-500">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
