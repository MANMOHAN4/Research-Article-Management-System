import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  className = "",
}) {
  return (
    <div className={`relative group ${className}`}>
      <Search
        size={15}
        strokeWidth={1.5}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600
          group-focus-within:text-amber-500 transition-colors duration-200 pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-9 pr-9 rounded-lg text-sm text-zinc-200
          placeholder:text-zinc-600 bg-[rgba(26,26,36,0.6)] backdrop-blur-sm
          border border-white/8 transition-all duration-200
          focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
          focus:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2
            text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
