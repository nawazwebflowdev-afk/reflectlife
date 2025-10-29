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
import { Search, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AddConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionAdded: () => void;
  defaultMode?: "family" | "friendship";
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  country: string;
}

const familyRelationships = [
  "Parent",
  "Sibling",
  "Spouse",
  "Child",
  "Grandparent",
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
}: AddConnectionModalProps) => {
  const [connectionType, setConnectionType] = useState<"family" | "friendship">(defaultMode);
  const [relationshipType, setRelationshipType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchProfiles();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchProfiles = async () => {
    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, country")
        .neq("id", user.id)
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data as Profile[]);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPerson || !relationshipType) {
      toast({
        title: "Missing information",
        description: "Please select a person and relationship type.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("connections").insert({
        owner_id: user.id,
        person_id: selectedPerson.id,
        relationship_type: relationshipType,
        connection_type: connectionType,
      });

      if (error) throw error;

      toast({
        title: "Connection added",
        description: `${selectedPerson.full_name} has been added to your ${connectionType} tree.`,
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
    onOpenChange(false);
  };

  const relationships = connectionType === "family" ? familyRelationships : friendshipRelationships;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
                      <div className="text-sm text-muted-foreground">
                        {profile.email}
                      </div>
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
                  <div className="text-sm text-muted-foreground">
                    {selectedPerson.email}
                  </div>
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPerson || !relationshipType}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
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
