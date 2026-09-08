import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HeartHandshake, Loader2, Users, Building2, User, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";

type Campaign = {
  id: string;
  memory_wall_id: string;
  organizer_user_id: string;
  beneficiary_name: string;
  charity_organization_name: string | null;
  story: string | null;
  target_goal_amount: number;
  currency: string;
  status: "active" | "paused" | "completed" | "closed";
};

type Supporter = {
  id: string;
  donor_name: string;
  donor_type: "private" | "company";
  gross_amount: number;
  condolence_message: string | null;
  created_at: string;
};

type DonorType = "private" | "company";
const FEE_RATES: Record<DonorType, number> = { private: 0.025, company: 0.03 };
const PRESETS = [25, 50, 100];

interface Props {
  memorialId: string;
  memorialName: string;
  isOwner: boolean;
  previewImage?: string | null;
}

function money(v: number, currency = "EUR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
}

export default function DonateInMemory({ memorialId, memorialName, isOwner, previewImage }: Props) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [totals, setTotals] = useState({ raised: 0, donors: 0 });
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  // Donation form
  const [recurring, setRecurring] = useState(false);
  const [preset, setPreset] = useState<number | "custom">(50);
  const [custom, setCustom] = useState("");
  const [donorType, setDonorType] = useState<DonorType>("private");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [notify, setNotify] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Organizer setup form
  const [beneficiary, setBeneficiary] = useState(memorialName ? `Family of ${memorialName}` : "");
  const [charity, setCharity] = useState("");
  const [goal, setGoal] = useState("1000");
  const [story, setStory] = useState("");
  const [orgAccepted, setOrgAccepted] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c } = await supabase
      .from("memorial_campaigns")
      .select("*")
      .eq("memory_wall_id", memorialId)
      .maybeSingle();
    setCampaign((c as Campaign) ?? null);
    if (c) {
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.rpc("get_campaign_public_summary", { _campaign_id: c.id }),
        supabase.rpc("get_campaign_public_donations", { _campaign_id: c.id, _limit: 10 }),
      ]);
      const row = Array.isArray(s) ? s[0] : s;
      setTotals({ raised: Number(row?.total_raised ?? 0), donors: Number(row?.donor_count ?? 0) });
      setSupporters((d as Supporter[]) ?? []);
    }
    setLoading(false);
  }, [memorialId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata as Record<string, string> | undefined;
      if (meta?.full_name) setDonorName(meta.full_name);
    });
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const amount = preset === "custom" ? Number(custom.replace(",", ".")) : preset;
  const validAmount = Number.isFinite(amount) && amount >= 1 && amount <= 50000;
  const fee = validAmount ? Math.round(amount * FEE_RATES[donorType] * 100) / 100 : 0;
  const net = validAmount ? Math.round((amount - fee) * 100) / 100 : 0;
  const currency = campaign?.currency ?? "EUR";
  const pct = campaign ? Math.min(100, Math.round((totals.raised / Number(campaign.target_goal_amount || 1)) * 100)) : 0;

  const canSubmit = validAmount && accepted && (userEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) && !(recurring && !userId);

  const handleDonate = async () => {
    if (!campaign || !canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          campaign_id: campaign.id,
          amount,
          donor_type: donorType,
          recurring,
          is_anonymous: anonymous,
          notify_organizer: notify,
          donor_name: donorName,
          donor_email: userEmail ?? donorEmail,
          condolence_message: message,
          accepted_terms: accepted,
        },
      });
      const url = (data as any)?.url;
      const err = error?.message || (data as any)?.error;
      if (err || !url) { toast.error(err || "Could not start checkout"); return; }
      window.location.href = url;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!userId) { toast.error("Please sign in"); return; }
    const g = Number(goal);
    if (!beneficiary.trim()) { toast.error("Please name the beneficiary"); return; }
    if (!Number.isFinite(g) || g < 50) { toast.error("Goal must be at least €50"); return; }
    if (!orgAccepted) { toast.error("Please accept the donation terms"); return; }
    setCreating(true);
    const { error } = await supabase.from("memorial_campaigns").insert({
      memory_wall_id: memorialId,
      organizer_user_id: userId,
      beneficiary_name: beneficiary.trim().slice(0, 255),
      charity_organization_name: charity.trim().slice(0, 255) || null,
      story: story.trim().slice(0, 2000) || null,
      target_goal_amount: g,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fundraiser created");
    load();
  };

  const supporterList = useMemo(() => supporters.slice(0, 5), [supporters]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <HeartHandshake className="w-4 h-4 mr-2" />
          Donate in Memory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header / banner */}
        <div className="relative h-40 bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20 overflow-hidden">
          {previewImage && <img src={previewImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <DialogHeader className="absolute bottom-4 left-6 right-6 text-left space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Memorial fundraiser</p>
            <DialogTitle className="font-serif text-2xl md:text-3xl text-foreground">In Loving Memory: {memorialName}</DialogTitle>
            <DialogDescription>
              {campaign ? <>For {campaign.beneficiary_name}{campaign.charity_organization_name ? ` · ${campaign.charity_organization_name}` : ""}</> : "Support the family or a cause close to their heart."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !campaign ? (
            isOwner ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Start a fundraiser for this memorial. Donations go to the beneficiary you name; Reflectlife deducts a small platform fee (2.5% private / 3.0% company donors) plus payment processing.</p>
                <div className="grid gap-3">
                  <div><Label htmlFor="ben">Beneficiary *</Label><Input id="ben" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="e.g. Family of Anna Müller" /></div>
                  <div><Label htmlFor="char">Charity / organization (optional)</Label><Input id="char" value={charity} onChange={(e) => setCharity(e.target.value)} placeholder="e.g. German Cancer Aid" /></div>
                  <div><Label htmlFor="goal">Goal amount (€) *</Label><Input id="goal" type="number" min={50} step={50} value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
                  <div><Label htmlFor="story">Story (optional)</Label><Textarea id="story" rows={4} value={story} onChange={(e) => setStory(e.target.value)} placeholder="Tell supporters what the donations will be used for…" maxLength={2000} /></div>
                </div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={orgAccepted} onCheckedChange={(v) => setOrgAccepted(v === true)} className="mt-0.5" />
                  <span>I agree to the <Link to="/terms#donations" target="_blank" className="text-primary underline underline-offset-4">Reflectlife donation, campaign transparency and payout terms</Link>.</span>
                </label>
                <Button onClick={handleCreate} disabled={creating} className="rounded-full w-full">
                  {creating ? "Creating…" : "Start fundraiser"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HeartHandshake className="w-10 h-10 mx-auto mb-3 text-primary/60" />
                <p>No fundraiser has been set up for this memorial yet.</p>
              </div>
            )
          ) : (
            <>
              {/* Progress */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-2xl font-semibold text-foreground">{money(totals.raised, currency)}</p>
                  <p className="text-sm text-muted-foreground">raised of {money(Number(campaign.target_goal_amount), currency)} goal</p>
                </div>
                <Progress value={pct} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {totals.donors} {totals.donors === 1 ? "donor" : "donors"} · {pct}% funded
                </p>
                {campaign.story && <p className="text-sm text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">{campaign.story}</p>}
              </div>

              {campaign.status !== "active" ? (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground text-center">This fundraiser is currently {campaign.status} and is not accepting donations.</div>
              ) : (
                <>
                  <Separator />

                  {/* Frequency */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-muted">
                    {(["once", "monthly"] as const).map((f) => {
                      const on = (f === "monthly") === recurring;
                      return (
                        <button key={f} type="button" onClick={() => setRecurring(f === "monthly")}
                          className={cn("rounded-full py-2 text-sm font-medium transition-colors", on ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                          {f === "once" ? "Give once" : "Give monthly"}
                        </button>
                      );
                    })}
                  </div>
                  {recurring && !userId && (
                    <p className="text-xs text-destructive -mt-3">Please <Link to="/login" className="underline">sign in</Link> to set up a monthly donation.</p>
                  )}

                  {/* Amount chips */}
                  <div>
                    <Label>Amount</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {PRESETS.map((p) => (
                        <button key={p} type="button" onClick={() => setPreset(p)}
                          className={cn("rounded-full border py-2.5 text-sm font-semibold transition-colors", preset === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                          {money(p, currency)}
                        </button>
                      ))}
                      <button type="button" onClick={() => setPreset("custom")}
                        className={cn("rounded-full border py-2.5 text-sm font-semibold transition-colors", preset === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                        Custom
                      </button>
                    </div>
                    {preset === "custom" && (
                      <Input className="mt-2" type="number" min={1} step={1} inputMode="decimal" placeholder="Enter amount" value={custom} onChange={(e) => setCustom(e.target.value)} />
                    )}
                  </div>

                  {/* Donor type */}
                  <div>
                    <Label>I am donating as</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {([["private", "Individual / Private", User], ["company", "Company / Organization", Building2]] as const).map(([v, label, Icon]) => (
                        <button key={v} type="button" onClick={() => setDonorType(v)}
                          className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm text-left transition-colors", donorType === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span><span className="block font-medium text-foreground">{label}</span><span className="text-xs text-muted-foreground">{(FEE_RATES[v] * 100).toFixed(1)}% platform fee</span></span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor="dn">{donorType === "company" ? "Company name" : "Your name"}</Label><Input id="dn" value={donorName} onChange={(e) => setDonorName(e.target.value)} disabled={anonymous} placeholder={anonymous ? "Anonymous" : ""} /></div>
                    {!userEmail && (
                      <div><Label htmlFor="de">Email (for your receipt) *</Label><Input id="de" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} /></div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="msg">Leave a few words of support (optional)</Label>
                    <Textarea id="msg" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thinking of you all…" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} /> Donate anonymously</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} /> Notify the organizer about my donation</label>
                  </div>

                  {/* Fee transparency */}
                  <div className="rounded-xl bg-muted/60 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Your donation</span><span className="font-medium">{validAmount ? money(amount, currency) : "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reflectlife platform fee ({(FEE_RATES[donorType] * 100).toFixed(1)}%)</span><span>− {money(fee, currency)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment processing</span><span className="text-muted-foreground text-xs">standard Stripe fee, deducted at settlement</span></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold text-foreground"><span>Goes to {campaign.beneficiary_name}</span><span>{money(net, currency)}</span></div>
                  </div>

                  <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                    <span>I agree to the <Link to="/terms#donations" target="_blank" className="text-primary underline underline-offset-4">Reflectlife donation terms</Link>, campaign transparency guidelines and payout terms.</span>
                  </label>

                  <Button onClick={handleDonate} disabled={!canSubmit || submitting} className="rounded-full w-full py-6 text-base font-semibold">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    {validAmount ? `Donate ${money(amount, currency)}${recurring ? " / month" : ""}` : "Donate"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground -mt-2">Secure payment by Stripe · Credit card, Apple Pay, Google Pay and PayPal</p>
                </>
              )}

              {/* Supporters */}
              {supporterList.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Recent supporters</p>
                    <ul className="space-y-3">
                      {supporterList.map((s) => (
                        <li key={s.id} className="flex gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {s.donor_type === "company" ? <Building2 className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground"><span className="font-medium">{s.donor_name}</span> · {money(Number(s.gross_amount), currency)}</p>
                            {s.condolence_message && <p className="text-muted-foreground italic">"{s.condolence_message}"</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
