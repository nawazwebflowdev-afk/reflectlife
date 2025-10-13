import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";

const Memorials = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const memorials = [
    {
      id: "m-001",
      name: "Ada Johnson",
      years: "1948 - 2024",
      location: "Lagos, Nigeria",
      image: portraitPlaceholder,
      tributeCount: 24,
    },
    {
      id: "m-002",
      name: "Robert Chen",
      years: "1952 - 2025",
      location: "Singapore",
      image: portraitPlaceholder,
      tributeCount: 18,
    },
    {
      id: "m-003",
      name: "Maria Rodriguez",
      years: "1965 - 2024",
      location: "Barcelona, Spain",
      image: portraitPlaceholder,
      tributeCount: 32,
    },
  ];

  const filteredMemorials = memorials.filter((memorial) =>
    memorial.name.toLowerCase().includes(searchQuery.toLowerCase())
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

          <Link to="/auth">
            <Button size="lg" className="gap-2 shadow-elegant">
              <Plus className="h-5 w-5" />
              Create a Memorial
            </Button>
          </Link>
        </div>

        {/* Memorials Grid */}
        {filteredMemorials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemorials.map((memorial, index) => (
              <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                <Card 
                  className="overflow-hidden hover:shadow-elegant-lg transition-smooth group animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={memorial.image}
                      alt={memorial.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl font-semibold mb-1">
                      {memorial.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      {memorial.years}
                    </p>
                    <p className="text-muted-foreground text-sm mb-3">
                      {memorial.location}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{memorial.tributeCount} tributes</span>
                    </div>
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
      </div>
    </div>
  );
};

export default Memorials;
