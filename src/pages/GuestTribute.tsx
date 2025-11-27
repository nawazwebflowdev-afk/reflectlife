import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart } from "lucide-react";

interface Connection {
  id: string;
  related_person_name: string;
  relationship_type: string;
  image_url: string | null;
  owner_id: string;
}

const GuestTribute = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [guestName, setGuestName] = useState("");
  const [tributeText, setTributeText] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      
      // In real implementation, validate token against memorial_invitations table
      const { data, error } = await supabase
        .from("memorial_invitations")
        .select(`
          *,
          connection:connection_id(
            id,
            related_person_name,
            relationship_type,
            image_url,
            owner_id
          )
        `)
        .eq("id", token)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        toast({
          title: "Invalid or expired link",
          description: "This invitation link is not valid.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setConnection(data.connection as unknown as Connection);
    } catch (error: any) {
      console.error("Error verifying token:", error);
      toast({
        title: "Error",
        description: "Unable to verify invitation link.",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim() || !tributeText.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create guest tribute record
      const { error } = await supabase
        .from("tributes")
        .insert({
          memorial_id: connection?.id,
          tribute_text: tributeText,
          user_id: null, // Guest tribute
        });

      if (error) throw error;

      toast({
        title: "Tribute submitted 💐",
        description: "Your memory has been shared successfully.",
      });

      // Clear form
      setGuestName("");
      setTributeText("");
      setGuestEmail("");

      // Redirect after success
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error submitting tribute",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Card className="max-w-md mx-4">
          <CardHeader>
            <CardTitle>Link Not Found</CardTitle>
            <CardDescription>
              This invitation link is not valid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {connection.image_url ? (
              <img 
                src={connection.image_url} 
                alt={connection.related_person_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20">
                <Heart className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">
            Share a Memory
          </h1>
          <p className="text-lg text-muted-foreground">
            You've been invited to share a memory of{" "}
            <span className="font-semibold text-foreground">
              {connection.related_person_name}
            </span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave a Tribute</CardTitle>
            <CardDescription>
              Share your memories, thoughts, or condolences. No account required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Your Name *</Label>
                <Input
                  id="guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-email">Your Email (Optional)</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <p className="text-xs text-muted-foreground">
                  We'll only use this to notify you of replies.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tribute-text">Your Memory or Message *</Label>
                <Textarea
                  id="tribute-text"
                  value={tributeText}
                  onChange={(e) => setTributeText(e.target.value)}
                  placeholder="Share your memory, tribute, or condolences..."
                  rows={8}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" />
                    Submit Tribute
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Powered by{" "}
            <a 
              href="/" 
              className="text-primary hover:underline font-medium"
            >
              ReflectLife
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestTribute;
