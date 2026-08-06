import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "./ui/dialog";

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Space</DialogTitle>
            <DialogDescription>
              {spaceName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="booking-date">Date</Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-start">Start time</Label>
                <Input
                  id="booking-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-end">End time</Label>
                <Input
                  id="booking-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {createBooking.isError && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive font-medium" role="alert">
                {isConflict
                  ? "Sorry, this slot was just booked by someone else."
                  : "Could not create the booking. Please check the details and try again."}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={createBooking.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBooking.isPending}>
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export default BookingModal;
