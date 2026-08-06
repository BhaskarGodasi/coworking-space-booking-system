import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSpace } from "../hooks/useSpace";
import { useAuthStore } from "../store/authStore";
import BookingModal from "../components/BookingModal";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

function SpaceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const spaceQuery = useSpace(id);

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
      <AvailabilityCalendar spaceId={space.id} />
    </div>
  );
}

export default SpaceDetailsPage;
