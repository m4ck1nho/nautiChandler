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
        <section className="bg-white py-10 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-6 sm:mb-10">
                    <span className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-widest">Trusted By</span>
                </div>

                {/* Simple Grid/Flex Layout */}
                <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 md:gap-20">
                    {brands.map((brand, i) => (
                        <div key={i} className="relative w-20 h-10 sm:w-32 sm:h-16">
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
