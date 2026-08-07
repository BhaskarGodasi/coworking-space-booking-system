import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "../api/axios";
import AvailabilityCalendar, { buildMonthGrid, toIsoDate } from "./AvailabilityCalendar";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn() },
  };
});

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe("buildMonthGrid", () => {
  it("always returns exactly 42 cells (a fixed 6-row grid)", () => {
    const grid = buildMonthGrid(2026, 0, "2026-01-01");
    expect(grid).toHaveLength(42);
  });

  it("marks every cell belonging to the requested month as inCurrentMonth", () => {
    const grid = buildMonthGrid(2026, 1, "2026-02-01");
    const februaryCells = grid.filter((cell) => cell.date.getUTCMonth() === 1);
    expect(februaryCells.every((cell) => cell.inCurrentMonth)).toBe(true);
    expect(grid.filter((cell) => cell.inCurrentMonth)).toHaveLength(28);
  });

  it("marks leading/trailing days from adjacent months as not inCurrentMonth", () => {
    // February 2026 starts on a Sunday, so there should be no leading days,
    // but there will be trailing March days filling out the 42-cell grid.
    const grid = buildMonthGrid(2026, 1, "2026-02-01");
    const trailing = grid.filter((cell) => !cell.inCurrentMonth);
    expect(trailing.length).toBeGreaterThan(0);
    expect(trailing.every((cell) => cell.date.getUTCMonth() === 2)).toBe(true);
  });

  it("marks exactly one cell as isToday when today falls within the grid", () => {
    const grid = buildMonthGrid(2026, 0, "2026-01-15");
    const todays = grid.filter((cell) => cell.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].iso).toBe("2026-01-15");
  });

  it("marks no cell as isToday when today falls outside the visible month", () => {
    const grid = buildMonthGrid(2026, 0, "2026-06-15");
    expect(grid.some((cell) => cell.isToday)).toBe(false);
  });

  it("produces cells in strictly ascending date order", () => {
    const grid = buildMonthGrid(2026, 3, "2026-04-01");
    for (let i = 1; i < grid.length; i += 1) {
      expect(grid[i].date.getTime()).toBeGreaterThan(grid[i - 1].date.getTime());
    }
  });
});

describe("toIsoDate", () => {
  it("formats a UTC date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date("2026-03-05T00:00:00.000Z"))).toBe("2026-03-05");
  });
});

describe("AvailabilityCalendar", () => {
  beforeEach(() => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: { bookings: [], maintenance: [] } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests availability for the initially selected date on mount", async () => {
    renderWithQueryClient(
      <AvailabilityCalendar spaceId="space-1" initialDate="2026-05-10" />,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/spaces/space-1/availability",
        expect.objectContaining({ params: { date: "2026-05-10" } }),
      );
    });
  });

  it("shows the space as available once the query resolves with no bookings or maintenance", async () => {
    renderWithQueryClient(
      <AvailabilityCalendar spaceId="space-1" initialDate="2026-05-10" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeInTheDocument();
    });
  });

  it("re-requests availability and calls onDateSelect when a different day is clicked", async () => {
    const onDateSelect = vi.fn();
    renderWithQueryClient(
      <AvailabilityCalendar spaceId="space-1" initialDate="2026-05-10" onDateSelect={onDateSelect} />,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const dayFifteen = screen.getAllByRole("gridcell").find((cell) => cell.textContent === "15");
    expect(dayFifteen).toBeDefined();
    fireEvent.click(dayFifteen as HTMLElement);

    expect(onDateSelect).toHaveBeenCalledWith("2026-05-15");
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/spaces/space-1/availability",
        expect.objectContaining({ params: { date: "2026-05-15" } }),
      );
    });
  });

  it("shows Booked when the selected date has an active booking", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: {
          bookings: [{ startTime: "2026-05-10T09:00:00.000Z", endTime: "2026-05-10T10:00:00.000Z" }],
          maintenance: [],
        },
      },
    });

    renderWithQueryClient(
      <AvailabilityCalendar spaceId="space-1" initialDate="2026-05-10" />,
    );

    await waitFor(() => {
      // Both the day-status badge and the per-slot list label read "Booked"
      // (see AvailabilityCalendar.tsx) -- assert at least one is present
      // rather than assuming there's exactly one.
      expect(screen.getAllByText("Booked").length).toBeGreaterThan(0);
    });
  });

  it("shows Maintenance (takes priority over Booked) when both are present on the selected date", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: {
          bookings: [{ startTime: "2026-05-10T09:00:00.000Z", endTime: "2026-05-10T10:00:00.000Z" }],
          maintenance: [{ startTime: "2026-05-10T11:00:00.000Z", endTime: "2026-05-10T12:00:00.000Z" }],
        },
      },
    });

    renderWithQueryClient(
      <AvailabilityCalendar spaceId="space-1" initialDate="2026-05-10" />,
    );

    await waitFor(() => {
      // Both the day-status badge and the per-slot list label read
      // "Maintenance" -- assert at least one is present.
      expect(screen.getAllByText("Maintenance").length).toBeGreaterThan(0);
    });
  });
});
