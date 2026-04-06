import { Eye } from 'lucide-react';
import pb from '../lib/pocketbase';
import { Product } from '../lib/types';
import ConditionBadge from './ConditionBadge';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

function getImageUrl(product: Product): string {
  if (!product.image) return '';
  try {
    return pb.files.getURL(product, product.image);
  } catch {
    return '';
  }
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = getImageUrl(product);

  return (
    <div
      className="group bg-white rounded-xl overflow-hidden border border-[--color-border] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-[--color-bg] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.brand_model}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[--color-muted]">
            <svg className="w-12 h-12 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs opacity-40">No photo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-[--color-primary] bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 bg-white text-[--color-primary] font-semibold text-sm px-4 py-2 rounded-lg shadow-lg">
            <Eye className="w-4 h-4" />
            View Details
          </span>
        </div>
        {product.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="bg-[--color-accent] text-[--color-text] text-xs font-bold px-2 py-0.5 rounded-full shadow">
              Staff Pick
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-[--color-text] text-sm leading-tight line-clamp-2 flex-1">
            {product.brand_model}
          </h3>
          <ConditionBadge rating={product.condition_rating} />
        </div>
        <p className="text-xs text-[--color-muted] mb-3 line-clamp-1">{product.category}</p>
        <div className="flex items-center justify-between">
          <span className="text-[--color-primary] font-bold text-base">
            ${product.quick_sale_price.toFixed(2)} <span className="text-xs font-normal text-[--color-muted]">CAD</span>
          </span>
          {product.collector_price > product.quick_sale_price && (
            <span className="text-xs text-[--color-muted] line-through">
              ${product.collector_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
