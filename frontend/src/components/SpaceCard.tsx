import { Link } from "react-router-dom";
import { Users, Monitor, Building2, ArrowRight } from "lucide-react";
import { Space } from "../api/spaces";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface SpaceCardProps {
  space: Space;
}

function SpaceCard({ space }: SpaceCardProps) {
  const isDesk = space.type === "DESK";

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-md border-muted">
      <div className="relative h-48 w-full bg-muted overflow-hidden">
        {/* Placeholder gradient since we don't have images */}
        <div className={`absolute inset-0 bg-gradient-to-br opacity-80 ${isDesk ? 'from-blue-500/20 to-indigo-500/20' : 'from-emerald-500/20 to-teal-500/20'}`} />
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
          {isDesk ? <Monitor className="h-20 w-20" /> : <Building2 className="h-20 w-20" />}
        </div>
        <div className="absolute top-4 left-4">
          <Badge variant={isDesk ? "default" : "success"} className="shadow-sm">
            {isDesk ? "Desk" : "Meeting Room"}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-3 flex-none">
        <h3 className="text-xl font-bold tracking-tight line-clamp-1">{space.name}</h3>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            <span>Capacity: <strong className="text-foreground">{space.capacity}</strong> {space.capacity === 1 ? 'person' : 'people'}</span>
          </div>
          
          {space.amenities.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amenities</span>
              <div className="flex flex-wrap gap-1.5">
                {space.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-medium">
                    {amenity}
                  </Badge>
                ))}
                {space.amenities.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm font-medium border-dashed">
                    +{space.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 border-t mt-auto">
        <Button asChild variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary mt-4 px-0">
          <Link to={`/spaces/${space.id}`}>
            View Details
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SpaceCard;
