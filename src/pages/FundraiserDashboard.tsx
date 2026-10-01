import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/dateFormat";
import { formatMoney } from "@/components/donation/MemorialDonations";

type D = { id: string; created_at: string; donor_name: string | null; anonymous: boolean; amount_cents: number; fee_cents: number; net_cents: number; refunded_cents: number; status: string; currency: string; message: string | null; message_hidden: boolean };

export default function FundraiserDashboard() {
  const { t } = useTranslation();
  const { memorialId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [rows, setRows] = useState<D[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate("/login");
    const { data: m } = await supabase.from("memorials").select("id,name,slug,user_id").eq("id", memorialId!).maybeSingle();
    if (!m || m.user_id !== user.id) return navigate("/dashboard");
    setName(m.name); setSlug(m.slug || m.id);
    const { data } = await supabase.from("fundraiser_donations").select("*").eq("memorial_id", m.id).order("created_at", { ascending: false });
    setRows((data as D[]) ?? []); setLoaded(true);
  };
  useEffect(() => { load(); }, [memorialId]);

  const currency = rows[0]?.currency ?? "eur";
  const ok = rows.filter((r) => r.status !== "refunded");
  const sum = (k: "amount_cents" | "fee_cents" | "net_cents") => ok.reduce((a, r) => a + r[k], 0);

  const toggle = async (r: D) => {
    const { error } = await supabase.rpc("set_donation_message_hidden", { _donation_id: r.id, _hidden: !r.message_hidden });
    if (error) return toast.error(error.message);
    load();
  };

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;
    const head = [t("don.date"), t("don.name"), t("don.amount"), t("don.fee"), t("don.net"), "status", t("don.message").replace(/\s*\(.*\)/, "")];
    const lines = rows.map((r) => [r.created_at, r.donor_name ?? "", (r.amount_cents / 100).toFixed(2), (r.fee_cents / 100).toFixed(2), (r.net_cents / 100).toFixed(2), r.status, r.message ?? ""].map(q).join(","));
    const blob = new Blob(["\ufeff" + [head.map(q).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `donations-${slug}.csv`; a.click();
  };

  const openStripe = async () => {
    const { data, error } = await supabase.functions.invoke("fundraiser-connect", { body: { action: "dashboard", memorialId } });
    if (error || !data?.url) return toast.error(data?.error || error?.message);
    window.open(data.url, "_blank", "noopener");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><meta name="robots" content="noindex" /></Helmet>
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("don.dashTitle", { name })}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>{t("don.exportCsv")}</Button>
            <Button variant="outline" onClick={openStripe}>{t("don.stripeDashboard")}</Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {([["don.total", "amount_cents"], ["don.fee", "fee_cents"], ["don.net", "net_cents"]] as const).map(([k, f]) => (
            <Card key={k}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t(k)}</p><p className="text-2xl font-semibold">{formatMoney(sum(f), currency)}</p></CardContent></Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loaded && !rows.length ? <p className="p-6 text-muted-foreground">{t("don.none")}</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>{["don.date", "don.name", "don.amount", "don.fee", "don.net"].map((k) => <th key={k} className="p-3 font-medium">{t(k)}</th>)}<th className="p-3" /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b align-top">
                      <td className="p-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="p-3">{r.donor_name || "—"}{r.anonymous && <span className="text-xs text-muted-foreground"> ({t("don.anon")})</span>}
                        {r.message && <p className={`text-muted-foreground ${r.message_hidden ? "line-through" : ""}`}>{r.message}</p>}</td>
                      <td className="p-3 whitespace-nowrap">{formatMoney(r.amount_cents, r.currency)}{r.status !== "succeeded" && <span className="block text-xs text-destructive">{t("don.refunded")}</span>}</td>
                      <td className="p-3 whitespace-nowrap">{formatMoney(r.fee_cents, r.currency)}</td>
                      <td className="p-3 whitespace-nowrap">{formatMoney(r.net_cents, r.currency)}</td>
                      <td className="p-3">{r.message && <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.message_hidden ? t("don.showMsg") : t("don.hideMsg")}</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Link to={`/memorial/${slug}`} className="text-sm underline text-muted-foreground">{t("don.backToMemorial")}</Link>
      </main>
      <Footer />
    </div>
  );
}
