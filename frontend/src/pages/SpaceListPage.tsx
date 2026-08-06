import { useState } from "react";
import { useSpaces } from "../hooks/useSpaces";
import SpaceCard from "../components/SpaceCard";
import { SpaceType } from "../api/spaces";

const PAGE_SIZE = 10;

function SpaceListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<SpaceType | "">("");

  const { data, isLoading, isError, refetch } = useSpaces({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: type || undefined,
  });

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setType(event.target.value as SpaceType | "");
    setPage(1);
  }

  return (
    <div>
      <h1>Spaces</h1>

      <div>
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={handleSearchChange}
        />

        <label htmlFor="type">Type</label>
        <select id="type" value={type} onChange={handleTypeChange}>
          <option value="">All types</option>
          <option value="DESK">Desk</option>
          <option value="MEETING_ROOM">Meeting Room</option>
        </select>
      </div>

      {isLoading && <p role="status">Loading spaces...</p>}

      {isError && (
        <div role="alert">
          <p>Could not load spaces. Please try again.</p>
          <button type="button" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <p>No spaces match your search. Try adjusting your filters.</p>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <div>
            {data.data.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>

          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SpaceListPage;
