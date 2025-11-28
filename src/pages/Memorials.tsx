import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Users, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useTemplateBackground } from "@/hooks/useTemplateBackground";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { LazyImage } from "@/components/LazyImage";
import { MemorialSkeleton } from "@/components/MemorialSkeleton";
import CreateMemorialModal from "@/components/CreateMemorialModal";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import timelineBg from "@/assets/timeline-bg.jpg";
import { format } from "date-fns";

interface Memorial {
  id: string;
  name: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  location: string | null;
  preview_image_url: string | null;
  bio: string | null;
  user_id: string;
  profiles?: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

const MEMORIALS_PER_PAGE = 12;

const Memorials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { backgroundUrl: purchasedBackground } = useTemplateBackground();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchMemorials = async (pageNum: number): Promise<Memorial[]> => {
    const from = (pageNum - 1) * MEMORIALS_PER_PAGE;
    const to = from + MEMORIALS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('memorials')
      .select(`
        id,
        name,
        date_of_birth,
        date_of_death,
        location,
        preview_image_url,
        bio,
        user_id,
        profiles:user_id (
          full_name,
          first_name,
          last_name
        )
      `)
      .eq('is_public', true)
      .eq('privacy_level', 'public')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    // Handle profiles array from Supabase join
    return (data || []).map(memorial => ({
      ...memorial,
      profiles: Array.isArray(memorial.profiles) && memorial.profiles.length > 0 
        ? memorial.profiles[0] 
        : null
    }));
  };

  const { data: memorials = [], isLoading, isFetching, error: memorialsError, refetch } = useQuery({
    queryKey: ['memorials', page],
    queryFn: () => fetchMemorials(page),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const loadMore = useCallback(() => {
    if (!isFetching && memorials.length === page * MEMORIALS_PER_PAGE) {
      setPage((prev) => prev + 1);
    }
  }, [isFetching, memorials.length, page]);

  const loadMoreRef = useInfiniteScroll({
    loading: isFetching,
    hasMore: memorials.length === page * MEMORIALS_PER_PAGE,
    onLoadMore: loadMore,
  });

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

  const backgroundImage = purchasedBackground || timelineBg;

  return (
    <div className="min-h-screen">
      {/* Hero Header with Template Background */}
      <section 
        className="relative h-[400px] flex items-center transition-smooth"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: purchasedBackground ? "blur(10px)" : "none",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" style={{ filter: "none" }} />
        
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4 text-premium-plum-foreground drop-shadow-lg animate-fade-in">
            Memorial Wall
          </h1>
          <div className="w-32 h-1 bg-premium-plum-foreground mx-auto mb-4 rounded-full" />
          <p className="text-lg md:text-xl text-premium-plum-foreground/90 max-w-2xl mx-auto mb-8 drop-shadow-md">
            Celebrating lives and preserving legacies. Browse memorials or create one for your loved one.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, location, or date..."
                className="pl-10 h-12 bg-background/90 backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Create Memorial Button */}
          <Button 
            onClick={handleCreateClick}
            size="lg"
            className="gap-2 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Create a Memorial
          </Button>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Memorials Grid */}
        {isLoading && page === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <MemorialSkeleton key={i} />
            ))}
          </div>
        ) : memorialsError ? (
          <Card className="text-center py-16 max-w-2xl mx-auto">
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">Failed to load memorials</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filteredMemorials.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMemorials.map((memorial, index) => (
              <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                <Card 
                  className="overflow-hidden hover:shadow-elegant-lg transition-smooth group animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <LazyImage
                      src={memorial.preview_image_url || portraitPlaceholder}
                      alt={memorial.name}
                      fallback={portraitPlaceholder}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                      containerClassName="w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1">
                      {memorial.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      {formatYears(memorial.date_of_birth, memorial.date_of_death)}
                    </p>
                    {memorial.location && (
                      <p className="text-muted-foreground text-sm mb-2">
                        📍 {memorial.location}
                      </p>
                    )}
                    {memorial.profiles && (
                      <p className="text-xs text-muted-foreground/80 mt-2">
                        Added by {memorial.profiles.full_name || 
                          `${memorial.profiles.first_name || ''} ${memorial.profiles.last_name || ''}`.trim() || 
                          'Anonymous'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
              ))}
            </div>
            
            {/* Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="py-8">
              {isFetching && (
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading more memorials...</p>
                </div>
              )}
            </div>
          </>
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
          onMemorialCreated={refetch}
        />
      </div>
    </div>
  );
};

export default Memorials;
