import { supabase } from "@/integrations/supabase/client";

export type InfoItem = {
  id: string; item_type: "video" | "guide"; title: string; slug: string; category: string;
  languages: string[]; tags: string[]; description: string | null; body: string | null;
  video_url: string | null; embed_url: string | null; thumbnail_url: string | null; thumbnail_alt: string | null;
  caption_url: string | null; duration_seconds: number | null; ai_assisted: boolean; featured: boolean;
  status: "draft" | "published" | "scheduled"; publish_at: string; created_at: string;
};

export const INFO_CATEGORIES = ["know", "remember", "rituals", "reflectlife"] as const;
export const INFO_LANGS = ["en", "es", "de", "uk"] as const;

// Typed loosely because the generated database types may lag behind new tables.
export const infoTable = () => (supabase as any).from("info_items");
export const infoPagesTable = () => (supabase as any).from("info_pages");

export const formatDuration = (s: number | null) =>
  s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Converts TikTok / Instagram / YouTube page links into embeddable player URLs. */
export const toEmbedUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (h.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.match(/\/(shorts|embed)\/([^/?]+)/)?.[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (h.endsWith("tiktok.com")) {
      const id = u.pathname.match(/video\/(\d+)/)?.[1];
      return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
    }
    if (h.endsWith("instagram.com")) {
      const m = u.pathname.match(/\/(p|reel|reels|tv)\/([^/?]+)/);
      return m ? `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed` : null;
    }
  } catch { /* invalid url */ }
  return null;
};

/** Builds a WebVTT caption track from plain transcript text, spreading sentences over the duration. */
export const transcriptToVtt = (text: string, duration: number): string => {
  const parts = text.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
  const total = parts.reduce((n, p) => n + p.length, 0) || 1;
  const ts = (s: number) => new Date(s * 1000).toISOString().slice(11, 23);
  let t = 0;
  return "WEBVTT\n\n" + parts.map((p) => {
    const d = (p.length / total) * duration;
    const cue = `${ts(t)} --> ${ts(t + d)}\n${p}`;
    t += d;
    return cue;
  }).join("\n\n");
};
