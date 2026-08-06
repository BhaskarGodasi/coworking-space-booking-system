import { useEffect, useState } from "react";
import { useSpaces } from "../hooks/useSpaces";
import SpaceCard from "../components/SpaceCard";
import { SpaceType } from "../api/spaces";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

function SpaceListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<SpaceType | "">("");
  const [minCapacity, setMinCapacity] = useState("");
  const [date, setDate] = useState("");

  // Debounced so typing a search term doesn't fire a request per keystroke;
  // the request only goes out once the user pauses.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const parsedMinCapacity = minCapacity ? Number(minCapacity) : undefined;
  const minCapacityInvalid =
    minCapacity !== "" && (!Number.isInteger(parsedMinCapacity) || (parsedMinCapacity as number) <= 0);

  const { data, isLoading, isError, refetch } = useSpaces({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: type || undefined,
    minCapacity: !minCapacityInvalid ? parsedMinCapacity : undefined,
    date: date || undefined,
  });

  function handleTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setType(event.target.value as SpaceType | "");
    setPage(1);
  }

  function handleMinCapacityChange(event: React.ChangeEvent<HTMLInputElement>) {
    setMinCapacity(event.target.value);
    setPage(1);
  }

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDate(event.target.value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setType("");
    setMinCapacity("");
    setDate("");
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
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <label htmlFor="type">Type</label>
        <select id="type" value={type} onChange={handleTypeChange}>
          <option value="">All types</option>
          <option value="DESK">Desk</option>
          <option value="MEETING_ROOM">Meeting Room</option>
        </select>

        <label htmlFor="minCapacity">Minimum capacity</label>
        <input
          id="minCapacity"
          type="number"
          min={1}
          step={1}
          placeholder="Any"
          value={minCapacity}
          onChange={handleMinCapacityChange}
        />
        {minCapacityInvalid && (
          <p role="alert">Minimum capacity must be a whole number greater than 0.</p>
        )}

        <label htmlFor="date">Available on</label>
        <input id="date" type="date" value={date} onChange={handleDateChange} />

        <button type="button" onClick={handleClearFilters}>
          Clear filters
        </button>
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
