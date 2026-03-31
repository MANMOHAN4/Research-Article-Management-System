import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authorAPI } from "../../api/endpoint.js";
import AuthorCard from "../../components/cards/AuthorCard.jsx";
import SearchBar from "../../components/ui/SearchBar.jsx";
import Loader from "../../components/ui/Loader.jsx";

export default function AuthorList() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["authors"],
    queryFn: () => authorAPI.getAll().then((r) => r.data),
  });
  const filtered = q
    ? data.filter(
        (a) =>
          a.Name?.toLowerCase().includes(q.toLowerCase()) ||
          a.Affiliation?.toLowerCase().includes(q.toLowerCase()),
      )
    : data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold text-white tracking-tight"
          style={{ fontFamily: "'Space Grotesk',sans-serif" }}
        >
          Authors
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">{data.length} total</p>
      </div>
      <SearchBar
        value={q}
        onChange={setQ}
        onClear={() => setQ("")}
        placeholder="Search authors…"
      />
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader text="Loading authors…" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AuthorCard key={a.AuthorID} author={a} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-zinc-600 py-12">
              No authors found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
