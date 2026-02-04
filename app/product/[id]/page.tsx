import { promises as fs } from 'fs';
import path from 'path';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import AddToCartButton from '@/components/product/AddToCartButton';
import { Product } from '@/lib/types';

// Force dynamic behavior since we are reading from file that might change
export const dynamic = 'force-dynamic';

async function getProduct(id: string): Promise<Product | undefined> {
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'products.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const products: Product[] = JSON.parse(fileContents);

    // Exact match or loosely match if ID logic changed
    return products.find(p => p.id === id);
  } catch (error) {
    console.error('Error reading product:', error);
    return undefined;
  }
}

export default async function ProductPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  // Parse price for shipping calculation (mock)
  const priceVal = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
  const isFreeShipping = priceVal > 150;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-zinc-500 mb-8">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/search" className="hover:text-black transition-colors">Catalog</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          {product.category && (
            <>
              <Link href={`/search?category=${encodeURIComponent(product.category)}`} className="hover:text-black transition-colors capitalize">
                {product.category}
              </Link>
              <ChevronRight className="w-4 h-4 mx-2" />
            </>
          )}
          <span className="text-black truncate max-w-[200px] font-medium">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-contain p-8"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-300 text-6xl">⚓</div>
              )}
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-bold text-black leading-tight mb-4">
              {product.title}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-black">{product.price}</span>
              {isFreeShipping && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  Free Shipping
                </span>
              )}
            </div>

            <div className="prose prose-zinc mb-8">
              <p className="text-zinc-600">
                Premium marine grade {product.title.toLowerCase()}.
                Suitable for yacht and boat applications.
                {product.category ? `Part of our ${product.category} collection.` : ''}
              </p>
            </div>

            <div className="flex flex-col gap-4 mb-8">
              <AddToCartButton product={product} />
              <p className="text-xs text-center sm:text-left text-zinc-500">
                Ships within 24 hours. Returns available within 14 days.
              </p>
            </div>

            {/* Specifications Tab Mockup */}
            <div className="border-t border-zinc-200 pt-8">
              <h3 className="font-semibold text-lg mb-4">Product Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <dt className="text-zinc-500">SKU</dt>
                  <dd className="font-medium">{product.id}</dd>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="font-medium capitalize">{product.category || 'General'}</dd>
                </div>
                {/* Only show relevant fields if we had them. For now just generic. */}
              </dl>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
