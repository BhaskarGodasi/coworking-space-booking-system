import { useMemo, useState } from "react";
import { useSpaceAvailability } from "../hooks/useSpaceAvailability";

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

/**
 * A reusable, dependency-free availability calendar: CSS Grid month view
 * with day selection, plus a time-slot breakdown for whichever day is
 * selected. The documented availability contract
 * (GET /spaces/:id/availability?date=YYYY-MM-DD, see 2_Implementation
 * Design v1.1) only returns one day's bookings/maintenance at a time --
 * there is no bulk/range endpoint -- so only the selected day can be
 * colored Available/Booked/Maintenance from real data. Every other cell
 * in the grid is deliberately neutral rather than guessed at.
 */
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
    <div>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}
      >
        <button type="button" onClick={goToPreviousMonth} aria-label="Previous month">
          Previous
        </button>
        <span>{monthLabel}</span>
        <button type="button" onClick={goToNextMonth} aria-label="Next month">
          Next
        </button>
      </div>

      <div
        role="grid"
        aria-label="Availability calendar"
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} role="columnheader" style={{ textAlign: "center", fontWeight: "bold" }}>
            {label}
          </div>
        ))}

        {grid.map((cell) => {
          const isSelected = cell.iso === selectedDate;
          const cellStatus = isSelected ? selectedDayStatus : "unselected";

          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              data-status={cellStatus}
              data-in-month={cell.inCurrentMonth}
              onClick={() => selectDay(cell.iso)}
              style={{
                opacity: cell.inCurrentMonth ? 1 : 0.4,
                fontWeight: cell.isToday ? "bold" : "normal",
                border: isSelected ? "2px solid" : "1px solid",
              }}
            >
              {cell.date.getUTCDate()}
            </button>
          );
        })}
      </div>

      <div>
        <span data-status={selectedDayStatus}>
          {selectedDayStatus === "available" && "Available"}
          {selectedDayStatus === "booked" && "Booked"}
          {selectedDayStatus === "maintenance" && "Maintenance"}
          {selectedDayStatus === "unknown" && "Checking availability..."}
        </span>
        {" for "}
        {selectedDate}
      </div>

      {availabilityQuery.isLoading && <p role="status">Loading availability...</p>}

      {availabilityQuery.isError && (
        <div role="alert">
          <p>Could not load availability for this date.</p>
          <button type="button" onClick={() => availabilityQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {availabilityQuery.data &&
        availabilityQuery.data.bookings.length === 0 &&
        availabilityQuery.data.maintenance.length === 0 && (
          <p>This space is fully available on {selectedDate}.</p>
        )}

      {availabilityQuery.data &&
        (availabilityQuery.data.bookings.length > 0 ||
          availabilityQuery.data.maintenance.length > 0) && (
          <ul>
            {availabilityQuery.data.bookings.map((slot, index) => (
              <li key={`booking-${index}`} data-slot-type="booked">
                Booked: {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </li>
            ))}
            {availabilityQuery.data.maintenance.map((slot, index) => (
              <li key={`maintenance-${index}`} data-slot-type="maintenance">
                Maintenance: {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

export default AvailabilityCalendar;
export { buildMonthGrid, toIsoDate };
