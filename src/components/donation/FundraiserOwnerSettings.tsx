import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ChevronDown, Settings2 } from "lucide-react";

type F = {
  id?: string; enabled: boolean; recipient_type: string; recipient_name: string | null; recipient_email: string | null;
  country: string | null; external_url: string | null; show_totals: boolean; stripe_account_id?: string | null;
  charges_enabled?: boolean; payouts_enabled?: boolean; admin_paused?: boolean;
};

// Common Stripe Express countries; anything else → external link.
const COUNTRIES = ["AT","AU","BE","BG","CA","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GR","HR","HU","IE","IT","LT","LU","LV","MT","MX","NL","NO","NZ","PL","PT","RO","SE","SI","SK","US"];

const invokeError = async (error: any, data: any) => {
  let msg = data?.error || error?.message;
  try { msg = (await error?.context?.json())?.error || msg; } catch { /* ignore */ }
  return msg;
};

export function FundraiserOwnerSettings({ memorialId, isDefender, onChange }: { memorialId: string; isDefender: boolean; onChange: () => void }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<F>({ enabled: false, recipient_type: "private", recipient_name: "", recipient_email: "", country: "", external_url: "", show_totals: false });
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const regionNames = new Intl.DisplayNames([i18n.language], { type: "region" });

  const load = async () => {
    const { data } = await supabase.from("memorial_fundraisers").select("*").eq("memorial_id", memorialId).maybeSingle();
    if (data) setF(data as F);
  };
  useEffect(() => { load(); }, [memorialId]);

  const save = async () => {
    const ext = (f.external_url || "").trim();
    if (ext && !/^https:\/\/[^\s]+$/i.test(ext)) return toast.error(t("don.externalUrl"));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true);
    const payload = {
      memorial_id: memorialId, owner_id: user.id, enabled: f.enabled, recipient_type: f.recipient_type,
      recipient_name: f.recipient_name?.trim().slice(0, 80) || null, recipient_email: f.recipient_email?.trim().slice(0, 254) || null,
      country: f.country || null, external_url: ext || null, show_totals: f.show_totals,
    };
    const { error } = await supabase.from("memorial_fundraisers").upsert(payload, { onConflict: "memorial_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("don.saved"));
    await load(); onChange();
  };

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("fundraiser-connect", { body: { action, memorialId, lang: i18n.language, ...extra } });
    setBusy(false);
    if (error || data?.error) { toast.error(await invokeError(error, data)); return null; }
    return data;
  };

  const ready = f.charges_enabled && f.payouts_enabled;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <button type="button" className="w-full flex items-center justify-between font-medium" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> {t("don.ownerTitle")}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-4 space-y-5">
            <label className="flex items-center justify-between gap-3">
              <span>{t("don.enable")}</span>
              <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
            </label>

            <div>
              <Label className="mb-2 block">{t("don.recipientType")}</Label>
              <RadioGroup value={f.recipient_type} onValueChange={(v) => setF({ ...f, recipient_type: v })} className="grid sm:grid-cols-3 gap-2">
                {[["private", "don.rtPrivate"], ["company", "don.rtCompany"], ["charity", "don.rtCharity"]].map(([v, k]) => (
                  <label key={v} className="flex items-center gap-2 border rounded-md p-2 cursor-pointer text-sm">
                    <RadioGroupItem value={v} /> {t(k)}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>{t("don.recipientName")}</Label><Input value={f.recipient_name ?? ""} maxLength={80} onChange={(e) => setF({ ...f, recipient_name: e.target.value })} /></div>
              <div><Label>{t("don.recipientEmail")}</Label><Input type="email" value={f.recipient_email ?? ""} onChange={(e) => setF({ ...f, recipient_email: e.target.value })} /></div>
              <div>
                <Label>{t("don.country")}</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  value={f.country ?? ""} disabled={!!f.stripe_account_id}
                  onChange={(e) => setF({ ...f, country: e.target.value })}
                >
                  <option value="">—</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{regionNames.of(c)}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span>{t("don.showTotals")}</span>
              <Switch checked={f.show_totals} onCheckedChange={(v) => setF({ ...f, show_totals: v })} />
            </label>

            <div className="space-y-1">
              <Label>{t("don.externalTitle")}</Label>
              <p className="text-xs text-muted-foreground">{t("don.externalHint")}</p>
              <Input placeholder={t("don.externalUrl")} value={f.external_url ?? ""} onChange={(e) => setF({ ...f, external_url: e.target.value })} />
            </div>

            <Button onClick={save} disabled={busy}>{t("don.save")}</Button>

            {f.id && !f.external_url && (
              <div className="border-t pt-4 space-y-3">
                <p className={`text-sm font-medium ${ready ? "text-primary" : "text-muted-foreground"}`}>
                  {ready ? t("don.verified") : t("don.waiting")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!ready && (
                    <Button variant="outline" disabled={busy || !f.country} onClick={async () => { const d = await call("onboard"); if (d?.url) window.location.assign(d.url); }}>
                      {t("don.startOnboarding")}
                    </Button>
                  )}
                  {f.stripe_account_id && (
                    <Button variant="ghost" disabled={busy} onClick={async () => { await call("status"); await load(); onChange(); }}>{t("don.refresh")}</Button>
                  )}
                  {ready && (
                    <Button variant="outline" disabled={busy} onClick={async () => { const d = await call("dashboard"); if (d?.url) window.open(d.url, "_blank", "noopener"); }}>
                      {t("don.stripeDashboard")}
                    </Button>
                  )}
                  <Button variant="ghost" asChild><Link to={`/fundraiser-dashboard/${memorialId}`}>{t("don.dashboard")}</Link></Button>
                </div>
                {!ready && (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[200px]"><Label>{t("don.emailLinkTo")}</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
                    <Button variant="outline" disabled={busy || !inviteEmail || !f.country} onClick={async () => { const d = await call("email_link", { email: inviteEmail }); if (d?.sent) toast.success(t("don.emailSent")); }}>
                      {t("don.emailLink")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isDefender && <p className="text-xs text-muted-foreground">{t("don.feeNoneDefender")}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
