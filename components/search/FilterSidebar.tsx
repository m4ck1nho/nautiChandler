'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/lib/types';

interface FilterSidebarProps {
    products: Product[]; // Full unfiltered list to derive options
    filters: {
        priceRange: [number, number];
        selectedBrands: string[];
        selectedCategories: string[];
        selectedColors: string[];
    };
    setFilters: (filters: any) => void;
    className?: string;
    isOpen?: boolean;     // For mobile drawer integration
    onClose?: () => void; // For mobile drawer integration
}

// Utility to extract "Brand" from title (first word usually)
const getBrandFromTitle = (title: string) => {
    return title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
};

const parsePrice = (priceStr: string) => {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
};

export function FilterSidebar({ products, filters, setFilters, className = '', isOpen, onClose }: FilterSidebarProps) {
    const [searchBrand, setSearchBrand] = useState('');

    // -- DERIVE OPTIONS FROM DATA --
    const { brands, categories, priceBounds } = useMemo(() => {
        const brandSet = new Set<string>();
        const catSet = new Set<string>();
        let minApiPrice = 100000;
        let maxApiPrice = 0;

        products.forEach(p => {
            // Brands
            const brand = getBrandFromTitle(p.title);
            if (brand && brand.length > 2) brandSet.add(brand); // Filter out tiny junk

            // Categories
            if (p.category) catSet.add(p.category);

            // Price
            const price = parsePrice(p.price);
            if (price < minApiPrice) minApiPrice = price;
            if (price > maxApiPrice) maxApiPrice = price;
        });

        return {
            brands: Array.from(brandSet).sort(),
            categories: Array.from(catSet).sort(),
            priceBounds: { min: minApiPrice, max: maxApiPrice }
        };
    }, [products]);

    // -- STATE FOR ACCORDIONS --
    const [openSections, setOpenSections] = useState({
        categories: true,
        brands: true,
        price: true,
        color: true
    });

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // -- HELPERS --
    const handleBrandToggle = (brand: string) => {
        const current = filters.selectedBrands;
        const next = current.includes(brand)
            ? current.filter(b => b !== brand)
            : [...current, brand];
        setFilters({ ...filters, selectedBrands: next });
    };

    const handleCategoryToggle = (category: string) => {
        const current = filters.selectedCategories;
        const next = current.includes(category)
            ? current.filter(c => c !== category)
            : [...current, category];
        setFilters({ ...filters, selectedCategories: next });
    };

    const filteredBrands = brands.filter(b => b.toLowerCase().includes(searchBrand.toLowerCase()));

    return (
        <div className={`w-full lg:w-64 flex-shrink-0 bg-white border-r border-zinc-200 h-full overflow-y-auto ${className}`}>

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-100">
                <span className="font-semibold text-lg">Filters</span>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-6">

                {/* --- CATEGORIES --- */}
                <div className="border-b border-zinc-100 pb-4">
                    <button
                        onClick={() => toggleSection('categories')}
                        className="flex items-center justify-between w-full py-2 font-medium text-sm text-zinc-900 mb-2"
                    >
                        <span>Categories</span>
                        {openSections.categories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {openSections.categories && (
                        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {categories.map(category => (
                                <label key={category} className="flex items-center gap-3 cursor-pointer group">
                                    <Checkbox
                                        checked={filters.selectedCategories.includes(category)}
                                        onChange={() => handleCategoryToggle(category)}
                                    />
                                    <span className="text-sm text-zinc-600 group-hover:text-black capitalize transition-colors">
                                        {category}
                                    </span>
                                    <span className="ml-auto text-xs text-zinc-400">
                                        ({products.filter(p => p.category === category).length})
                                    </span>
                                </label>
                            ))}
                            {categories.length === 0 && <p className="text-xs text-zinc-400 italic">No categories found</p>}
                        </div>
                    )}
                </div>

                {/* --- BRANDS --- */}
                <div className="border-b border-zinc-100 pb-4">
                    <button
                        onClick={() => toggleSection('brands')}
                        className="flex items-center justify-between w-full py-2 font-medium text-sm text-zinc-900 mb-2"
                    >
                        <span>Brand</span>
                        {openSections.brands ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {openSections.brands && (
                        <div className="space-y-3 mt-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search brand"
                                    value={searchBrand}
                                    onChange={(e) => setSearchBrand(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-100 rounded-md border-none focus:ring-1 focus:ring-black outline-none"
                                />
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {filteredBrands.map(brand => (
                                    <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                        <Checkbox
                                            checked={filters.selectedBrands.includes(brand)}
                                            onChange={() => handleBrandToggle(brand)}
                                        />
                                        <span className="text-sm text-zinc-600 group-hover:text-black transition-colors">
                                            {brand}
                                        </span>
                                        <span className="ml-auto text-xs text-zinc-400">
                                            {/* Count approx */}
                                            ({products.filter(p => getBrandFromTitle(p.title) === brand).length})
                                        </span>
                                    </label>
                                ))}
                                {filteredBrands.length === 0 && <p className="text-xs text-zinc-400 italic">No brands found</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- PRICE --- */}
                <div className="border-b border-zinc-100 pb-4">
                    <button
                        onClick={() => toggleSection('price')}
                        className="flex items-center justify-between w-full py-2 font-medium text-sm text-zinc-900 mb-2"
                    >
                        <span>Price Range</span>
                        {openSections.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {openSections.price && (
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">€</span>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.priceRange[0] || ''}
                                        onChange={(e) => setFilters({ ...filters, priceRange: [Number(e.target.value), filters.priceRange[1]] })}
                                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-zinc-200 rounded-md focus:border-black outline-none"
                                    />
                                </div>
                                <span className="text-zinc-400">-</span>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">€</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.priceRange[1] || ''}
                                        onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], Number(e.target.value)] })}
                                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-zinc-200 rounded-md focus:border-black outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    // Apply is automatic in our filteredProducts logic, maybe just reset here?
                                    // Or visual confirm
                                }}
                                className="w-full py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-md transition-colors"
                            >
                                Reset Price
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
