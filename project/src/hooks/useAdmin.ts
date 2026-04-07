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

  /**
   * Legacy single-image helper — kept for backwards compatibility.
   * Appends a single file to the `image` array (does not replace existing images).
   */
  const updateProductImage = useCallback(async (productId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    await pb.collection('products').update(productId, formData);
    invalidateProducts();
  }, [invalidateProducts]);

  /**
   * Append one or more new images to a product's `image` array.
   * PocketBase appends files when the field name is used without the `-` prefix.
   */
  const addProductImages = useCallback(async (productId: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('image', file);
    }
    await pb.collection('products').update(productId, formData);
    invalidateProducts();
  }, [invalidateProducts]);

  /**
   * Remove a single image from a product by its filename.
   * PocketBase removes a file when you send `image-` with the filename as value.
   */
  const removeProductImage = useCallback(async (productId: string, filename: string) => {
    await pb.collection('products').update(productId, {
      [`image-`]: filename,
    });
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

  return {
    markSold,
    markAvailable,
    toggleFeatured,
    updateProductImage,
    addProductImages,
    removeProductImage,
    getSetting,
    setSetting,
  };
}
