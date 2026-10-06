import { supabase } from "@/integrations/supabase/client";

export type InfoItem = {
  id: string;
  item_type: "video" | "guide";
  title: string;
  slug: string;
  category: "know" | "remember" | "rituals" | "reflectlife";
  languages: string[];
  tags: string[];
  description: string | null;
  body: string | null;
  video_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  caption_url: string | null;
  duration_seconds: number | null;
  ai_assisted: boolean;
  featured: boolean;
  status: "draft" | "published" | "scheduled";
  publish_at: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type InfoPage = {
  key: string;
  title: string;
  body: string;
  updated_at: string;
};

export const INFO_CATEGORIES = ["know", "remember", "rituals", "reflectlife"] as const;
export const INFO_LANGS = ["en", "es", "de", "uk"] as const;

/** Turns a title into a stable, URL-safe slug. */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Extracts a YouTube video id from the common link shapes, or null. */
export const youtubeId = (url?: string | null): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
};

/** Poster image for a YouTube link — used when the admin left the thumbnail empty. */
export const videoThumb = (url?: string | null): string | null => {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};

/** True when the URL points straight at a video file rather than a page to embed. */
export const isDirectVideoUrl = (url?: string | null): boolean =>
  !!url && /^https?:\/\/.+\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url.trim());

/** Converts a shared YouTube / Vimeo / TikTok / Instagram link into an embeddable one. */
export const toEmbedUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return null;

  const yt = youtubeId(u);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  const tt = u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;

  const ig = u.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/i);
  if (ig) return `https://www.instagram.com/p/${ig[1]}/embed`;

  return null;
};

/**
 * Wraps a plain-text transcript in WebVTT. The whole clip becomes a single cue —
 * good enough for a readable transcript on screen and for search engines.
 */
export const transcriptToVtt = (transcript: string, durationSeconds = 3600): string => {
  const safe = transcript.replace(/\r\n/g, "\n").trim();
  const end = Math.max(1, Math.floor(durationSeconds));
  return `WEBVTT\n\n00:00:00.000 --> 00:${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}.000\n${safe}\n`;
};

/** 63 -> "1:03", 603 -> "10:03" */
export const formatDuration = (s: number | null): string | null => {
  if (!s || s <= 0) return null;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

export const infoTable = () => (supabase as any).from("info_board_items") as any;

export const infoPagesTable = () => (supabase as any).from("info_pages") as any;
