import { useEffect, useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { useSpaces } from "../hooks/useSpaces";
import SpaceCard from "../components/SpaceCard";
import { SpaceType } from "../api/spaces";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "../components/ui/pagination";
import { Card, CardContent } from "../components/ui/card";

const PAGE_SIZE = 9; // Changed to 9 to fit nice 3x3 grid
const SEARCH_DEBOUNCE_MS = 300;

function SpaceListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<SpaceType | "all">("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [date, setDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
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
    type: type === "all" ? undefined : type,
    minCapacity: !minCapacityInvalid ? parsedMinCapacity : undefined,
    date: date || undefined,
  });

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setType("all");
    setMinCapacity("");
    setDate("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || type !== "all" || minCapacity || date);

  return (
    <div className="container py-10 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground mt-1">Find the perfect space for your next work session.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="font-semibold">Filters</h2>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide" : "Show"}
            </Button>
          </div>

          <Card className={`lg:block ${showFilters ? 'block' : 'hidden'}`}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search spaces..."
                    className="pl-9"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Space Type</Label>
                <Select value={type} onValueChange={(val: any) => { setType(val); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="DESK">Desk</SelectItem>
                    <SelectItem value="MEETING_ROOM">Meeting Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minCapacity">Minimum Capacity</Label>
                <Input
                  id="minCapacity"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Any"
                  value={minCapacity}
                  onChange={(e) => { setMinCapacity(e.target.value); setPage(1); }}
                />
                {minCapacityInvalid && (
                  <p className="text-xs text-destructive">Must be a whole number &gt; 0.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Available Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date} 
                  onChange={(e) => { setDate(e.target.value); setPage(1); }} 
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClearFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <ErrorState 
              title="Failed to load spaces" 
              message="There was an error communicating with the server." 
              onRetry={() => refetch()} 
            />
          )}

          {!isLoading && !isError && data && data.data.length === 0 && (
            hasActiveFilters ? (
              <EmptyState
                title="No matching spaces found"
                description="No spaces match your current search filters. Try adjusting them."
                action={
                  <Button variant="outline" onClick={handleClearFilters}>
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No Spaces Available"
                description="There are currently no workspaces available."
              />
            )
          )}

          {!isLoading && !isError && data && data.data.length > 0 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.map((space) => (
                  <SpaceCard key={space.id} space={space} />
                ))}
              </div>

              {data.meta.totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    <PaginationItem className="text-sm font-medium px-4">
                      Page {data.meta.page} of {data.meta.totalPages}
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                        className={page >= data.meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpaceListPage;
