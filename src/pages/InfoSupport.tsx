import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { infoPagesTable } from "@/lib/info";

const InfoSupport = () => {
  const [page, setPage] = useState<{ title: string; body: string } | null>(null);
  useEffect(() => { infoPagesTable().select("title, body").eq("key", "support").maybeSingle().then(({ data }: any) => setPage(data)); }, []);
  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-4">
      <Helmet><title>{`${page?.title || "Support"} | Reflectlife`}</title></Helmet>
      <h1 className="font-serif text-3xl font-bold">{page?.title || "Support"}</h1>
      {page && <div className="space-y-3 leading-relaxed"><ReactMarkdown>{page.body}</ReactMarkdown></div>}
    </div>
  );
};

export default InfoSupport;
