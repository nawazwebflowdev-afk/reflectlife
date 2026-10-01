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

import { tr } from "@/i18n/tr";
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

  const storageBucket = "profile-pictures";

  const extractStoragePathFromPublicUrl = (url: string | null | undefined) => {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${storageBucket}/`;
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;

    return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
  };

  const displayName = connection.person_id
    ? (connection.profile?.full_name || "Unknown")
    : (connection.related_person_name || "Unknown");
  const avatarUrl =
    connection.image_url ||
    (connection.person_id ? connection.profile?.avatar_url : null) ||
    "/placeholder.svg";
  const isRegisteredUser = !!connection.person_id;
  const isDeceased = connection.person_id && connection.profile?.is_deceased;

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connection.id);
      if (error) throw error;
      toast({ title: tr("a.144e7d8a58"), description: tr("a.391f91fc2c") });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({ title: tr("a.b1b31511fb"), description: error.message, variant: "destructive" });
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

  const uploadImage = async (ownerId: string, currentImageUrl?: string | null): Promise<string | null> => {
    if (!editImageFile) return null;

    const ext = editImageFile.name.split(".").pop() || "jpg";
    const path = `${ownerId}/connections/${connection.id}/avatar.${ext}`;
    const previousPath = extractStoragePathFromPublicUrl(currentImageUrl);

    if (previousPath && previousPath.startsWith(`${ownerId}/connections/`) && previousPath !== path) {
      const { error: removeError } = await supabase.storage
        .from(storageBucket)
        .remove([previousPath]);

      if (removeError) {
        console.warn("Failed to remove previous connection image:", removeError.message);
      }
    }

    const { error } = await supabase.storage
      .from(storageBucket)
      .upload(path, editImageFile, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(path);

    return `${publicUrl}?v=${Date.now()}`;
  };

  const handleSaveEdit = async () => {
    if (!editRelationship.trim()) {
      toast({ title: tr("a.67cc34b1cd"), description: tr("a.24ff60cb6a"), variant: "destructive" });
      return;
    }

    if (!connection.person_id && !editName.trim()) {
      toast({ title: tr("a.67cc34b1cd"), description: tr("a.d7659e2c4a"), variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const user = refreshed.session?.user;
      if (refreshError || !user) {
        throw new Error(tr("a.c0ff7bf6d5"));
      }

      if (connection.owner_id && connection.owner_id !== user.id) {
        throw new Error(tr("a.ceb9b75cde"));
      }

      let imageUrl: string | null = null;
      if (editImageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(user.id, connection.image_url);
        setUploadingImage(false);
      }

      const updatePayload: Record<string, unknown> = {
        owner_id: user.id,
        relationship_type: editRelationship.trim(),
        connection_type: editConnectionType,
      };

      if (!connection.person_id) {
        updatePayload.related_person_name = editName.trim();
      }

      if (imageUrl) {
        updatePayload.image_url = imageUrl;
      }

      const { data: updatedConnection, error } = await supabase
        .from("connections")
        .update(updatePayload)
        .eq("id", connection.id)
        .eq("owner_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updatedConnection) {
        throw new Error(tr("a.ceb9b75cde"));
      }

      toast({ title: tr("a.0cc0ffbb78"), description: tr("a.ed73070caa") });
      setShowEditModal(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: tr("a.5f07a37032"), description: error.message, variant: "destructive" });
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
          <SheetTitle>{tr("a.e77c19c11b")}</SheetTitle>
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
              {connection.connection_type === "family" ? tr("a.45f88f670f") : tr("a.75278f4807")}
            </Badge>
            {isDeceased && <Badge variant="secondary" className="bg-muted">{tr("a.79b6788eb8")}</Badge>}
            {!isRegisteredUser && <Badge variant="outline" className="text-xs">{tr("a.047c69ccb5")}</Badge>}
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{tr("a.dc3decbb93")}</h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> {tr("a.9b4a86cba4")}</p>
                <p className="font-medium">{connection.relationship_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{tr("a.3deb745651")}</p>
                <p className="font-medium capitalize">{connection.connection_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {tr("a.b68734c259")}</p>
                <p className="font-medium">{connection.created_at ? format(new Date(connection.created_at), "dd MMM yyyy") : tr("a.bc7819b34f")}</p>
              </div>
              {connection.shared_memory_id && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">{tr("a.555ea2ea39")}</p>
                  <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate(`/post/${connection.shared_memory_id}`)}>
                    {tr("a.127bc88e5c")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tr("a.c3cd636a58")}</h4>

            <Button className="w-full justify-between" variant="outline" onClick={() => setShowEditModal(true)}>
              {tr("a.fd93f6d745")}
              <Pencil className="h-4 w-4" />
            </Button>

            <Button className="w-full justify-between" variant="outline" onClick={() => setShowAddChildModal(true)}>
              {tr("a.f8516b6bc6")}
              <UserPlus className="h-4 w-4" />
            </Button>

            {isRegisteredUser && (
              <>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate(`/profile/${connection.person_id}`)}>
                  {tr("a.685ed0a4a1")}
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate(isDeceased ? `/memorial/${connection.person_id}` : `/timeline/${connection.person_id}`)}>
                  {isDeceased ? tr("a.034aaa38bf") : tr("a.1f450b91c7")}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full justify-between" variant="destructive">
                  {tr("a.80ad279d34")}
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tr("a.80ad279d34")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tr("a.39db6fb24f")} {displayName} {tr("a.2cb91a719e")} {connection.connection_type} {tr("a.507ff4abef")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("a.77dfd2135f")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{tr("a.e963907dac")}</AlertDialogAction>
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
            <DialogTitle>{tr("a.fd93f6d745")}</DialogTitle>
            <DialogDescription>{tr("a.72be1fced9")}</DialogDescription>
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
                {editImageFile ? tr("a.6080b454e5") : tr("a.84f26e4f34")}
              </Button>
            </div>

            {/* Name (non-registered only) */}
            {!connection.person_id && (
              <div className="space-y-2">
                <Label htmlFor="edit-name">{tr("a.709a23220f")}</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={tr("a.5df85959e9")} />
              </div>
            )}

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="edit-relationship">{tr("a.9b4a86cba4")}</Label>
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
                  <SelectValue placeholder={tr("a.d7587196fd")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__family_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60">
                    {tr("a.4efb6cb7c0")}
                  </SelectItem>
                  {familyRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                  <SelectItem value="__friendship_header" disabled className="font-semibold text-xs uppercase tracking-wider opacity-60 mt-2">
                    {tr("a.743dfd77ca")}
                  </SelectItem>
                  {friendshipRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Connection Type */}
            <div className="space-y-2">
              <Label>{tr("a.1d86d4c525")}</Label>
              <Select value={editConnectionType} onValueChange={(v: "family" | "friendship") => setEditConnectionType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">{tr("a.45f88f670f")}</SelectItem>
                  <SelectItem value="friendship">{tr("a.75278f4807")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>{tr("a.77dfd2135f")}</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {uploadingImage ? tr("a.070e328ec8") : savingEdit ? tr("a.ae7e887517") : tr("a.179359b39e")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default ConnectionDetailPanel;