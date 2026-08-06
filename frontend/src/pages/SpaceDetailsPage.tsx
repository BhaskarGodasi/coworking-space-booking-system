import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSpace } from "../hooks/useSpace";
import { useSpaceAvailability } from "../hooks/useSpaceAvailability";
import { useAuthStore } from "../store/authStore";
import BookingModal from "../components/BookingModal";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function SpaceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [date, setDate] = useState(todayIsoDate());
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const spaceQuery = useSpace(id);
  const availabilityQuery = useSpaceAvailability(id, date);

  if (spaceQuery.isLoading) {
    return <p role="status">Loading space details...</p>;
  }

  if (spaceQuery.isError || !spaceQuery.data) {
    return (
      <div role="alert">
        <p>Could not load this space. It may no longer exist.</p>
        <Link to="/">Back to spaces</Link>
      </div>
    );
  }

  const space = spaceQuery.data;

  return (
    <div>
      <Link to="/">Back to spaces</Link>
      <h1>{space.name}</h1>
      <p>{space.type === "DESK" ? "Desk" : "Meeting Room"}</p>
      <p>Capacity: {space.capacity}</p>
      {space.amenities.length > 0 && <p>Amenities: {space.amenities.join(", ")}</p>}

      {user && (
        <button type="button" onClick={() => setIsBookingOpen(true)}>
          Book this space
        </button>
      )}

      {isBookingOpen && space && (
        <BookingModal
          spaceId={space.id}
          spaceName={space.name}
          onClose={() => setIsBookingOpen(false)}
          onBooked={() => setIsBookingOpen(false)}
        />
      )}

      <h2>Availability</h2>
      <label htmlFor="availability-date">Date</label>
      <input
        id="availability-date"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />

      {availabilityQuery.isLoading && <p role="status">Loading availability...</p>}

      {availabilityQuery.isError && (
        <div role="alert">
          <p>Could not load availability for this date.</p>
          <button type="button" onClick={() => availabilityQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {availabilityQuery.data && (
        <>
          {availabilityQuery.data.bookings.length === 0 &&
          availabilityQuery.data.maintenance.length === 0 ? (
            <p>This space is fully available on {date}.</p>
          ) : (
            <ul>
              {availabilityQuery.data.bookings.map((slot, index) => (
                <li key={`booking-${index}`}>
                  Booked: {slot.startTime} - {slot.endTime}
                </li>
              ))}
              {availabilityQuery.data.maintenance.map((slot, index) => (
                <li key={`maintenance-${index}`}>
                  Maintenance: {slot.startTime} - {slot.endTime}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default SpaceDetailsPage;
