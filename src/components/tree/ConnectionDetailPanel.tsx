import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
    navigate(`/profile/${connection.person_id}`);
  };

  const handleViewTimeline = () => {
    if (connection.profile?.is_deceased) {
      navigate(`/memorial/${connection.person_id}`);
    } else {
      navigate(`/timeline/${connection.person_id}`);
    }
  };

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
                <AvatarImage src={connection.profile?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {connection.profile?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              {connection.profile?.is_deceased && (
                <div className="absolute -top-2 -right-2 text-3xl">🕯️</div>
              )}
            </div>

            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold">
                {connection.profile?.full_name || "Unknown"}
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

            {connection.profile?.is_deceased && (
              <Badge variant="secondary" className="bg-muted">
                In Memoriam
              </Badge>
            )}
          </div>

          <div className="space-y-2">
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
              {connection.profile?.is_deceased ? "View Memorial" : "View Timeline"}
              <ExternalLink className="h-4 w-4" />
            </Button>

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
                    Are you sure you want to remove {connection.profile?.full_name} from your{" "}
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
    </Sheet>
  );
};

export default ConnectionDetailPanel;
