import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Users, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateMemorialModal from "@/components/CreateMemorialModal";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import { format } from "date-fns";

interface Memorial {
  id: string;
  name: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  location: string | null;
  preview_image_url: string | null;
  bio: string | null;
}

const Memorials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchMemorials();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchMemorials = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('memorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemorials(data || []);
    } catch (error: any) {
      console.error('Error fetching memorials:', error);
      toast({
        title: "Error loading memorials",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const formatYears = (dob: string | null, dod: string | null) => {
    const birthYear = dob ? format(new Date(dob), 'yyyy') : '?';
    const deathYear = dod ? format(new Date(dod), 'yyyy') : '?';
    return `${birthYear} - ${deathYear}`;
  };

  const filteredMemorials = memorials.filter((memorial) =>
    memorial.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memorial.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Memorial Wall
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Celebrating lives and preserving legacies. Browse memorials or create one for your loved one.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, location, or date..."
                className="pl-10 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Button size="lg" className="gap-2 shadow-elegant" onClick={handleCreateClick}>
            <Plus className="h-5 w-5" />
            Create a Memorial
          </Button>
        </div>

        {/* Memorials Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredMemorials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemorials.map((memorial, index) => (
              <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                <Card 
                  className="overflow-hidden hover:shadow-elegant-lg transition-smooth group animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={memorial.preview_image_url || portraitPlaceholder}
                      alt={memorial.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl font-semibold mb-1">
                      {memorial.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      {formatYears(memorial.date_of_birth, memorial.date_of_death)}
                    </p>
                    {memorial.location && (
                      <p className="text-muted-foreground text-sm mb-3">
                        {memorial.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16 max-w-2xl mx-auto">
            <CardContent>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3">
                No Results Found
              </h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find any memorials matching "{searchQuery}". Try a different search term or create a new memorial.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Memorial Modal */}
        <CreateMemorialModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onMemorialCreated={fetchMemorials}
        />
      </div>
    </div>
  );
};

export default Memorials;
