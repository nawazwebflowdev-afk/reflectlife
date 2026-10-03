import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = { accept: string; label: string; progress: number | null; error?: string | null; onFile: (f: File) => void; children?: React.ReactNode };

/** Drag & drop file zone with progress bar and inline errors. */
const DropUpload = ({ accept, label, progress, error, onFile, children }: Props) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <button type="button" onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm text-muted-foreground transition-smooth ${over ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}>
        {children ?? <Upload className="h-5 w-5" />}
        <span>{t("cms.dropHere")}</span>
      </button>
      <input ref={ref} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {progress !== null && <Progress value={progress} aria-label={`${progress}%`} />}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
};

export default DropUpload;
