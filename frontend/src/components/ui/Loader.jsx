export default function Loader({ size = "md", text }) {
  const s = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" }[size];
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${s} rounded-full border-2 border-white/10 border-t-amber-500 animate-spin`}
      />
      {text && (
        <p className="text-xs text-zinc-600 font-mono tracking-wide">{text}</p>
      )}
    </div>
  );
}
