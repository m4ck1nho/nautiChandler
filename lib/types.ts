// Product type from scraping nautichandler.com
export interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  link: string;
  description?: string;
}

// Cart item stored in Supabase
export interface CartItem {
  id: string;
  session_id: string;
  product_title: string;
  product_price: string;
  product_image: string;
  product_link?: string;
  quantity: number;
  created_at?: string;
}

// API response types
export interface ProductsResponse {
  products: Product[];
  error?: string;
}

// Order type for delivery toggle
export type OrderType = 'delivery' | 'pickup';
