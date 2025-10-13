import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, Heart, MessageCircle, Image as ImageIcon, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";
import timelineBg from "@/assets/timeline-bg.jpg";

const Memorial = () => {
  const { id } = useParams();
  const [likeCount, setLikeCount] = useState(24);
  const [isLiked, setIsLiked] = useState(false);

  // Sample memorial data
  const memorial = {
    id: "m-001",
    name: "Ada Johnson",
    birthDate: "February 12, 1948",
    deathDate: "September 5, 2024",
    location: "Lagos, Nigeria",
    portraitUrl: portraitPlaceholder,
    bio: "Ada was a loving mother, devoted teacher, and pillar of her community. She touched countless lives with her warmth, wisdom, and unwavering kindness.",
  };

  const timeline = [
    {
      id: "t-001",
      date: "June 10, 1968",
      type: "photo",
      title: "Graduation Day",
      text: "Ada at her university graduation, ready to change the world through education.",
      mediaUrl: portraitPlaceholder,
    },
    {
      id: "t-002",
      date: "November 1, 1990",
      type: "diary",
      title: "A Note to Family",
      text: "Remember to always laugh together. Life is precious, and the moments we share with loved ones are what truly matter. Cherish each day and find joy in the simple things.",
    },
  ];

  const tributes = [
    {
      id: "tr-001",
      author: "Samuel Johnson",
      date: "2 days ago",
      text: "Mom, your love and guidance continue to inspire us every day. You taught us the meaning of kindness and compassion. We miss you deeply.",
    },
  ];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative h-[400px] flex items-end"
        style={{
          backgroundImage: `url(${timelineBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="relative container mx-auto px-4 pb-8">
          <div className="flex flex-col md:flex-row items-end gap-6">
            {/* Portrait */}
            <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-background shadow-elegant-lg flex-shrink-0">
              <img
                src={memorial.portraitUrl}
                alt={memorial.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-grow pb-2">
              <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2 text-foreground">
                {memorial.name}
              </h1>
              <p className="text-lg text-muted-foreground mb-3">
                {memorial.birthDate} – {memorial.deathDate}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{memorial.location}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                {likeCount}
              </Button>
              <Link to={`/memorial/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Bio */}
        {memorial.bio && (
          <Card className="mb-8 shadow-elegant">
            <CardContent className="p-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {memorial.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tributes">
              Tributes ({tributes.length})
            </TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline" className="space-y-6">
            {timeline.length > 0 ? (
              timeline.map((entry) => (
                <Card key={entry.id} className="shadow-elegant hover:shadow-elegant-lg transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {entry.type === "photo" ? (
                          <ImageIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <MessageCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{entry.date}</span>
                        </div>
                        <h3 className="font-serif text-xl font-semibold mb-2">
                          {entry.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">{entry.text}</p>
                        
                        {entry.mediaUrl && (
                          <div className="rounded-lg overflow-hidden max-w-md">
                            <img
                              src={entry.mediaUrl}
                              alt={entry.title}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    No memories yet. Start by adding a story, photo, or video — small details keep memories alive.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tributes */}
          <TabsContent value="tributes" className="space-y-6">
            {tributes.map((tribute) => (
              <Card key={tribute.id} className="shadow-elegant">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent font-semibold">
                        {tribute.author.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{tribute.author}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{tribute.date}</span>
                      </div>
                      <p className="text-muted-foreground">{tribute.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-2 border-dashed">
              <CardContent className="p-6 text-center">
                <Button className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Share a Memory
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery">
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No photos yet</p>
                <Button variant="outline">Add Photos</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Memorial;
