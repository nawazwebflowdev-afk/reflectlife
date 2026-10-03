import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { IMAGES, VIDEOS, mediaUrl, type Video } from "@/lib/content";

/** Shows the poster first; the video only loads and plays after a click (never autoplays with sound). */
const MediaVideo = ({ video, className = "" }: { video: Video; className?: string }) => {
  const [poster, setPoster] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { mediaUrl(IMAGES, video.poster_image).then(setPoster); }, [video.poster_image]);

  const start = async () => {
    const [s, c] = await Promise.all([mediaUrl(VIDEOS, video.video_file), mediaUrl(VIDEOS, video.captions_file)]);
    setSrc(s); setCaptions(c); setPlaying(true);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-muted aspect-video ${className}`}>
      {playing && src ? (
        <video controls autoPlay playsInline poster={poster || undefined} className="h-full w-full bg-foreground object-contain" crossOrigin="anonymous">
          <source src={src} type="video/mp4" />
          {captions && <track kind="captions" src={captions} srcLang="en" label="Captions" default />}
        </video>
      ) : (
        <button type="button" onClick={start} className="group absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Play: ${video.title}`}>
          {poster && <img src={poster} alt="" loading="lazy" decoding="async" width={1280} height={720} className="h-full w-full object-cover" />}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-smooth group-hover:bg-foreground/30">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-primary shadow-lg"><Play className="h-7 w-7 translate-x-0.5" /></span>
          </span>
        </button>
      )}
    </div>
  );
};

export default MediaVideo;
