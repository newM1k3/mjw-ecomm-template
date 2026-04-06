import { useQuery } from '@tanstack/react-query';
import pb from '../lib/pocketbase';
import { Product, ProductFilters } from '../lib/types';

const PAGE_SIZE = 24;

function buildFilter(filters: ProductFilters): string {
  const parts: string[] = ['is_available = true'];

  if (filters.category) {
    parts.push(`category = "${filters.category}"`);
  }

  if (filters.search) {
    parts.push(`brand_model ~ "${filters.search}" || details ~ "${filters.search}"`);
  }

  if (filters.priceMin !== undefined) {
    parts.push(`quick_sale_price >= ${filters.priceMin}`);
  }

  if (filters.priceMax !== undefined) {
    parts.push(`quick_sale_price <= ${filters.priceMax}`);
  }

  return parts.join(' && ');
}

function buildSort(sortBy?: string): string {
  switch (sortBy) {
    case 'price_asc': return 'quick_sale_price';
    case 'price_desc': return '-quick_sale_price';
    case 'condition_best': return '-condition_rating';
    case 'newest':
    default: return '-created';
  }
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const page = filters.page ?? 1;
      const result = await pb.collection('products').getList<Product>(page, PAGE_SIZE, {
        filter: buildFilter(filters),
        sort: buildSort(filters.sortBy),
      });
      return result;
    },
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      return await pb.collection('products').getOne<Product>(id);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const result = await pb.collection('products').getList<Product>(1, 8, {
        filter: 'is_featured = true && is_available = true',
        sort: '-created',
      });
      return result.items;
    },
    staleTime: 30_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await pb.collection('products').getList<Product>(1, 500, {
        filter: 'is_available = true',
        fields: 'category',
      });
      const counts: Record<string, number> = {};
      for (const item of result.items) {
        counts[item.category] = (counts[item.category] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000,
  });
}
