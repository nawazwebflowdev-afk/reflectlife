import { Link } from "react-router-dom";
import { Heart, Image, Share2, Clock, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/hero-memorial.jpg";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Create a Memorial",
      description: "Design a beautiful, personalized space to honor your loved one's life and legacy.",
    },
    {
      icon: Share2,
      title: "Share Memories",
      description: "Invite family and friends to contribute photos, stories, and tributes together.",
    },
    {
      icon: Clock,
      title: "Keep a Legacy",
      description: "Preserve memories forever in a timeline that celebrates every cherished moment.",
    },
  ];

  const sampleMemorials = [
    {
      id: "m-001",
      name: "Ada Johnson",
      years: "1948 - 2024",
      image: portraitPlaceholder,
      tributeCount: 24,
    },
    {
      id: "m-002",
      name: "Robert Chen",
      years: "1952 - 2025",
      image: portraitPlaceholder,
      tributeCount: 18,
    },
    {
      id: "m-003",
      name: "Maria Rodriguez",
      years: "1965 - 2024",
      image: portraitPlaceholder,
      tributeCount: 32,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground animate-fade-up">
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              A timeless space to celebrate and remember
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-95">
              Reflectlife helps you create beautiful digital memorials to honor those who live on in our hearts. 
              Share stories, preserve memories, and keep legacies alive for generations to come.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 shadow-elegant-lg">
                  Create a Memorial
                </Button>
              </Link>
              <Link to="/memorials">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto text-base px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Explore Memorial Wall
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Honor Their Memory
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to create a meaningful tribute that celebrates a life well-lived
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Memorials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Recent Memorials
            </h2>
            <p className="text-muted-foreground text-lg">
              Celebrating lives and preserving legacies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            {sampleMemorials.map((memorial) => (
              <Link key={memorial.id} to={`/memorial/${memorial.id}`}>
                <Card className="overflow-hidden hover:shadow-elegant-lg transition-smooth group">
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
                    <p className="text-muted-foreground text-sm mb-3">
                      {memorial.years}
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

          <div className="text-center">
            <Link to="/memorials">
              <Button variant="outline" size="lg">
                View All Memorials
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Start Preserving Memories Today
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Create a lasting tribute that honors their story, celebrates their life, and keeps their memory alive forever.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="px-12 shadow-elegant-lg">
                Create a Memorial
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
