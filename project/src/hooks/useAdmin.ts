import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import pb from '../lib/pocketbase';

export function useAdmin() {
  const queryClient = useQueryClient();

  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  }, [queryClient]);

  const markSold = useCallback(async (productId: string) => {
    await pb.collection('products').update(productId, {
      is_sold: true,
      is_available: false,
    });
    invalidateProducts();
  }, [invalidateProducts]);

  const markAvailable = useCallback(async (productId: string) => {
    await pb.collection('products').update(productId, {
      is_sold: false,
      is_available: true,
    });
    invalidateProducts();
  }, [invalidateProducts]);

  const toggleFeatured = useCallback(async (productId: string, isFeatured: boolean) => {
    await pb.collection('products').update(productId, { is_featured: isFeatured });
    invalidateProducts();
  }, [invalidateProducts]);

  const updateProductImage = useCallback(async (productId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    await pb.collection('products').update(productId, formData);
    invalidateProducts();
  }, [invalidateProducts]);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    try {
      const result = await pb.collection('settings').getFirstListItem(`key = "${key}"`);
      return result.value ?? null;
    } catch {
      return null;
    }
  }, []);

  const setSetting = useCallback(async (key: string, value: string) => {
    try {
      const existing = await pb.collection('settings').getFirstListItem(`key = "${key}"`);
      await pb.collection('settings').update(existing.id, { value });
    } catch {
      await pb.collection('settings').create({ key, value });
    }
  }, []);

  return { markSold, markAvailable, toggleFeatured, updateProductImage, getSetting, setSetting };
}
