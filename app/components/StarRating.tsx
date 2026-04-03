"use client";

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
}

export default function StarRating({ value, onChange, label }: StarRatingProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-transform hover:scale-110 ${
              star <= value ? "text-amber-400" : "text-gray-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
