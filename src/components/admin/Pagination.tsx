import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export default function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-white">
      <span>
        {total} item{total !== 1 ? "s" : ""} &middot; page {page} of {pages}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {start > 1 && <span className="px-1 text-gray-300">…</span>}
        {nums.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
              n === page
                ? "bg-amber-500 text-white"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            {n}
          </button>
        ))}
        {end < pages && <span className="px-1 text-gray-300">…</span>}
        <button
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
