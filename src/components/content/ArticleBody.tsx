import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import MediaVideo from "./MediaVideo";
import { db, type Video } from "@/lib/content";

const TOKEN = /<p>\s*\[\[video:([0-9a-f-]{36})\]\]\s*<\/p>|\[\[video:([0-9a-f-]{36})\]\]/g;

/** Renders sanitized article HTML; `[[video:<id>]]` placeholders become video players. */
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

const SafeHtml = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }) }} />
);

export default ArticleBody;
