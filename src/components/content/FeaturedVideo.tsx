import { useEffect, useState } from "react";
import { db, type Video } from "@/lib/content";
import MediaVideo from "./MediaVideo";

/** Calm homepage section showing the admin's featured video, if any. */
const FeaturedVideo = () => {
  const [video, setVideo] = useState<Video | null>(null);
  useEffect(() => {
    db("videos").select("*").eq("status", "published").eq("featured", true).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => setVideo(data));
  }, []);
  if (!video) return null;
  return (
    <section className="py-16">
      <div className="container mx-auto max-w-4xl px-4 grid gap-6 md:grid-cols-[3fr_2fr] md:items-center">
        <MediaVideo video={video} />
        <div className="space-y-2">
          <h2 className="font-serif text-2xl md:text-3xl font-bold">{video.title}</h2>
          {video.description && <p className="text-muted-foreground leading-relaxed">{video.description}</p>}
        </div>
      </div>
    </section>
  );
};

export default FeaturedVideo;
