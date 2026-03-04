import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Trash2, UserPlus, Camera, CalendarDays, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { AddChildConnectionModal } from "./AddChildConnectionModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ConnectionDetailPanelProps {
  connection: any;
  onClose: () => void;
  onUpdate: () => void;
}

const familyRelationships = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Spouse",
  "Daughter",
  "Son",
  "Grandmother",
  "Grandfather",
  "Granddaughter",
  "Grandson",
  "Cousin",
  "Aunt",
  "Uncle",
  "Niece",
  "Nephew",
  "Other Relative",
];

const friendshipRelationships = [
  "Friend",
  "Best Friend",
  "Mentor",
  "Classmate",
  "Colleague",
  "Partner",
  "Acquaintance",
  "Other",
];

const ConnectionDetailPanel = ({
  connection,
  onClose,
  onUpdate,
}: ConnectionDetailPanelProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editConnectionType, setEditConnectionType] = useState<"family" | "friendship">("family");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!connection) return;
    setEditName(connection.related_person_name || "");
    setEditRelationship(connection.relationship_type || "");
    setEditConnectionType(connection.connection_type === "friendship" ? "friendship" : "family");
    setEditImagePreview(null);
    setEditImageFile(null);
  }, [connection]);

  if (!connection) return null;

  const displayName = connection.person_id
    ? (connection.profile?.full_name || "Unknown")
    : (connection.related_person_name || "Unknown");
  const avatarUrl = connection.person_id
    ? (connection.profile?.avatar_url || "/placeholder.svg")
    : (connection.image_url || "/placeholder.svg");
  const isRegisteredUser = !!connection.person_id;
  const isDeceased = connection.person_id && connection.profile?.is_deceased;

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connection.id);
      if (error) throw error;
      toast({ title: "Connection removed", description: "The connection has been removed from your tree." });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({ title: "Error removing connection", description: error.message, variant: "destructive" });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!editImageFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = editImageFile.name.split(".").pop();
    const path = `${user.id}/connections/${connection.id}.${ext}`;
    const { error } = await supabase.storage
      .from("profile-pictures")
      .upload(path, editImageFile, { upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(path);
    return publicUrl;
  };

  const handleSaveEdit = async () => {
    if (!editRelationship.trim()) {
      toast({ title: "Missing information", description: "Relationship is required.", variant: "destructive" });
      return;
    }
    if (!connection.person_id && !editName.trim()) {
      toast({ title: "Missing information", description: "Name is required.", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      let imageUrl: string | null = null;
      if (editImageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage();
        setUploadingImage(false);
      }

      const updatePayload: Record<string, unknown> = {
        relationship_type: editRelationship.trim(),
        connection_type: editConnectionType,
      };
      if (!connection.person_id) {
        updatePayload.related_person_name = editName.trim();
      }
      if (imageUrl) {
        updatePayload.image_url = imageUrl;
      }

      const { error } = await supabase
        .from("connections")
        .update(updatePayload)
        .eq("id", connection.id);
      if (error) throw error;

      toast({ title: "Connection updated", description: "Your changes were saved." });
      setShowEditModal(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error updating connection", description: error.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
      setUploadingImage(false);
    }
  };

  const currentAvatarForEdit = editImagePreview || avatarUrl;

  return (
    <Sheet open={!!connection} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Connection Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">{displayName[0] || "?"}</AvatarFallback>
              </Avatar>
              {isDeceased && (
                <div className="absolute -top-2 -right-2 text-3xl">🕯️</div>
              )}
            </div>
            <h3 className="font-serif text-2xl font-bold text-center">{displayName}</h3>
            {connection.profile?.country && (
              <p className="text-sm text-muted-foreground">{connection.profile.country}</p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm">{connection.relationship_type}</Badge>
            <Badge variant={connection.connection_type === "family" ? "default" : "outline"}>
              {connection.connection_type === "family" ? "🌳 Family" : "🌐 Friendship"}
            </Badge>
            {isDeceased && <Badge variant="secondary" className="bg-muted">In Memoriam</Badge>}
            {!isRegisteredUser && <Badge variant="outline" className="text-xs">Not on ReflectLife</Badge>}
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Relationship</p>
                <p className="font-medium">{connection.relationship_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{connection.connection_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Added</p>
                <p className="font-medium">{connection.created_at ? format(new Date(connection.created_at), "dd MMM yyyy") : "Unknown"}</p>
              </div>
              {connection.shared_memory_id && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Shared Memory</p>
                  <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate(`/post/${connection.shared_memory_id}`)}>
                    View Memory
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Actions</h4>

            <Button className="w-full justify-between" variant="outline" onClick={() => setShowEditModal(true)}>
              Edit Connection
              <Pencil className="h-4 w-4" />
            </Button>

            <Button className="w-full justify-between" variant="outline" onClick={() => setShowAddChildModal(true)}>
              Add Connection to This Person
              <UserPlus className="h-4 w-4" />
            </Button>

            {isRegisteredUser && (
              <>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate(`/profile/${connection.person_id}`)}>
                  View Profile
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate(isDeceased ? `/memorial/${connection.person_id}` : `/timeline/${connection.person_id}`)}>
                  {isDeceased ? "View Memorial" : "View Timeline"}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full justify-between" variant="destructive">
                  Remove Connection
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Connection</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {displayName} from your {connection.connection_type} tree? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>

      {/* Add Child Modal */}
      <AddChildConnectionModal
        open={showAddChildModal}
        onOpenChange={setShowAddChildModal}
        parentConnectionId={connection.id}
        parentConnectionType={connection.connection_type || "family"}
        onUpdate={onUpdate}
      />

      {/* Edit Dialog with Photo Upload */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>Update this person's details and photo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentAvatarForEdit} />
                  <AvatarFallback className="text-xl">{displayName[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                {editImageFile ? "Change Photo" : "Upload Photo"}
              </Button>
            </div>

            {/* Name (non-registered only) */}
            {!connection.person_id && (
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter name" />
              </div>
            )}

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="edit-relationship">Relationship</Label>
              <Select
                value={editRelationship}
                onValueChange={(value) => {
                  setEditRelationship(value);
                  if (familyRelationships.includes(value)) {
                    setEditConnectionType("family");
                  } else if (friendshipRelationships.includes(value)) {
                    setEditConnectionType("friendship");
                  }
                }}
              >
                <SelectTrigger id="edit-relationship">
                  <SelectValue placeholder="Select relationship..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__family_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60">
                    Family
                  </SelectItem>
                  {familyRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                  <SelectItem value="__friendship_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60 mt-2">
                    Friendship
                  </SelectItem>
                  {friendshipRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Connection Type */}
            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={editConnectionType} onValueChange={(v: "family" | "friendship") => setEditConnectionType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">🌳 Family</SelectItem>
                  <SelectItem value="friendship">🌐 Friendship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {uploadingImage ? "Uploading..." : savingEdit ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default ConnectionDetailPanel;