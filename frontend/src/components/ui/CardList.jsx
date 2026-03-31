import Loader from "./Loader.jsx";

export default function CardList({
  loading,
  error,
  empty,
  emptyMessage = "Nothing here yet.",
  cols = 3,
  children,
}) {
  const colClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    }[cols] ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader size="md" text="Loading…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-400">
          {error?.response?.data?.error ||
            error?.message ||
            "Something went wrong."}
        </p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-zinc-600">{emptyMessage}</p>
      </div>
    );
  }

  return <div className={`grid ${colClass} gap-5`}>{children}</div>;
}
