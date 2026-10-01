import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/dateFormat";
import { formatMoney } from "@/components/donation/MemorialDonations";

type Row = { id: string; memorial_id: string; recipient_name: string | null; recipient_type: string; enabled: boolean; admin_paused: boolean; charges_enabled: boolean; payouts_enabled: boolean; external_url: string | null; currency: string | null; memorials: { name: string; slug: string | null } | null };
type Don = { fundraiser_id: string; amount_cents: number; fee_cents: number; status: string; currency: string };
type Rep = { id: string; memorial_id: string; reason: string; reporter_email: string | null; created_at: string; resolved: boolean };

export default function AdminFundraisers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [dons, setDons] = useState<Don[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [fee, setFee] = useState("7");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate("/login");
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return navigate("/dashboard");
    const [f, d, r, s] = await Promise.all([
      supabase.from("memorial_fundraisers").select("*, memorials(name,slug)").order("created_at", { ascending: false }),
      supabase.from("fundraiser_donations").select("fundraiser_id,amount_cents,fee_cents,status,currency"),
      supabase.from("fundraiser_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("value").eq("key", "donation_fee_percent").maybeSingle(),
    ]);
    setRows((f.data as unknown as Row[]) ?? []); setDons((d.data as Don[]) ?? []); setReps((r.data as Rep[]) ?? []);
    if (s.data) setFee(String(s.data.value));
  };
  useEffect(() => { load(); }, []);

  const totals = (id?: string) => dons.filter((d) => d.status !== "refunded" && (!id || d.fundraiser_id === id)).reduce((a, d) => ({ gross: a.gross + d.amount_cents, fee: a.fee + d.fee_cents }), { gross: 0, fee: 0 });
  const all = totals();

  const saveFee = async () => {
    const n = Number(fee);
    if (!Number.isFinite(n) || n < 0 || n >= 50) return toast.error(t("don.feeSetting"));
    const { error } = await supabase.from("platform_settings").update({ value: n, updated_at: new Date().toISOString() }).eq("key", "donation_fee_percent");
    error ? toast.error(error.message) : toast.success(t("don.saved"));
  };
  const pause = async (r: Row, v: boolean) => {
    const { error } = await supabase.from("memorial_fundraisers").update({ admin_paused: v }).eq("id", r.id);
    error ? toast.error(error.message) : load();
  };
  const resolve = async (id: string) => { await supabase.from("fundraiser_reports").update({ resolved: true }).eq("id", id); load(); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><meta name="robots" content="noindex" /></Helmet>
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl space-y-6">
        <h1 className="text-2xl font-semibold">{t("don.adminTitle")}</h1>
        <div className="grid sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t("don.total")}</p><p className="text-2xl font-semibold">{formatMoney(all.gross, "eur")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t("don.feesEarned")}</p><p className="text-2xl font-semibold">{formatMoney(all.fee, "eur")}</p></CardContent></Card>
          <Card><CardContent className="p-4 space-y-2"><p className="text-sm text-muted-foreground">{t("don.feeSetting")}</p>
            <div className="flex gap-2"><Input value={fee} onChange={(e) => setFee(e.target.value)} className="w-24" inputMode="decimal" /><Button onClick={saveFee}>{t("don.save")}</Button></div></CardContent></Card>
        </div>
        <p className="text-xs text-muted-foreground">{t("don.refundHint")}</p>
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b"><tr>
              <th className="p-3">Memorial</th><th className="p-3">{t("don.recipientName")}</th><th className="p-3">Status</th><th className="p-3">{t("don.total")}</th><th className="p-3">{t("don.fee")}</th><th className="p-3">{t("don.pause")}</th>
            </tr></thead>
            <tbody>{rows.map((r) => { const x = totals(r.id); const c = r.currency || "eur"; return (
              <tr key={r.id} className="border-b">
                <td className="p-3"><Link className="underline" to={`/memorial/${r.memorials?.slug || r.memorial_id}`}>{r.memorials?.name ?? r.memorial_id}</Link></td>
                <td className="p-3">{r.recipient_name || "—"} <span className="text-xs text-muted-foreground">({r.recipient_type})</span></td>
                <td className="p-3 text-xs">{r.external_url ? "external" : r.charges_enabled && r.payouts_enabled ? "verified" : "pending"}{!r.enabled && " · off"}</td>
                <td className="p-3">{formatMoney(x.gross, c)}</td>
                <td className="p-3">{formatMoney(x.fee, c)}</td>
                <td className="p-3"><Switch checked={r.admin_paused} onCheckedChange={(v) => pause(r, v)} /></td>
              </tr>); })}</tbody>
          </table>
        </CardContent></Card>
        <h2 className="text-xl font-semibold">{t("don.reports")}</h2>
        <div className="space-y-2">
          {reps.map((r) => (
            <Card key={r.id} className={r.resolved ? "opacity-60" : ""}><CardContent className="p-4 flex justify-between gap-4">
              <div className="text-sm"><p className="text-muted-foreground">{formatDate(r.created_at)} · {r.reporter_email || "—"} · <Link className="underline" to={`/memorial/${r.memorial_id}`}>memorial</Link></p><p className="whitespace-pre-wrap">{r.reason}</p></div>
              {!r.resolved && <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>✓</Button>}
            </CardContent></Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
