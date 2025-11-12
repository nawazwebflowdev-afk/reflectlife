import { useState } from "react";
import { Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const DeleteAccountModal = ({ open, onOpenChange, userId }: DeleteAccountModalProps) => {
  const [reason, setReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      // Delete all user data first
      // Due to foreign key constraints with ON DELETE CASCADE, deleting the profile
      // will cascade to related tables
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Sign out the user - this will also trigger auth cleanup
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted. We hope Reflectlife brought comfort and connection along the way.",
        duration: 5000,
      });

      navigate("/");
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-12 w-12 text-destructive" />
          </div>
          <DialogTitle className="text-center text-2xl">
            We're sorry to see you go 💔
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Would you like to share why you're leaving? (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for leaving (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Tell us what we could improve..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium mb-2">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-xs text-muted-foreground">
              All your memorials, diary entries, timelines, and personal data will be permanently deleted.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountModal;
