import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export type Article = {
  id: string; title: string; slug: string; excerpt: string | null; body: string | null; cover_image: string | null;
  video_id: string | null; category: string | null; status: "draft" | "published"; publish_date: string;
  seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string;
};
export type Video = {
  id: string; title: string; description: string | null; video_file: string | null; poster_image: string | null;
  duration: number | null; captions_file: string | null; status: "draft" | "published"; featured: boolean; created_at: string;
};
export type Category = { id: string; name: string; sort_order: number };

export const IMAGES = "marketing-images";
export const VIDEOS = "marketing-videos";
export const VIDEO_WARN_MB = 100;

// Loosely typed because generated database types may lag behind new tables.
export const db = (t: "articles" | "videos" | "content_categories") => (supabase as any).from(t);

const cache = new Map<string, Promise<string | null>>();
/** Files live in private buckets that anyone may read; we hand out week-long signed links. */
export const mediaUrl = (bucket: string, path: string | null | undefined): Promise<string | null> => {
  if (!path) return Promise.resolve(null);
  if (/^https?:/.test(path)) return Promise.resolve(path);
  const key = `${bucket}/${path}`;
  if (!cache.has(key)) {
    cache.set(key, supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7).then(({ data }) => data?.signedUrl ?? null));
  }
  return cache.get(key)!;
};

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Uploads with a progress callback (the SDK upload has no progress events). */
export const uploadWithProgress = async (bucket: string, file: Blob, ext: string, onProgress?: (pct: number) => void) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText || "{}").message || `Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
  return path;
};

/** Resizes and compresses an image to WebP in the browser. */
export const toWebp = async (file: File, maxW = 1600): Promise<Blob> => {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxW / img.width);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("Image conversion failed"))), "image/webp", 0.82));
};

export const useIsAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return !!data;
};
