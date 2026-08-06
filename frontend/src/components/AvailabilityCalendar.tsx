import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSpaceAvailability } from "../hooks/useSpaceAvailability";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

interface AvailabilityCalendarProps {
  spaceId: string;
  /** YYYY-MM-DD. Defaults to today. */
  initialDate?: string;
  onDateSelect?: (date: string) => void;
}

interface DayCell {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

/**
 * Builds a fixed 6-row (42-cell) grid so the calendar's height never
 * shifts between months, following the standard "leading/trailing days
 * from adjacent months, greyed out" convention.
 */
function buildMonthGrid(year: number, month: number, todayIso: string): DayCell[] {
  const first = startOfMonth(year, month);
  const startWeekday = first.getUTCDay();
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - startWeekday);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setUTCDate(gridStart.getUTCDate() + i);
    const iso = toIsoDate(cellDate);
    cells.push({
      date: cellDate,
      iso,
      inCurrentMonth: cellDate.getUTCMonth() === month,
      isToday: iso === todayIso,
    });
  }
  return cells;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AvailabilityCalendar({ spaceId, initialDate, onDateSelect }: AvailabilityCalendarProps) {
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayIso);
  const [viewYear, setViewYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedDate.slice(5, 7)) - 1);

  const availabilityQuery = useSpaceAvailability(spaceId, selectedDate);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, todayIso),
    [viewYear, viewMonth, todayIso],
  );

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  function goToPreviousMonth() {
    const prev = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
    setViewYear(prev.getUTCFullYear());
    setViewMonth(prev.getUTCMonth());
  }

  function goToNextMonth() {
    const next = new Date(Date.UTC(viewYear, viewMonth + 1, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  function selectDay(iso: string) {
    setSelectedDate(iso);
    onDateSelect?.(iso);
  }

  const selectedDayStatus: "available" | "booked" | "maintenance" | "unknown" = (() => {
    if (!availabilityQuery.data) return "unknown";
    if (availabilityQuery.data.maintenance.length > 0) return "maintenance";
    if (availabilityQuery.data.bookings.length > 0) return "booked";
    return "available";
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Previous month" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">{monthLabel}</h3>
            <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div
            role="grid"
            aria-label="Availability calendar"
            className="grid grid-cols-7 gap-1"
          >
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} role="columnheader" className="text-center text-xs font-medium text-muted-foreground py-2">
                {label}
              </div>
            ))}

            {grid.map((cell) => {
              const isSelected = cell.iso === selectedDate;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  data-in-month={cell.inCurrentMonth}
                  onClick={() => selectDay(cell.iso)}
                  className={cn(
                    "flex h-10 w-10 mx-auto items-center justify-center rounded-md text-sm transition-colors",
                    !cell.inCurrentMonth && "text-muted-foreground opacity-50",
                    cell.inCurrentMonth && "hover:bg-muted",
                    cell.isToday && !isSelected && "bg-accent/20 text-accent-foreground font-bold",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold"
                  )}
                >
                  {cell.date.getUTCDate()}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          Schedule for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          {selectedDayStatus === "available" && <Badge variant="success">Available</Badge>}
          {selectedDayStatus === "booked" && <Badge variant="secondary">Booked</Badge>}
          {selectedDayStatus === "maintenance" && <Badge variant="warning">Maintenance</Badge>}
        </h3>

        {availabilityQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {availabilityQuery.isError && (
          <div className="p-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm" role="alert">
            Could not load availability for this date.
            <Button variant="link" size="sm" onClick={() => availabilityQuery.refetch()} className="ml-2 h-auto p-0">
              Retry
            </Button>
          </div>
        )}

        {availabilityQuery.data &&
          availabilityQuery.data.bookings.length === 0 &&
          availabilityQuery.data.maintenance.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
              <p className="text-muted-foreground">This space is fully available.</p>
            </div>
          )}

        {availabilityQuery.data &&
          (availabilityQuery.data.bookings.length > 0 ||
            availabilityQuery.data.maintenance.length > 0) && (
            <div className="space-y-3">
              {availabilityQuery.data.bookings.map((slot, index) => (
                <div 
                  key={`booking-${index}`} 
                  className="flex items-center justify-between p-3 rounded-md border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium text-sm">Booked</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
              ))}
              {availabilityQuery.data.maintenance.map((slot, index) => (
                <div 
                  key={`maintenance-${index}`} 
                  className="flex items-center justify-between p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-sm text-amber-700 dark:text-amber-400">Maintenance</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
export { buildMonthGrid, toIsoDate };
