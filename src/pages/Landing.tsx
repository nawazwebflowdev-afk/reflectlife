import { Link } from "react-router-dom";
import { Heart, Share2, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroBanner from "@/assets/hero-banner.png";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Create a Memorial",
      description: "Build a personal page with photos, stories, and videos.",
    },
    {
      icon: Share2,
      title: "Celebrate a Journey",
      description: "Share life's special moments with family and friends.",
    },
    {
      icon: Clock,
      title: "Keep Their Legacy Alive",
      description: "Honor and remember, anywhere and anytime.",
    },
  ];

  const testimonials = [
    {
      quote: "Reflectlife gave us a beautiful way to celebrate my mother's life. It's comforting to have all our memories in one place.",
      name: "Sarah M.",
      image: portraitPlaceholder,
    },
    {
      quote: "A truly special space where our family can come together and share stories about Dad. It means everything to us.",
      name: "Michael T.",
      image: portraitPlaceholder,
    },
    {
      quote: "Creating a memorial was so easy, and it's become a place of peace for us all. Thank you for this gift.",
      name: "Linda K.",
      image: portraitPlaceholder,
    },
    {
      quote: "Reflectlife helped us keep grandma's memory alive in such a meaningful way. We visit it often.",
      name: "James R.",
      image: portraitPlaceholder,
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
      {/* Hero Banner */}
      <section className="relative w-full">
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
          <img
            src={heroBanner}
            alt="Reflectlife floral memorial banner"
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
          
          {/* Centered text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg animate-fade-in">
              Remember your loved ones
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-8 md:mb-10 max-w-2xl drop-shadow-md animate-fade-in" style={{ animationDelay: '200ms' }}>
              Begin a journey of remembrance — for the ones who will always be part of you
            </p>
            <Link to="/auth">
              <Button size="lg" className="px-8 md:px-12 py-6 text-base md:text-lg shadow-elegant-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
                Start remembering today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About / How It Works Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Keeping memories alive, together
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Reflectlife is a warm space to preserve and share stories of your loved ones — a place where memories, moments, and legacies live on forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-2 hover:shadow-elegant transition-smooth hover:-translate-y-1 bg-card animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              What families say about Reflectlife
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="bg-card/50 border-2 hover:shadow-elegant transition-smooth animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-4 bg-muted">
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover opacity-60"
                      />
                    </div>
                    <p className="text-muted-foreground italic mb-4 leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <p className="font-serif font-semibold text-foreground">
                      — {testimonial.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
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
