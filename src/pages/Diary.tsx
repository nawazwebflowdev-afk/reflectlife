import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Filter, FileDown, Palette } from "lucide-react";
import DiaryEntryModal from "@/components/DiaryEntryModal";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  entry_date: string;
  created_at: string;
  media_url: string | null;
  favorite_song_url: string | null;
  tags: string[] | null;
  is_private: boolean;
  reactions: Record<string, number>;
}

type DiaryTheme = "nature" | "stars" | "candlelight" | "default";

const THEME_BACKGROUNDS = {
  nature: "linear-gradient(135deg, hsl(140 40% 85%), hsl(120 30% 95%))",
  stars: "linear-gradient(135deg, hsl(240 30% 20%), hsl(260 40% 10%))",
  candlelight: "linear-gradient(135deg, hsl(40 60% 85%), hsl(30 50% 90%))",
  default: "linear-gradient(135deg, hsl(var(--muted) / 0.3), hsl(var(--background)))",
};

const THEME_EMOJIS = {
  nature: "🌿",
  stars: "✨",
  candlelight: "🕯️",
  default: "📖",
};

const Diary = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPrivacy, setFilterPrivacy] = useState<"all" | "private" | "public">("all");
  const [currentTheme, setCurrentTheme] = useState<DiaryTheme>("default");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEntries();
    }
  }, [currentUser]);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, filterPrivacy]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("diary_entries")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading entries",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterPrivacy !== "all") {
      filtered = filtered.filter((entry) =>
        filterPrivacy === "private" ? entry.is_private : !entry.is_private
      );
    }

    setFilteredEntries(filtered);
  };

  const handleReaction = async (entryId: string, emoji: string) => {
    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      const reactions = { ...entry.reactions };
      reactions[emoji] = (reactions[emoji] || 0) + 1;

      const { error } = await (supabase as any)
        .from("diary_entries")
        .update({ reactions })
        .eq("id", entryId);

      if (error) throw error;
      fetchEntries();
      
      toast({
        title: "Reaction added",
        description: `${emoji} reaction added successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding reaction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    toast({
      title: "Export feature",
      description: "PDF export will be available soon!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: THEME_BACKGROUNDS[currentTheme] }}
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 bg-background/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Diary</h1>
              <p className="text-muted-foreground">
                Write your thoughts, memories, and reflections
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={currentTheme} onValueChange={(value: DiaryTheme) => setCurrentTheme(value)}>
                <SelectTrigger className="w-[140px]">
                  <Palette className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">📖 Default</SelectItem>
                  <SelectItem value="nature">🌿 Nature</SelectItem>
                  <SelectItem value="stars">✨ Stars</SelectItem>
                  <SelectItem value="candlelight">🕯️ Candlelight</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => { setSelectedEntry(null); setShowModal(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPrivacy} onValueChange={(value: any) => setFilterPrivacy(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="private">Private Only</SelectItem>
                <SelectItem value="public">Public Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Entries Grid */}
        {filteredEntries.length === 0 ? (
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">{THEME_EMOJIS[currentTheme]}</div>
              <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
              <p className="text-muted-foreground mb-6">
                Start writing your first diary entry
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Write Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEntries.map((entry) => (
              <Card
                key={entry.id}
                className="bg-background/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => { setSelectedEntry(entry); setShowModal(true); }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{entry.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(entry.entry_date), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant={entry.is_private ? "secondary" : "default"}>
                      {entry.is_private ? "🔒 Private" : "🌍 Public"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {entry.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {entry.content}
                    </p>
                  )}
                  {entry.media_url && (
                    <div className="mb-4 rounded-md overflow-hidden">
                      <img
                        src={entry.media_url}
                        alt="Entry media"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {entry.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!entry.is_private && (
                    <div className="flex gap-2 pt-4 border-t">
                      {["❤️", "🕯️", "💬"].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(entry.id, emoji);
                          }}
                          className="flex-1"
                        >
                          {emoji} {entry.reactions?.[emoji] || 0}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DiaryEntryModal
        open={showModal}
        onOpenChange={setShowModal}
        entry={selectedEntry}
        onSaved={fetchEntries}
      />
    </div>
  );
};

export default Diary;
