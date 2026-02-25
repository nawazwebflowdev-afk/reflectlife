import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Upload, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LazyImage } from "@/components/LazyImage";

interface ExistingConnection {
  id: string;
  name: string;
}

interface AddConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionAdded: () => void;
  defaultMode?: "family" | "friendship";
  existingConnections?: ExistingConnection[];
  defaultParentId?: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  country: string;
}

const familyRelationships = [
  "Mother",
  "Father",
  "Parent",
  "Grandmother",
  "Grandfather",
  "Grandparent",
  "Sibling",
  "Spouse",
  "Child",
  "Grandchild",
  "Cousin",
  "Aunt/Uncle",
  "Niece/Nephew",
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

const AddConnectionModal = ({
  open,
  onOpenChange,
  onConnectionAdded,
  defaultMode = "family",
  existingConnections = [],
  defaultParentId = null,
}: AddConnectionModalProps) => {
  const [connectionType, setConnectionType] = useState<"family" | "friendship">(defaultMode);
  const [relationshipType, setRelationshipType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addType, setAddType] = useState<"existing" | "new">("existing");
  const [newPersonName, setNewPersonName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sharedMemories, setSharedMemories] = useState<any[]>([]);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(defaultParentId);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchProfiles();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (open && connectionType === "friendship") {
      fetchSharedMemories();
    }
  }, [open, connectionType]);

  const fetchSharedMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("memorial_posts")
        .select("id, caption, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSharedMemories(data || []);
    } catch (error) {
      console.error("Error fetching memories:", error);
    }
  };

  const searchProfiles = async () => {
    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, country")
        .neq("id", user.id)
        .ilike("full_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data as Profile[]);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Image upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!relationshipType) {
      toast({
        title: "Missing information",
        description: "Please select a relationship type.",
        variant: "destructive",
      });
      return;
    }

    if (addType === "existing" && !selectedPerson) {
      toast({
        title: "Missing information",
        description: "Please select a person.",
        variant: "destructive",
      });
      return;
    }

    if (addType === "new" && !newPersonName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const connectionData: any = {
        owner_id: user.id,
        relationship_type: relationshipType,
        connection_type: connectionType,
        image_url: imageUrl,
        parent_connection_id: selectedParentId || null,
        x_pos: 0,
        y_pos: 0,
      };

      if (addType === "existing" && selectedPerson) {
        connectionData.person_id = selectedPerson.id;
      } else if (addType === "new") {
        connectionData.related_person_name = newPersonName.trim();
      }

      if (connectionType === "friendship" && selectedMemoryId) {
        connectionData.shared_memory_id = selectedMemoryId;
      }

      const { error } = await supabase.from("connections").insert(connectionData);

      if (error) throw error;

      const personName = addType === "existing" ? selectedPerson?.full_name : newPersonName;
      toast({
        title: "Connection added",
        description: `${personName} has been added to your ${connectionType} tree.`,
      });

      onConnectionAdded();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error adding connection",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPerson(null);
    setRelationshipType("");
    setNewPersonName("");
    setImageFile(null);
    setImagePreview("");
    setSelectedMemoryId("");
    setSelectedParentId(null);
    setAddType("existing");
    onOpenChange(false);
  };

  const relationships = connectionType === "family" ? familyRelationships : friendshipRelationships;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
          <DialogDescription>
            Add someone to your {connectionType} tree
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Type</Label>
            <Select
              value={connectionType}
              onValueChange={(value: "family" | "friendship") => {
                setConnectionType(value);
                setRelationshipType("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">🌳 Family</SelectItem>
                <SelectItem value="friendship">🌐 Friendship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={addType} onValueChange={(v) => setAddType(v as "existing" | "new")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Add Existing User</TabsTrigger>
              <TabsTrigger value="new">Add New Person</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Search Person</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {searchResults.length > 0 && !selectedPerson && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setSelectedPerson(profile);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors"
                      >
                        <Avatar>
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback>
                            {profile.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1">
                          <div className="font-medium">{profile.full_name}</div>
                          {profile.country && (
                            <div className="text-sm text-muted-foreground">
                              {profile.country}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPerson && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-accent">
                    <Avatar>
                      <AvatarImage src={selectedPerson.avatar_url} />
                      <AvatarFallback>
                        {selectedPerson.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{selectedPerson.full_name}</div>
                      {selectedPerson.country && (
                        <div className="text-sm text-muted-foreground">
                          {selectedPerson.country}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPerson(null)}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Person's Name</Label>
                <Input
                  placeholder="Enter full name..."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Profile Picture (Optional)</Label>
                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                    <LazyImage 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Label>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship..." />
              </SelectTrigger>
              <SelectContent>
                {relationships.map((rel) => (
                  <SelectItem key={rel} value={rel}>
                    {rel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Node Selector for hierarchical structure */}
          {existingConnections.length > 0 && (
            <div className="space-y-2">
              <Label>Add Under (Parent Connection)</Label>
              <Select 
                value={selectedParentId || "root"} 
                onValueChange={(value) => setSelectedParentId(value === "root" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent node..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    👤 Directly connected to me
                  </SelectItem>
                  {existingConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      └ {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose who this person is connected to in your tree
              </p>
            </div>
          )}

          {connectionType === "friendship" && sharedMemories.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Shared Memory (Optional)</Label>
              <Select value={selectedMemoryId} onValueChange={setSelectedMemoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a memory..." />
                </SelectTrigger>
                <SelectContent>
                  {sharedMemories.map((memory) => (
                    <SelectItem key={memory.id} value={memory.id}>
                      {memory.caption || `Memory from ${new Date(memory.created_at).toLocaleDateString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImage || !relationshipType}>
              {loading || uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {uploadingImage ? "Uploading..." : "Adding..."}
                </>
              ) : (
                "Add Connection"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddConnectionModal;
