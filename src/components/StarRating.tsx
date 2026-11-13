import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number | null | undefined; // Rating on 0-10 scale
  showText?: boolean;
  className?: string;
  starSizeClass?: string;
}

export default function StarRating({
  rating,
  showText = true,
  className = "",
  starSizeClass = "w-4 h-4"
}: StarRatingProps) {
  // Convert 10-point scale to 5-star scale (e.g. 9.0/10 -> 4.5/5)
  const numericRating = typeof rating === "number" ? rating : (Number(rating) || 0);
  const score5 = Math.max(0, Math.min(5, numericRating / 2));

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div 
        className="flex items-center gap-0.5" 
        title={`${score5.toFixed(1)} / 5 (${numericRating.toFixed(1)} / 10)`}
      >
        {[1, 2, 3, 4, 5].map((index) => {
          // Fraction of this specific star that should be filled (between 0 and 1)
          const fillFraction = Math.max(0, Math.min(1, score5 - (index - 1)));
          
          return (
            <div key={index} className={`relative inline-block ${starSizeClass} shrink-0`}>
              {/* Unfilled base star */}
              <Star className={`${starSizeClass} text-white/20 fill-white/10`} />

              {/* Yellow filled star overlay according to fraction */}
              {fillFraction > 0 && (
                <div
                  className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
                  style={{ width: `${Math.round(fillFraction * 100)}%` }}
                >
                  <Star className={`${starSizeClass} text-yellow-400 fill-yellow-400 shrink-0`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showText && (
        <div className="flex items-center text-xs sm:text-sm font-bold text-yellow-400 ml-0.5">
          <span>{score5.toFixed(1)}</span>
          <span className="text-white/40 text-[11px] font-normal ml-0.5">/ 5</span>
        </div>
      )}
    </div>
  );
}
