import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, Monitor, Building2, CheckCircle2 } from "lucide-react";
import { useSpace } from "../hooks/useSpace";
import { useAuthStore } from "../store/authStore";
import BookingModal from "../components/BookingModal";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../components/ui/toast";

function SpaceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToast();

  const spaceQuery = useSpace(id);

  if (spaceQuery.isLoading) {
    return (
      <div className="container py-10 px-4 md:px-6 space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (spaceQuery.isError || !spaceQuery.data) {
    return (
      <div className="container py-20 px-4 md:px-6 space-y-6">
        <ErrorState
          title="Space Not Found"
          message="Could not load this space. It may no longer exist."
        />
        <div className="flex justify-center">
          <Button asChild>
            <Link to="/spaces">Back to spaces</Link>
          </Button>
        </div>
      </div>
    );
  }

  const space = spaceQuery.data;
  const isDesk = space.type === "DESK";

  const handleBooked = () => {
    setIsBookingOpen(false);
    addToast({
      title: "Booking Confirmed",
      description: `Your booking for ${space.name} has been confirmed.`,
      variant: "success"
    });
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      <div className="mb-6">
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link to="/spaces" className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to spaces
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative h-64 md:h-[400px] w-full rounded-2xl overflow-hidden bg-muted">
            <div className={`absolute inset-0 bg-gradient-to-br opacity-80 ${isDesk ? 'from-blue-500/20 to-indigo-500/20' : 'from-emerald-500/20 to-teal-500/20'}`} />
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              {isDesk ? <Monitor className="h-32 w-32" /> : <Building2 className="h-32 w-32" />}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{space.name}</h1>
              <Badge variant={isDesk ? "default" : "success"} className="text-sm px-3 py-1">
                {isDesk ? "Desk" : "Meeting Room"}
              </Badge>
            </div>
            
            <p className="text-lg text-muted-foreground mb-8">
              Premium workspace equipped for your professional needs.
            </p>

            <div className="space-y-6">
              <h2 className="text-2xl font-semibold tracking-tight">Amenities</h2>
              {space.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {space.amenities.map(amenity => (
                    <div key={amenity} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {amenity}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-sm">No specific amenities listed.</p>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t">
            <h2 className="text-2xl font-semibold tracking-tight">Availability</h2>
            <AvailabilityCalendar 
              spaceId={space.id} 
              initialDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>
        </div>

        {/* Sticky Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-md border-muted">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Workspace Details</h3>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Capacity: <strong className="text-foreground">{space.capacity}</strong> {space.capacity === 1 ? 'person' : 'people'}</span>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                {user ? (
                  <Button size="lg" className="w-full text-base" onClick={() => setIsBookingOpen(true)}>
                    Book this space
                  </Button>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">You must be logged in to book this space.</p>
                    <Button asChild size="lg" className="w-full text-base">
                      <Link to="/login" state={{ from: { pathname: `/spaces/${space.id}` } }}>
                        Log in to Book
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isBookingOpen && space && (
        <BookingModal
          spaceId={space.id}
          spaceName={space.name}
          onClose={() => setIsBookingOpen(false)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}

export default SpaceDetailsPage;
