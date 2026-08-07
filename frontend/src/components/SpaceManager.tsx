import { FormEvent, useState } from "react";
import { Edit2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSpaces } from "../hooks/useSpaces";
import { useCreateSpace } from "../hooks/useCreateSpace";
import { useUpdateSpace } from "../hooks/useUpdateSpace";
import { useDeleteSpace } from "../hooks/useDeleteSpace";
import { useDeletedSpaces } from "../hooks/useDeletedSpaces";
import { useRestoreSpace } from "../hooks/useRestoreSpace";
import { Space, SpaceType } from "../api/spaces";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { useToast } from "./ui/toast";

interface SpaceFormState {
  name: string;
  type: SpaceType;
  capacity: string;
  amenities: string;
}

const EMPTY_FORM: SpaceFormState = { name: "", type: "DESK", capacity: "", amenities: "" };

function toAmenitiesArray(value: string) {
  return value
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

function SpaceManager() {
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const deletedSpacesQuery = useDeletedSpaces();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const restoreSpace = useRestoreSpace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpaceFormState>(EMPTY_FORM);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { addToast } = useToast();

  function startEdit(space: Space) {
    setEditingId(space.id);
    setForm({
      name: space.name,
      type: space.type,
      capacity: String(space.capacity),
      amenities: space.amenities.join(", "),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = {
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity),
      amenities: toAmenitiesArray(form.amenities),
    };

    if (editingId) {
      updateSpace.mutate(
        { id: editingId, input },
        {
          onSuccess: () => {
            addToast({ title: "Space updated", variant: "success" });
            cancelEdit();
          },
          onError: () => {
            addToast({
              title: "Could not update space",
              description: "Please check the details and try again.",
              variant: "destructive",
            });
          },
        },
      );
    } else {
      createSpace.mutate(input, {
        onSuccess: () => {
          addToast({ title: "Space created", variant: "success" });
          setForm(EMPTY_FORM);
        },
        onError: () => {
          addToast({
            title: "Could not create space",
            description: "Please check the details and try again.",
            variant: "destructive",
          });
        },
      });
    }
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    deleteSpace.mutate(deleteTargetId, {
      onSuccess: () => {
        addToast({ title: "Space deleted", variant: "success" });
        setDeleteTargetId(null);
      },
      onError: () => {
        addToast({
          title: "Could not delete space",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  }

  const activeMutation = editingId ? updateSpace : createSpace;
  const spaces = spacesQuery.data?.data ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Editor Form */}
      <div className="xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? "Edit Space" : "Create Space"}</CardTitle>
            <CardDescription>
              {editingId ? "Update details for the selected space." : "Add a new space to the inventory."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="space-name">Name</Label>
                <Input
                  id="space-name"
                  type="text"
                  placeholder="e.g. Executive Boardroom"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="space-type">Type</Label>
                <Select value={form.type} onValueChange={(val: SpaceType) => setForm((f) => ({ ...f, type: val }))} required>
                  <SelectTrigger id="space-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESK">Desk</SelectItem>
                    <SelectItem value="MEETING_ROOM">Meeting Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="space-capacity">Capacity</Label>
                <Input
                  id="space-capacity"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 10"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="space-amenities">Amenities</Label>
                <Input
                  id="space-amenities"
                  type="text"
                  placeholder="e.g. wifi, projector, whiteboard (comma separated)"
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                />
              </div>

              {activeMutation.isError && (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive font-medium" role="alert">
                  Could not save this space. Please check the details and try again.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={activeMutation.isPending}>
                  {activeMutation.isPending ? "Saving..." : editingId ? "Save Changes" : <><Plus className="mr-2 h-4 w-4" /> Create Space</>}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={activeMutation.isPending}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Tables Area */}
      <div className="xl:col-span-2">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Spaces</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Spaces</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0">
            <div className="rounded-md border overflow-x-auto">
              {spacesQuery.isLoading && (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {spacesQuery.isError && (
                <div className="p-8">
                  <ErrorState title="Failed to load spaces" message="Could not load spaces. Please try again." onRetry={() => spacesQuery.refetch()} />
                </div>
              )}

              {!spacesQuery.isLoading && !spacesQuery.isError && spaces.length === 0 && (
                <EmptyState title="No spaces yet" description="You haven't created any spaces. Use the form to add one." />
              )}

              {!spacesQuery.isLoading && spaces.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Amenities</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spaces.map((space) => (
                      <TableRow key={space.id}>
                        <TableCell className="font-medium">{space.name}</TableCell>
                        <TableCell>
                          <Badge variant={space.type === "DESK" ? "default" : "success"}>
                            {space.type === "DESK" ? "Desk" : "Meeting Room"}
                          </Badge>
                        </TableCell>
                        <TableCell>{space.capacity}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={space.amenities.join(", ")}>
                          {space.amenities.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(space)} title="Edit space">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deleteSpace.isPending}
                              onClick={() => setDeleteTargetId(space.id)}
                              title="Delete space"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deleted" className="mt-0">
            <div className="rounded-md border overflow-x-auto">
              {deletedSpacesQuery.isLoading && (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {deletedSpacesQuery.isError && (
                <div className="p-8">
                  <ErrorState title="Failed to load deleted spaces" message="Could not load deleted spaces." onRetry={() => deletedSpacesQuery.refetch()} />
                </div>
              )}

              {!deletedSpacesQuery.isLoading && !deletedSpacesQuery.isError && (!deletedSpacesQuery.data || deletedSpacesQuery.data.length === 0) && (
                <EmptyState title="No deleted spaces" description="There are no deleted spaces in the system." />
              )}

              {!deletedSpacesQuery.isLoading && deletedSpacesQuery.data && deletedSpacesQuery.data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedSpacesQuery.data.map((space) => (
                      <TableRow key={space.id}>
                        <TableCell className="font-medium text-muted-foreground line-through">{space.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="opacity-50">
                            {space.type === "DESK" ? "Desk" : "Meeting Room"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground opacity-50">{space.capacity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={restoreSpace.isPending}
                            onClick={() =>
                              restoreSpace.mutate(space.id, {
                                onSuccess: () =>
                                  addToast({ title: "Space restored", variant: "success" }),
                                onError: () =>
                                  addToast({
                                    title: "Could not restore space",
                                    description: "Please try again.",
                                    variant: "destructive",
                                  }),
                              })
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete this space?"
        description="This will soft-delete the space. Existing bookings and maintenance windows are unaffected, and it can be restored later from the Deleted Spaces tab."
        confirmLabel="Delete Space"
        destructive
        isConfirming={deleteSpace.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default SpaceManager;
