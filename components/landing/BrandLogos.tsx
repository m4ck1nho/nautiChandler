'use client';

import Image from 'next/image';

export function BrandLogos() {
    const brands = [
        { name: 'Castrol', src: '/castrolBrandLogo.png' },
        { name: 'FLIR', src: '/flirBrandLogo.png' },
        { name: 'Cressi', src: '/cressiBrandLogo.png' },
        { name: 'Nautic', src: '/nauticBrandLogo.png' },
    ];
    return (
        <section className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Trusted By</span>
                </div>

                {/* Simple Grid/Flex Layout */}
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                    {brands.map((brand, i) => (
                        <div key={i} className="relative w-32 h-16">
                            <Image
                                src={brand.src}
                                alt={brand.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
