import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Heart,
  HeartHandshake,
  Building2,
  User,
  ShieldCheck,
  X,
  Loader2,
  Users,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";

type FundraiserType = "personal" | "charity";

type Campaign = {
  id: string;
  memory_wall_id: string;
  organizer_user_id: string;
  beneficiary_name: string;
  charity_organization_name: string | null;
  story: string | null;
  target_goal_amount: number;
  currency: string;
  fundraiser_type: FundraiserType;
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
// GoFundMe-style: personal 3.1% + 0.30, certified charity 2.9% + 0.30
const FEE_RATES: Record<FundraiserType, number> = { personal: 0.031, charity: 0.029 };
const FEE_FIXED = 0.3;
const CURRENCIES = ["EUR", "USD"] as const;
type CurrencyCode = (typeof CURRENCIES)[number];
const SYMBOLS: Record<CurrencyCode, string> = { EUR: "\u20ac", USD: "$" };
const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const PRESETS: Record<CurrencyCode, number[]> = {
  EUR: PRESET_AMOUNTS,
  USD: PRESET_AMOUNTS,
};


interface Props {
  memorialId: string;
  memorialName: string;
  isOwner: boolean;
  previewImage?: string | null;
}

function money(v: number, currency = "EUR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

export default function DonateInMemory({
  memorialId,
  memorialName,
  isOwner,
}: Props) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [totals, setTotals] = useState({ raised: 0, donors: 0 });
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  // Donation form
  const [donorType, setDonorType] = useState<DonorType>("private");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [donationCurrency, setDonationCurrency] = useState<CurrencyCode>("EUR");
  const [recurring, setRecurring] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notify, setNotify] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Organizer setup form
  const [beneficiary, setBeneficiary] = useState(
    memorialName ? `Family of ${memorialName}` : ""
  );
  const [charity, setCharity] = useState("");
  const [goal, setGoal] = useState("1000");
  const [goalCurrency, setGoalCurrency] = useState<CurrencyCode>("EUR");
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
      const cc = String((c as Campaign).currency || "EUR").toUpperCase();
      setDonationCurrency(cc === "USD" ? "USD" : "EUR");
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.rpc("get_campaign_public_summary", { _campaign_id: c.id }),
        supabase.rpc("get_campaign_public_donations", {
          _campaign_id: c.id,
          _limit: 10,
        }),
      ]);
      const row = Array.isArray(s) ? s[0] : s;
      setTotals({
        raised: Number(row?.total_raised ?? 0),
        donors: Number(row?.donor_count ?? 0),
      });
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

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const amount = customAmount
    ? parseFloat(customAmount) || 0
    : selectedAmount || 0;
  const validAmount = Number.isFinite(amount) && amount >= 1 && amount <= 50000;
  const platformFeeRate = FEE_RATES[donorType];
  const platformFee = validAmount ? amount * platformFeeRate : 0;
  const netAmount = validAmount ? amount - platformFee : 0;
  const currency = (campaign?.currency ?? "EUR").toUpperCase();
  const symbol = SYMBOLS[donationCurrency];
  const pct = campaign
    ? Math.min(
        100,
        Math.round(
          (totals.raised / Number(campaign.target_goal_amount || 1)) * 100
        )
      )
    : 0;

  const canSubmit =
    validAmount &&
    accepted &&
    (userEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail));

  const handleDonate = async () => {
    if (!campaign || !canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-donation-checkout",
        {
          body: {
            campaign_id: campaign.id,
            amount,
            donor_type: donorType,
            recurring,
            currency: donationCurrency,
            is_anonymous: isAnonymous,
            notify_organizer: notify,
            donor_name: donorName,
            donor_email: userEmail ?? donorEmail,
            condolence_message: message,
            accepted_terms: accepted,
          },
        }
      );
      const url = (data as any)?.url;
      const err = error?.message || (data as any)?.error;
      if (err || !url) {
        toast.error(err || "Could not start checkout");
        return;
      }
      window.location.href = url;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!userId) {
      toast.error("Please sign in");
      return;
    }
    const g = Number(goal);
    if (!beneficiary.trim()) {
      toast.error("Please name the beneficiary");
      return;
    }
    if (!Number.isFinite(g) || g < 50) {
      toast.error(`Goal must be at least ${SYMBOLS[goalCurrency]}50`);
      return;
    }
    if (!orgAccepted) {
      toast.error("Please accept the donation terms");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("memorial_campaigns").insert({
      memory_wall_id: memorialId,
      organizer_user_id: userId,
      beneficiary_name: beneficiary.trim().slice(0, 255),
      charity_organization_name: charity.trim().slice(0, 255) || null,
      story: story.trim().slice(0, 2000) || null,
      target_goal_amount: g,
      currency: goalCurrency,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent">
        <DialogTitle className="sr-only">Donate in Memory of {memorialName}</DialogTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-100 dark:border-slate-800 transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                Reflectlife Memorial Support
              </span>
              <h2 className="text-xl font-serif text-slate-800 dark:text-slate-100 mt-1">
                Donate in Memory of {memorialName}
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              </div>
            ) : !campaign ? (
              isOwner ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Start a fundraiser for this memorial. Donations go to the
                    beneficiary you name; Reflectlife deducts a small platform
                    fee (2.5% private / 3.0% company donors) plus payment
                    processing.
                  </p>
                  <div className="grid gap-3">
                    <div>
                      <Label
                        htmlFor="ben"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        Beneficiary *
                      </Label>
                      <Input
                        id="ben"
                        value={beneficiary}
                        onChange={(e) => setBeneficiary(e.target.value)}
                        placeholder="e.g. Family of Anna Müller"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="char"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        Charity / organization (optional)
                      </Label>
                      <Input
                        id="char"
                        value={charity}
                        onChange={(e) => setCharity(e.target.value)}
                        placeholder="e.g. German Cancer Aid"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="goal"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        Goal amount *
                      </Label>
                      <div className="mt-1 flex gap-2">
                        <select
                          aria-label="Campaign currency"
                          value={goalCurrency}
                          onChange={(e) =>
                            setGoalCurrency(e.target.value as CurrencyCode)
                          }
                          className="rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {SYMBOLS[c]} {c}
                            </option>
                          ))}
                        </select>
                        <Input
                          id="goal"
                          type="number"
                          min={50}
                          step={50}
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="story"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        Story (optional)
                      </Label>
                      <Textarea
                        id="story"
                        rows={4}
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        placeholder="Tell supporters what the donations will be used for…"
                        maxLength={2000}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <Checkbox
                      checked={orgAccepted}
                      onCheckedChange={(v) => setOrgAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      I agree to the{" "}
                      <Link
                        to="/terms#donations"
                        target="_blank"
                        className="text-amber-600 underline underline-offset-4"
                      >
                        Reflectlife donation, campaign transparency and payout
                        terms
                      </Link>
                      .
                    </span>
                  </label>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="rounded-xl w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {creating ? "Creating…" : "Start fundraiser"}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <HeartHandshake className="w-10 h-10 mx-auto mb-3 text-amber-600/60" />
                  <p>No fundraiser has been set up for this memorial yet.</p>
                </div>
              )
            ) : (
              <>
                {/* Progress */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                      {money(totals.raised, currency)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      raised of {money(Number(campaign.target_goal_amount), currency)} goal
                    </p>
                  </div>
                  <Progress value={pct} className="h-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {totals.donors}{" "}
                    {totals.donors === 1 ? "donor" : "donors"} · {pct}% funded
                  </p>
                  {campaign.story && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed whitespace-pre-line">
                      {campaign.story}
                    </p>
                  )}
                  {isOwner && userId === campaign.organizer_user_id && (
                    <div className="mt-4">
                      <Link
                        to={`/campaign-dashboard/${campaign.id}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 underline underline-offset-4"
                      >
                        Manage campaign & payouts →
                      </Link>
                    </div>
                  )}
                </div>

                {campaign.status !== "active" ? (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                    This fundraiser is currently {campaign.status} and is not
                    accepting donations.
                  </div>
                ) : (
                  <>
                    <Separator />

                    {/* Donor Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Donating as
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDonorType("private")}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium text-sm transition-all",
                            donorType === "private"
                              ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                          )}
                        >
                          <User size={16} /> Individual (2.5% fee)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDonorType("company")}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium text-sm transition-all",
                            donorType === "company"
                              ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                          )}
                        >
                          <Building2 size={16} /> Company (3.0% fee)
                        </button>
                      </div>
                    </div>

                    {/* Currency + frequency */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Currency
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {CURRENCIES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setDonationCurrency(c)}
                              className={cn(
                                "py-2.5 rounded-xl border text-sm font-semibold transition",
                                donationCurrency === c
                                  ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                              )}
                            >
                              {SYMBOLS[c]} {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Frequency
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRecurring(false)}
                            className={cn(
                              "py-2.5 rounded-xl border text-sm font-semibold transition",
                              !recurring
                                ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                            )}
                          >
                            One-time
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!userId) {
                                toast.error(
                                  "Please sign in to give monthly."
                                );
                                return;
                              }
                              setRecurring(true);
                            }}
                            className={cn(
                              "py-2.5 rounded-xl border text-sm font-semibold transition",
                              recurring
                                ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                            )}
                          >
                            Monthly
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preset Amounts */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Donation Amount
                      </label>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {PRESETS[donationCurrency].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setSelectedAmount(val);
                              setCustomAmount("");
                            }}
                            className={cn(
                              "py-2.5 rounded-xl border text-sm font-semibold transition",
                              selectedAmount === val && !customAmount
                                ? "border-slate-900 bg-slate-900 text-white dark:bg-amber-600 dark:border-amber-600"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                            )}
                          >
                            {symbol}
                            {val}
                          </button>
                        ))}
                      </div>
                      {/* Custom Amount Input */}
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                          {symbol}
                        </span>
                        <input
                          type="number"
                          placeholder="Custom Amount"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedAmount(null);
                          }}
                          className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                        />
                      </div>
                    </div>

                    {/* Donor details */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor="dn"
                          className="text-slate-700 dark:text-slate-300"
                        >
                          {donorType === "company"
                            ? "Company name"
                            : "Your name"}
                        </Label>
                        <Input
                          id="dn"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          disabled={isAnonymous}
                          placeholder={isAnonymous ? "Anonymous" : ""}
                          className="mt-1"
                        />
                      </div>
                      {!userEmail && (
                        <div>
                          <Label
                            htmlFor="de"
                            className="text-slate-700 dark:text-slate-300"
                          >
                            Email (for your receipt) *
                          </Label>
                          <Input
                            id="de"
                            type="email"
                            value={donorEmail}
                            onChange={(e) => setDonorEmail(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Words of Support */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Message of Condolence (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Write a message of remembrance…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={500}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                        />
                        Hide my name publicly on the memory wall feed
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notify}
                          onChange={(e) => setNotify(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                        />
                        Notify the organizer about my donation
                      </label>
                      <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <Checkbox
                          checked={accepted}
                          onCheckedChange={(v) => setAccepted(v === true)}
                          className="mt-0.5"
                        />
                        <span>
                          I agree to the{" "}
                          <Link
                            to="/terms#donations"
                            target="_blank"
                            className="text-amber-600 underline underline-offset-4"
                          >
                            Reflectlife donation terms
                          </Link>
                          , campaign transparency guidelines and payout terms.
                        </span>
                      </label>
                    </div>

                    {/* Fee & Transparent Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Gross Donation:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {validAmount ? money(amount, donationCurrency) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          Reflectlife Platform Fee (
                          {donorType === "company" ? "3.0%" : "2.5%"}):
                        </span>
                        <span>
                          {validAmount ? `−${money(platformFee, donationCurrency)}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Processing:</span>
                        <span className="text-[11px]">
                          standard Stripe fee, deducted at settlement
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        <span>Net Amount to {campaign.beneficiary_name}:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {validAmount ? money(netAmount, donationCurrency) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleDonate}
                      disabled={!canSubmit || submitting}
                      className={cn(
                        "w-full py-3.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                    >
                      {submitting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Lock size={18} />
                      )}
                      <Heart
                        size={18}
                        className={cn("fill-current", submitting && "hidden")}
                      />
                      {validAmount
                        ? `Complete Donation of ${money(amount, donationCurrency)}${recurring ? " / month" : ""}`
                        : "Complete Donation"}
                    </button>

                    {/* Terms Footer */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span>
                        Encrypted payment. Subject to Reflectlife's Terms & Fee
                        Structure.
                      </span>
                    </div>
                  </>
                )}

                {/* Supporters */}
                {supporterList.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
                        Recent supporters
                      </p>
                      <ul className="space-y-3">
                        {supporterList.map((s) => (
                          <li key={s.id} className="flex gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              {s.donor_type === "company" ? (
                                <Building2 className="w-4 h-4 text-amber-600" />
                              ) : (
                                <User className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-800 dark:text-slate-100">
                                <span className="font-medium">
                                  {s.donor_name}
                                </span>{" "}
                                · {money(Number(s.gross_amount), currency)}
                              </p>
                              {s.condolence_message && (
                                <p className="text-slate-500 dark:text-slate-400 italic">
                                  "{s.condolence_message}"
                                </p>
                              )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
