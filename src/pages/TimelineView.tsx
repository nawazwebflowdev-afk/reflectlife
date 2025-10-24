import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddMemoryModal } from "@/components/AddMemoryModal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Calendar, FileText, Image as ImageIcon, Plus, Video } from "lucide-react";

interface Timeline {
  id: string;
  title: string;
  description: string | null;
  background_url: string | null;
  user_id: string;
}

interface Entry {
  id: string;
  content_type: "photo" | "video" | "note";
  content_url: string | null;
  caption: string | null;
  event_date: string | null;
  created_at: string;
}

const TimelineView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    fetchTimeline();
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
    }
  };

  const fetchTimeline = async () => {
    if (!id) return;

    try {
      const { data: timelineData, error: timelineError } = await supabase
        .from("memorial_timelines")
        .select("*")
        .eq("id", id)
        .single();

      if (timelineError) throw timelineError;
      setTimeline(timelineData);

      const { data: entriesData, error: entriesError } = await supabase
        .from("memorial_entries")
        .select("*")
        .eq("timeline_id", id)
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load timeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = timeline && userId && timeline.user_id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading timeline...</p>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Timeline not found</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div
        className="relative h-[400px] bg-gradient-subtle flex items-center justify-center"
        style={
          timeline.background_url
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${timeline.background_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute top-6 left-6">
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 bg-background/80 backdrop-blur-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-center text-white z-10">
          <h1 className="font-serif text-5xl font-bold mb-4">{timeline.title}</h1>
          {timeline.description && (
            <p className="text-xl max-w-2xl mx-auto">{timeline.description}</p>
          )}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-3xl font-bold">Timeline Memories</h2>
            {canEdit && (
              <Button onClick={() => setShowAddMemory(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Memory
              </Button>
            )}
          </div>

          {entries.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3">No Memories Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start adding photos, videos, and notes to create a beautiful timeline.
                  </p>
                  {canEdit && (
                    <Button onClick={() => setShowAddMemory(true)} className="gap-2">
                      <Plus className="h-5 w-5" />
                      Add Your First Memory
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {entries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-elegant transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Date Column */}
                      <div className="flex-shrink-0 w-24 text-center">
                        {entry.event_date && (
                          <>
                            <div className="text-3xl font-bold text-primary">
                              {format(new Date(entry.event_date), "dd")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(entry.event_date), "MMM yyyy")}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-grow">
                        {/* Type Icon */}
                        <div className="flex items-center gap-2 mb-3">
                          {entry.content_type === "photo" && (
                            <ImageIcon className="h-5 w-5 text-primary" />
                          )}
                          {entry.content_type === "video" && (
                            <Video className="h-5 w-5 text-primary" />
                          )}
                          {entry.content_type === "note" && (
                            <FileText className="h-5 w-5 text-primary" />
                          )}
                          <span className="text-sm text-muted-foreground capitalize">
                            {entry.content_type}
                          </span>
                        </div>

                        {/* Media */}
                        {entry.content_url && entry.content_type === "photo" && (
                          <img
                            src={entry.content_url}
                            alt={entry.caption || "Memory"}
                            className="w-full max-w-lg rounded-lg mb-4"
                          />
                        )}
                        {entry.content_url && entry.content_type === "video" && (
                          <video
                            src={entry.content_url}
                            controls
                            className="w-full max-w-lg rounded-lg mb-4"
                          />
                        )}

                        {/* Caption */}
                        {entry.caption && (
                          <p className="text-foreground leading-relaxed">{entry.caption}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <AddMemoryModal
          open={showAddMemory}
          onOpenChange={setShowAddMemory}
          timelineId={id!}
          userId={userId}
          onMemoryAdded={fetchTimeline}
        />
      )}
    </div>
  );
};

export default TimelineView;
