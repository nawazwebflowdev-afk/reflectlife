import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, ImageIcon, Film } from "lucide-react";
import { IMAGES, toWebp, uploadWithProgress, type Video } from "@/lib/content";
import { supabase } from "@/integrations/supabase/client";

type Props = { value: string; onChange: (html: string) => void; videos: Video[]; onError: (m: string) => void };

const RichEditor = ({ value, onChange, videos, onError }: Props) => {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }), Image],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "article-body min-h-[260px] rounded-b-md border border-t-0 border-input bg-background p-3 focus:outline-none" } },
  });

  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value || ""); }, [editor, value]);
  if (!editor) return null;

  const btn = (active: boolean) => `rounded p-1.5 ${active ? "bg-primary/15 text-primary" : "hover:bg-muted"}`;
  const addLink = () => {
    const url = window.prompt("Link URL", editor.getAttributes("link").href || "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else if (/^(https?:|mailto:|\/)/.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      try {
        const path = await uploadWithProgress(IMAGES, await toWebp(f), "webp");
        // Long-lived link so the image keeps working inside saved article text.
        const { data } = await supabase.storage.from(IMAGES).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (data?.signedUrl) editor.chain().focus().setImage({ src: data.signedUrl, alt: f.name.replace(/\.[^.]+$/, "") }).run();
      } catch (e: any) { onError(e.message); }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-input bg-muted/40 p-1">
        <button type="button" aria-label="Heading 2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></button>
        <button type="button" aria-label="Heading 3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></button>
        <button type="button" aria-label="Bold" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
        <button type="button" aria-label="Italic" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
        <button type="button" aria-label="Bullet list" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
        <button type="button" aria-label="Numbered list" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" aria-label="Quote" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></button>
        <button type="button" aria-label="Link" className={btn(editor.isActive("link"))} onClick={addLink}><Link2 className="h-4 w-4" /></button>
        <button type="button" aria-label="Image" className={btn(false)} onClick={addImage}><ImageIcon className="h-4 w-4" /></button>
        <label className="ml-1 flex items-center gap-1 text-xs"><Film className="h-4 w-4" />
          <select className="rounded border border-input bg-background p-1 text-xs" value="" aria-label="Embed video"
            onChange={(e) => e.target.value && editor.chain().focus().insertContent(`<p>[[video:${e.target.value}]]</p>`).run()}>
            <option value="">Video…</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichEditor;
