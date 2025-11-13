import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

interface ConnectionDetailPanelProps {
  connection: any;
  onClose: () => void;
  onUpdate: () => void;
}

const ConnectionDetailPanel = ({
  connection,
  onClose,
  onUpdate,
}: ConnectionDetailPanelProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddChildModal, setShowAddChildModal] = useState(false);

  if (!connection) return null;

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connection.id);

      if (error) throw error;

      toast({
        title: "Connection removed",
        description: "The connection has been removed from your tree.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error removing connection",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewProfile = () => {
    if (connection.person_id) {
      navigate(`/profile/${connection.person_id}`);
    }
  };

  const handleViewTimeline = () => {
    if (connection.person_id) {
      if (connection.profile?.is_deceased) {
        navigate(`/memorial/${connection.person_id}`);
      } else {
        navigate(`/timeline/${connection.person_id}`);
      }
    }
  };

  const displayName = connection.person_id 
    ? (connection.profile?.full_name || "Unknown")
    : (connection.related_person_name || "Unknown");
  const avatarUrl = connection.person_id 
    ? (connection.profile?.avatar_url || "/placeholder.svg")
    : (connection.image_url || "/placeholder.svg");
  const isRegisteredUser = !!connection.person_id;
  const isDeceased = connection.person_id && connection.profile?.is_deceased;

  return (
    <Sheet open={!!connection} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Connection Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {displayName[0] || "?"}
                </AvatarFallback>
              </Avatar>
              {isDeceased && (
                <div className="absolute -top-2 -right-2 text-3xl">🕯️</div>
              )}
            </div>

            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold">
                {displayName}
              </h3>
              {connection.profile?.country && (
                <p className="text-sm text-muted-foreground mt-1">
                  {connection.profile.country}
                </p>
              )}
            </div>

            <Badge variant="secondary" className="text-sm">
              {connection.relationship_type}
            </Badge>

            <Badge
              variant={connection.connection_type === "family" ? "default" : "outline"}
            >
              {connection.connection_type === "family" ? "🌳 Family" : "🌐 Friendship"}
            </Badge>

            {isDeceased && (
              <Badge variant="secondary" className="bg-muted">
                In Memoriam
              </Badge>
            )}

            {!isRegisteredUser && (
              <Badge variant="outline" className="text-xs">
                Not registered on ReflectLife
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Button
              className="w-full justify-between"
              variant="outline"
              onClick={() => setShowAddChildModal(true)}
            >
              Add Connection to This Person
              <UserPlus className="h-4 w-4" />
            </Button>

            {isRegisteredUser && (
              <>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={handleViewProfile}
                >
                  View Profile
                  <ExternalLink className="h-4 w-4" />
                </Button>

                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={handleViewTimeline}
                >
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
                    Are you sure you want to remove {displayName} from your{" "}
                    {connection.connection_type} tree? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {connection.shared_memory_id && connection.connection_type === "friendship" && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Shared Memory</p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate(`/post/${connection.shared_memory_id}`)}
              >
                View Shared Memory
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <AddChildConnectionModal
        open={showAddChildModal}
        onOpenChange={setShowAddChildModal}
        parentConnectionId={connection.id}
        onUpdate={onUpdate}
      />
    </Sheet>
  );
};

export default ConnectionDetailPanel;
