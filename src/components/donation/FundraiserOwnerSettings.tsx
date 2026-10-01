import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { HeartHandshake } from "lucide-react";

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

/** Owner-only "Donations" card. Always rendered for the owner, even when donations are off. */
export function FundraiserOwnerSettings({ memorialId, isDefender, onChange }: { memorialId: string; isDefender: boolean; onChange: () => void }) {
  const { t, i18n } = useTranslation();
  const [f, setF] = useState<F>({ enabled: false, recipient_type: "private", recipient_name: "", recipient_email: "", country: "", external_url: "", show_totals: false });
  const [mode, setMode] = useState<"stripe" | "external">("stripe");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const regionNames = new Intl.DisplayNames([i18n.language], { type: "region" });

  const load = async () => {
    const { data } = await supabase.from("memorial_fundraisers").select("*").eq("memorial_id", memorialId).maybeSingle();
    if (data) { setF(data as F); setMode(data.external_url ? "external" : "stripe"); }
  };
  useEffect(() => { load(); }, [memorialId]);

  const save = async (patch: Partial<F> = {}) => {
    const next = { ...f, ...patch };
    const ext = mode === "external" ? (next.external_url || "").trim() : "";
    if (mode === "external" && next.enabled && !/^https:\/\/[^\s]+$/i.test(ext)) return toast.error(t("don.externalUrl"));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true);
    const payload = {
      memorial_id: memorialId, owner_id: user.id, enabled: next.enabled, recipient_type: next.recipient_type,
      recipient_name: next.recipient_name?.trim().slice(0, 80) || null, recipient_email: next.recipient_email?.trim().slice(0, 254) || null,
      country: next.country || null, external_url: ext || null, show_totals: next.show_totals,
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

  const ready = !!(f.charges_enabled && f.payouts_enabled);
  const stripeStatus = !f.stripe_account_id ? t("don.notConnected") : ready ? t("don.active") : t("don.waiting");

  return (
    <Card className="shadow-elegant" aria-labelledby="owner-donations-title">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="owner-donations-title" className="text-xl font-semibold flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" /> {t("don.cardTitle")}
          </h2>
          <label className="flex items-center gap-3 text-sm font-medium">
            {t("don.collect")}
            <Switch checked={f.enabled} disabled={busy} onCheckedChange={(v) => { setF({ ...f, enabled: v }); save({ enabled: v }); }} />
          </label>
        </div>
        {f.admin_paused && <p className="text-sm text-destructive">{t("don.paused")}</p>}

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "stripe" | "external")} className="grid gap-3 md:grid-cols-2">
          <label className={`border rounded-lg p-4 cursor-pointer space-y-1 ${mode === "stripe" ? "border-primary" : ""}`}>
            <span className="flex items-center gap-2 font-medium"><RadioGroupItem value="stripe" /> {t("don.optStripe")}</span>
            <span className="block text-xs text-muted-foreground">{t("don.optStripeHint")}</span>
            <span className="block text-xs">{t("don.status")}: <Badge variant={ready ? "default" : "outline"}>{stripeStatus}</Badge></span>
          </label>
          <label className={`border rounded-lg p-4 cursor-pointer space-y-1 ${mode === "external" ? "border-primary" : ""}`}>
            <span className="flex items-center gap-2 font-medium"><RadioGroupItem value="external" /> {t("don.optExternal")}</span>
            <span className="block text-xs text-muted-foreground">{t("don.optExternalHint")}</span>
          </label>
        </RadioGroup>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>{t("don.recipientName")}</Label><Input value={f.recipient_name ?? ""} maxLength={80} onChange={(e) => setF({ ...f, recipient_name: e.target.value })} /></div>
          <div>
            <Label className="mb-1 block">{t("don.recipientType")}</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.recipient_type} onChange={(e) => setF({ ...f, recipient_type: e.target.value })}>
              <option value="private">{t("don.rtPrivate")}</option>
              <option value="company">{t("don.rtCompany")}</option>
              <option value="charity">{t("don.rtCharity")}</option>
            </select>
          </div>
        </div>

        {mode === "external" ? (
          <div className="space-y-1">
            <Label>{t("don.externalUrl")}</Label>
            <Input placeholder="https://" value={f.external_url ?? ""} onChange={(e) => setF({ ...f, external_url: e.target.value })} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{t("don.recipientEmail")}</Label><Input type="email" value={f.recipient_email ?? ""} onChange={(e) => setF({ ...f, recipient_email: e.target.value })} /></div>
            <div>
              <Label className="mb-1 block">{t("don.country")}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60" value={f.country ?? ""} disabled={!!f.stripe_account_id} onChange={(e) => setF({ ...f, country: e.target.value })}>
                <option value="">—</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{regionNames.of(c)}</option>)}
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t("don.showTotals")}</span>
          <Switch checked={f.show_totals} onCheckedChange={(v) => setF({ ...f, show_totals: v })} />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save()} disabled={busy}>{t("don.save")}</Button>
          {f.id && <Button variant="ghost" asChild><Link to={`/fundraiser-dashboard/${memorialId}`}>{t("don.dashboard")}</Link></Button>}
        </div>

        {mode === "stripe" && f.id && !f.external_url && (
          <div className="border-t pt-4 space-y-3">
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
        <p className="text-xs text-muted-foreground">
          {isDefender || mode === "external" ? t("don.feeNoneDefender") : t("don.feeNote", { fee: 7 })}
        </p>
      </CardContent>
    </Card>
  );
}
