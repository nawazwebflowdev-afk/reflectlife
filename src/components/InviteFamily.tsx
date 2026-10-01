import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Send, Phone, Mail, Link2 } from "lucide-react";
import { track } from "@/lib/analytics";

type Channel = "whatsapp" | "telegram" | "viber" | "email" | "copy";

interface Props { memorialId: string; memorialSlug?: string | null; memorialName: string; onDone?: () => void; showSkip?: boolean }

/** "Invite your family" step: share buttons with an editable message. Each press is logged for the owner. */
export function InviteFamily({ memorialId, memorialSlug, memorialName, onDone, showSkip }: Props) {
  const { t } = useTranslation();
  const url = `https://reflectlife.net/memorial/${memorialSlug || memorialId}`;
  const [msg, setMsg] = useState(() => t("nov.inviteDefault", { name: memorialName, url }));
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from("memorial_invite_events").select("id", { count: "exact", head: true }).eq("memorial_id", memorialId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [memorialId]);

  const log = async (channel: Channel) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("memorial_invite_events").insert({ memorial_id: memorialId, owner_id: user.id, channel });
    if (!error) setCount((c) => c + 1);
    track("Family Invited", { channel });
  };

  const text = msg.includes(url) ? msg : `${msg} ${url}`;
  const links: { ch: Channel; label: string; href: string; icon: JSX.Element }[] = [
    { ch: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, icon: <MessageCircle className="h-4 w-4" /> },
    { ch: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg.replace(url, "").trim())}`, icon: <Send className="h-4 w-4" /> },
    { ch: "viber", label: "Viber", href: `viber://forward?text=${encodeURIComponent(text)}`, icon: <Phone className="h-4 w-4" /> },
    { ch: "email", label: t("nov.email"), href: `mailto:?subject=${encodeURIComponent(memorialName)}&body=${encodeURIComponent(text)}`, icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-xl font-semibold">{t("nov.inviteTitle")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("nov.inviteText")}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-msg">{t("nov.inviteMessage")}</Label>
        <Textarea id="invite-msg" rows={3} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Button key={l.ch} variant="outline" asChild>
            <a href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => log(l.ch)}>{l.icon}<span className="ml-2">{l.label}</span></a>
          </Button>
        ))}
        <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(text); toast.success(t("nov.inviteCopied")); log("copy"); }}>
          <Link2 className="h-4 w-4" /><span className="ml-2">{t("nov.copyLink")}</span>
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("nov.inviteSent", { count })}</p>
        {onDone && <Button variant={showSkip ? "ghost" : "default"} onClick={onDone}>{showSkip && count === 0 ? t("nov.inviteSkip") : t("nov.inviteDone")}</Button>}
      </div>
    </div>
  );
}
