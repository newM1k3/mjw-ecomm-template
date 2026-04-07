export interface Product {
  id: string;
  collectionId: string;
  collectionName: string;
  category: string;
  brand_model: string;
  details: string;
  condition_rating: string;
  quick_sale_price: number;
  collector_price: number;
  special_notes: string;
  image: string | string[];
  is_sold: boolean;
  is_available: boolean;
  is_featured: boolean;
  created: string;
  updated: string;
}

export interface CartItem {
  productId: string;
  brandModel: string;
  priceType: 'quick' | 'collector';
  price: number;
  imageUrl: string;
}

export type SortOption = 'alpha' | 'price_asc' | 'price_desc' | 'condition_best';

export interface ProductFilters {
  category?: string;
  search?: string;
  sortBy?: SortOption;
  priceMin?: number;
  priceMax?: number;
  page?: number;
}
