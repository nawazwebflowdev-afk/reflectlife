import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HeartHandshake, ExternalLink, Flag } from "lucide-react";
import { appLocale, formatDate } from "@/lib/dateFormat";
import { FundraiserOwnerSettings } from "./FundraiserOwnerSettings";

type Summary = {
  currency: string; donor_count: number; enabled: boolean; external_url: string | null; fee_percent: number;
  paused: boolean; ready: boolean; recipient_name: string | null; recipient_type: string; show_totals: boolean;
  test_mode: boolean; total_raised_cents: number;
};
type Donor = { id: string; donor_name: string | null; message: string | null; created_at: string };

const PRESETS = [10, 25, 50, 100];
const MIN = 5;

export const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat(appLocale(), { style: "currency", currency: (currency || "eur").toUpperCase() }).format(cents / 100);

interface Props { memorialId: string; memorialName: string; isOwner: boolean; isDefender: boolean }

export function MemorialDonations({ memorialId, memorialName, isOwner, isDefender }: Props) {
  const { t, i18n } = useTranslation();
  const [s, setS] = useState<Summary | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [preset, setPreset] = useState<number | null>(25);
  const [custom, setCustom] = useState("");
  const [cover, setCover] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportEmail, setReportEmail] = useState("");

  const load = async () => {
    const { data } = await supabase.rpc("get_memorial_fundraiser", { _memorial_id: memorialId });
    const row = (data as Summary[] | null)?.[0] ?? null;
    setS(row);
    if (row?.enabled) {
      const { data: d } = await supabase.rpc("get_memorial_donors", { _memorial_id: memorialId, _limit: 30 });
      setDonors((d as Donor[]) ?? []);
    }
  };
  useEffect(() => { load(); }, [memorialId]);

  const amount = custom ? Number(custom.replace(",", ".")) : preset ?? 0;
  const fee = (s?.fee_percent ?? 0) / 100;
  const charge = useMemo(() => {
    const cents = Math.round(amount * 100);
    return cover && fee > 0 ? Math.ceil(cents / (1 - fee)) : cents;
  }, [amount, cover, fee]);
  const currency = s?.currency || "eur";
  const recipient = s?.recipient_name || memorialName;
  const valid = Number.isFinite(amount) && amount >= MIN && amount <= 25000;

  const donate = async () => {
    if (!valid) return toast.error(t("don.minimum", { min: formatMoney(MIN * 100, currency) }));
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-fundraiser-checkout", {
      body: { memorialId, amount, coverFees: cover, donorName: name, message, anonymous: anon, lang: i18n.language },
    });
    if (error || !data?.url) {
      setBusy(false);
      let msg = data?.error || error?.message;
      try { msg = (await (error as any)?.context?.json())?.error || msg; } catch { /* ignore */ }
      return toast.error(msg);
    }
    window.location.assign(data.url);
  };

  const sendReport = async () => {
    const { data, error } = await supabase.functions.invoke("report-fundraiser", { body: { memorialId, reason, email: reportEmail } });
    if (error || data?.error) return toast.error(data?.error || error?.message);
    toast.success(t("don.reportThanks"));
    setReportOpen(false); setReason("");
  };

  const visible = s?.enabled && (s.ready || s.external_url);

  return (
    <section id="donations" className="mt-10 space-y-4" aria-labelledby="donations-title">
      {isOwner && <FundraiserOwnerSettings memorialId={memorialId} isDefender={isDefender} onChange={load} />}

      {s?.enabled && s.paused && !isOwner && null}
      {visible && !s!.paused && (
        <Card className="shadow-elegant">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="donations-title" className="text-xl font-semibold flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-primary" /> {t("don.title")}
                </h2>
                <p className="text-muted-foreground mt-1">{t("don.goesTo", { name: recipient })}</p>
              </div>
              {s!.test_mode && !s!.external_url && <Badge variant="outline" className="border-destructive text-destructive">{t("don.testMode")}</Badge>}
            </div>

            {s!.show_totals && (
              <p className="font-medium">{t("don.raised", { amount: formatMoney(s!.total_raised_cents, currency), count: s!.donor_count })}</p>
            )}

            {s!.ready ? (
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">{t("don.amount")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <Button key={p} type="button" variant={!custom && preset === p ? "default" : "outline"} onClick={() => { setPreset(p); setCustom(""); }}>
                        {formatMoney(p * 100, currency)}
                      </Button>
                    ))}
                    <Input
                      className="w-36" inputMode="decimal" placeholder={t("don.custom")} aria-label={t("don.custom")}
                      value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 8))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("don.minimum", { min: formatMoney(MIN * 100, currency) })}</p>
                </div>

                {fee > 0 && (
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox checked={cover} onCheckedChange={(v) => setCover(v === true)} className="mt-0.5" />
                    <span>
                      {t("don.cover", { name: recipient })}
                      {valid && <span className="ml-2 font-medium text-primary">{t("don.coverExtra", { extra: formatMoney(Math.ceil(Math.round(amount * 100) / (1 - fee)) - Math.round(amount * 100), currency) })}</span>}
                    </span>
                  </label>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder={t("don.yourName")} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label={t("don.yourName")} />
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox checked={anon} onCheckedChange={(v) => setAnon(v === true)} className="mt-0.5" />
                    <span>{t("don.anonymous")}<span className="block text-xs text-muted-foreground">{t("don.anonymousHint")}</span></span>
                  </label>
                </div>
                <div>
                  <Textarea placeholder={t("don.message")} value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} aria-label={t("don.message")} rows={2} />
                  <p className="text-xs text-muted-foreground text-right">{message.length}/300</p>
                </div>

                <Button size="lg" className="w-full sm:w-auto" disabled={busy || !valid} onClick={donate}>
                  {busy ? t("don.redirecting") : t("don.donate", { amount: valid ? formatMoney(charge, currency) : "" })}
                </Button>
              </div>
            ) : (
              <Button asChild size="lg" variant="outline">
                <a href={s!.external_url!} target="_blank" rel="noopener noreferrer nofollow">
                  {t("don.openExternal")} <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{s!.ready ? (fee > 0 ? t("don.feeNote", { fee: s!.fee_percent }) : t("don.feeNoneDefender")) : t("don.feeNoneExternal")}</p>
              {s!.recipient_type === "charity" && <p>{t("don.charityNote")}</p>}
            </div>

            {donors.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">{t("don.supporters")}</h3>
                <ul className="space-y-2">
                  {donors.map((d) => (
                    <li key={d.id} className="text-sm">
                      <span className="font-medium">{d.donor_name || t("don.anon")}</span>
                      <span className="text-muted-foreground"> · {formatDate(d.created_at)}</span>
                      {d.message && <p className="text-muted-foreground">{d.message}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-3">
              {!reportOpen ? (
                <button type="button" className="text-xs text-muted-foreground underline inline-flex items-center gap-1" onClick={() => setReportOpen(true)}>
                  <Flag className="h-3 w-3" /> {t("don.report")}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("don.reportTitle")}</p>
                  <Textarea placeholder={t("don.reportReason")} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} rows={3} />
                  <Input type="email" placeholder={t("don.reportEmail")} value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} />
                  <Button size="sm" variant="outline" disabled={reason.trim().length < 5} onClick={sendReport}>{t("don.reportSend")}</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {s?.enabled && s.paused && isOwner && <p className="text-sm text-muted-foreground">{t("don.paused")}</p>}
    </section>
  );
}
