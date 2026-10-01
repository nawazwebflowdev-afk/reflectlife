import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

const safe = (s: string) => s.replace(/[^\p{L}\p{N}\- _]/gu, "").trim().slice(0, 60) || "memorial";

/** Builds a ZIP in the browser with the user's memorials, memories, diary and photos. */
export function DownloadMyData() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const zip = new JSZip();
      const [{ data: profile }, { data: memorials }, { data: diary }, { data: myTributes }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("memorials").select("*").eq("user_id", user.id),
        supabase.from("diary_entries").select("*").eq("user_id", user.id),
        supabase.from("tributes" as any).select("*").eq("user_id", user.id),
      ]);
      zip.file("profile.json", JSON.stringify(profile, null, 2));
      zip.file("diary.json", JSON.stringify(diary ?? [], null, 2));
      zip.file("my-memories-on-other-memorials.json", JSON.stringify(myTributes ?? [], null, 2));
      for (const m of memorials ?? []) {
        const dir = zip.folder(`memorials/${safe(m.name)}-${m.id.slice(0, 6)}`)!;
        const [{ data: media }, { data: tributes }, { data: entries }] = await Promise.all([
          supabase.from("memorial_media").select("*").eq("memorial_id", m.id),
          supabase.from("tributes" as any).select("*").eq("memorial_id", m.id),
          supabase.from("memorial_entries").select("*").eq("timeline_id", m.id),
        ]);
        dir.file("memorial.json", JSON.stringify(m, null, 2));
        dir.file("memories.json", JSON.stringify({ tributes: tributes ?? [], entries: entries ?? [] }, null, 2));
        const urls = [m.preview_image_url, ...(media ?? []).map((x) => x.media_url)].filter(Boolean) as string[];
        const photos = dir.folder("photos")!;
        await Promise.all([...new Set(urls)].map(async (u, i) => {
          try {
            const r = await fetch(u);
            if (!r.ok) return;
            const ext = (u.split("?")[0].split(".").pop() || "jpg").slice(0, 5);
            photos.file(`${String(i + 1).padStart(3, "0")}.${ext}`, await r.blob());
          } catch { /* skip unreachable photo */ }
        }));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `reflectlife-data-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(t("nov.exportDone"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("nov.exportText")}</p>
      <Button variant="outline" onClick={run} disabled={busy}>
        {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("nov.exporting")}</> : t("nov.exportButton")}
      </Button>
    </div>
  );
}

/** Owner email switches (both on by default). */
export function OwnerNotificationSettings() {
  const { t } = useTranslation();
  const [uid, setUid] = useState<string | null>(null);
  const [s, setS] = useState({ new_memory_email: true, weekly_summary_email: true });
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUid(user.id);
      const { data } = await supabase.from("owner_notification_settings").select("new_memory_email,weekly_summary_email").eq("user_id", user.id).maybeSingle();
      if (data) setS(data);
    });
  }, []);
  const save = async (k: keyof typeof s, v: boolean) => {
    if (!uid) return;
    const next = { ...s, [k]: v };
    setS(next);
    await supabase.from("owner_notification_settings").upsert({ user_id: uid, ...next, updated_at: new Date().toISOString() });
  };
  return (
    <Card className="shadow-elegant">
      <CardHeader><div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><CardTitle>{t("nov.notifTitle")}</CardTitle></div></CardHeader>
      <CardContent className="space-y-4">
        {(["new_memory_email", "weekly_summary_email"] as const).map((k) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <Label htmlFor={k} className="font-normal">{t(k === "new_memory_email" ? "nov.notifNewMemory" : "nov.notifWeekly")}</Label>
            <Switch id={k} checked={s[k]} onCheckedChange={(v) => save(k, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
