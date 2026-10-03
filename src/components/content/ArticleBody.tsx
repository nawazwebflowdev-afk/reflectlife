import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import MediaVideo from "./MediaVideo";
import { IMAGES, db, mediaUrl, type Video } from "@/lib/content";

const TOKEN = /<p>\s*\[\[video:([0-9a-f-]{36})\]\]\s*<\/p>|\[\[video:([0-9a-f-]{36})\]\]/g;

/** Renders sanitized article HTML; `[[video:<id>]]` placeholders become video players, storage paths in images become links. */
const ArticleBody = ({ html }: { html: string }) => {
  const parts = useMemo(() => {
    const out: ({ html: string } | { video: string })[] = [];
    let last = 0;
    for (const m of html.matchAll(TOKEN)) {
      out.push({ html: html.slice(last, m.index) });
      out.push({ video: m[1] || m[2] });
      last = m.index! + m[0].length;
    }
    out.push({ html: html.slice(last) });
    return out;
  }, [html]);

  const ids = parts.flatMap((p) => ("video" in p ? [p.video] : []));
  const [videos, setVideos] = useState<Record<string, Video>>({});
  useEffect(() => {
    if (!ids.length) return;
    db("videos").select("*").in("id", ids).then(({ data }: any) => setVideos(Object.fromEntries((data ?? []).map((v: Video) => [v.id, v]))));
  }, [ids.join()]);

  return (
    <div className="article-body space-y-4 leading-relaxed">
      {parts.map((p, i) => "video" in p
        ? videos[p.video] ? <MediaVideo key={i} video={videos[p.video]} /> : null
        : <SafeHtml key={i} html={p.html} />)}
    </div>
  );
};

const SafeHtml = ({ html }: { html: string }) => {
  const [out, setOut] = useState(() => DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }));
  useEffect(() => {
    const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }), "text/html");
    const imgs = Array.from(doc.querySelectorAll("img[src^='storage:']"));
    imgs.forEach((im) => { im.setAttribute("loading", "lazy"); im.setAttribute("decoding", "async"); });
    Promise.all(imgs.map(async (im) => im.setAttribute("src", (await mediaUrl(IMAGES, im.getAttribute("src")!.slice(8))) || ""))).then(() => setOut(doc.body.innerHTML));
  }, [html]);
  return <div dangerouslySetInnerHTML={{ __html: out }} />;
};

export default ArticleBody;
