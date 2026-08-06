import { Link } from "react-router-dom";
import { Space } from "../api/spaces";

interface SpaceCardProps {
  space: Space;
}

function SpaceCard({ space }: SpaceCardProps) {
  return (
    <div>
      <h3>{space.name}</h3>
      <p>{space.type === "DESK" ? "Desk" : "Meeting Room"}</p>
      <p>Capacity: {space.capacity}</p>
      {space.amenities.length > 0 && <p>Amenities: {space.amenities.join(", ")}</p>}
      <Link to={`/spaces/${space.id}`}>View details</Link>
    </div>
  );
}

export default SpaceCard;
