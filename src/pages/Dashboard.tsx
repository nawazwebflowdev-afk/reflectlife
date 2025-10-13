import { Link } from "react-router-dom";
import { Plus, Calendar, Eye, Settings, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";

const Dashboard = () => {
  const memorials = [
    {
      id: "m-001",
      name: "Ada Johnson",
      years: "1948 - 2024",
      image: portraitPlaceholder,
      views: 142,
      tributeCount: 24,
      lastUpdated: "2 days ago",
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Memorials</h1>
              <p className="text-muted-foreground">Manage and update your memorial pages</p>
            </div>
            <Link to="/memorial/new">
              <Button size="lg" className="gap-2 shadow-elegant">
                <Plus className="h-5 w-5" />
                Create New Memorial
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-up">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Memorials</CardDescription>
              <CardTitle className="text-3xl font-serif">{memorials.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Views</CardDescription>
              <CardTitle className="text-3xl font-serif">142</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Tributes</CardDescription>
              <CardTitle className="text-3xl font-serif">24</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Memorials List */}
        <div className="space-y-4">
          {memorials.length > 0 ? (
            memorials.map((memorial) => (
              <Card key={memorial.id} className="hover:shadow-elegant transition-smooth">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image */}
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={memorial.image}
                        alt={memorial.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-grow">
                      <h3 className="font-serif text-2xl font-semibold mb-1">
                        {memorial.name}
                      </h3>
                      <p className="text-muted-foreground mb-3">{memorial.years}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{memorial.views} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          <span>{memorial.tributeCount} tributes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Updated {memorial.lastUpdated}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link to={`/memorial/${memorial.id}`}>
                          <Button variant="default" size="sm">
                            View Memorial
                          </Button>
                        </Link>
                        <Link to={`/memorial/${memorial.id}/edit`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center py-16">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3">
                    No Memorials Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first memorial to start preserving precious memories and celebrating the lives of your loved ones.
                  </p>
                  <Link to="/memorial/new">
                    <Button size="lg" className="gap-2">
                      <Plus className="h-5 w-5" />
                      Create Your First Memorial
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
