import { FormEvent, useState } from "react";
import { useCreateBooking } from "../hooks/useCreateBooking";

interface BookingModalProps {
  spaceId: string;
  spaceName: string;
  onClose: () => void;
  onBooked: () => void;
}

function toIsoWithOffset(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

function BookingModal({ spaceId, spaceName, onClose, onBooked }: BookingModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const createBooking = useCreateBooking();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createBooking.mutate(
      {
        spaceId,
        startTime: toIsoWithOffset(date, startTime),
        endTime: toIsoWithOffset(date, endTime),
      },
      {
        onSuccess: () => {
          onBooked();
        },
      },
    );
  }

  const isConflict = createBooking.isError &&
    (createBooking.error as { response?: { status?: number } })?.response?.status === 409;

  return (
    <div role="dialog" aria-label="Confirm booking">
      <h2>Book {spaceName}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="booking-date">Date</label>
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="booking-start">Start time</label>
          <input
            id="booking-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="booking-end">End time</label>
          <input
            id="booking-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        {createBooking.isError && (
          <p role="alert">
            {isConflict
              ? "Sorry, this slot was just booked by someone else."
              : "Could not create the booking. Please check the details and try again."}
          </p>
        )}

        <button type="submit" disabled={createBooking.isPending}>
          {createBooking.isPending ? "Booking..." : "Confirm Booking"}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}

export default BookingModal;
