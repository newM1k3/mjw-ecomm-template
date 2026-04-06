interface ConditionBadgeProps {
  rating: string;
}

function getBadgeClass(rating: string): string {
  const num = parseFloat(rating);
  if (isNaN(num)) {
    if (rating.toLowerCase().includes('nib')) {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  if (num >= 10) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (num >= 9) return 'bg-green-100 text-green-800 border border-green-200';
  if (num >= 8) return 'bg-lime-100 text-lime-800 border border-lime-200';
  if (num >= 7) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  return 'bg-orange-100 text-orange-800 border border-orange-200';
}

export default function ConditionBadge({ rating }: ConditionBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${getBadgeClass(rating)}`}>
      {rating}
    </span>
  );
}
