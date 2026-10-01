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

import { tr } from "@/i18n/tr";
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
  const [newType, setNewType] = useState<FundraiserType>("personal");

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
  const fundraiserType: FundraiserType =
    campaign?.fundraiser_type === "charity" ? "charity" : "personal";
  const platformFeeRate = FEE_RATES[fundraiserType];
  const platformFee = validAmount ? amount * platformFeeRate + FEE_FIXED : 0;

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
        toast.error(err || tr("a.253f3031a4"));
        return;
      }
      window.location.href = url;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!userId) {
      toast.error(tr("a.74d04a61dc"));
      return;
    }
    const g = Number(goal);
    if (!beneficiary.trim()) {
      toast.error(tr("a.fa9ef1d7f3"));
      return;
    }
    if (newType === "charity" && !charity.trim()) {
      toast.error(tr("a.156ef48f3a"));
      return;
    }

    if (!Number.isFinite(g) || g < 50) {
      toast.error(`Goal must be at least ${SYMBOLS[goalCurrency]}50`);
      return;
    }
    if (!orgAccepted) {
      toast.error(tr("a.65c94689da"));
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("memorial_campaigns").insert({
      memory_wall_id: memorialId,
      organizer_user_id: userId,
      beneficiary_name: beneficiary.trim().slice(0, 255),
      charity_organization_name: newType === "charity" ? charity.trim().slice(0, 255) || null : null,
      fundraiser_type: newType,

      story: story.trim().slice(0, 2000) || null,
      target_goal_amount: g,
      currency: goalCurrency,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr("a.733d5346e6"));
    load();
  };

  const supporterList = useMemo(() => supporters.slice(0, 5), [supporters]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <HeartHandshake className="w-4 h-4 mr-2" />
          {tr("a.fbf5d74c20")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent">
        <DialogTitle className="sr-only">{tr("a.e73dc4c39c")} {memorialName}</DialogTitle>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-100 dark:border-slate-800 transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                {tr("a.701c423bc4")}
              </span>
              <h2 className="text-xl font-serif text-slate-800 dark:text-slate-100 mt-1">
                {tr("a.e73dc4c39c")} {memorialName}
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
                    {tr("a.4dd48e2b68")} {SYMBOLS[goalCurrency]}{tr("a.4b3ce77f77")} {SYMBOLS[goalCurrency]}{tr("a.dffbe0cf96")}
                  </p>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300">
                        {tr("a.6f4731ab97")}
                      </Label>
                      <div className="mt-1 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewType("personal")}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 px-3 rounded-xl border font-medium text-sm transition-all text-center",
                            newType === "personal"
                              ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                          )}
                        >
                          <User size={16} /> {tr("a.cd470f31fa")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewType("charity")}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 px-3 rounded-xl border font-medium text-sm transition-all text-center",
                            newType === "charity"
                              ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                          )}
                        >
                          <ShieldCheck size={16} /> {tr("a.835485daf3")}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {newType === "charity"
                          ? tr("a.9dfc6b8119")
                          : tr("a.e5975cc7a2")}
                      </p>
                    </div>
                    <div>
                      <Label
                        htmlFor="ben"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        {tr("a.4d208b9da1")}
                      </Label>
                      <Input
                        id="ben"
                        value={beneficiary}
                        onChange={(e) => setBeneficiary(e.target.value)}
                        placeholder={tr("a.24979c9b95")}
                        className="mt-1"
                      />
                    </div>
                    {newType === "charity" && (
                      <div>
                        <Label
                          htmlFor="char"
                          className="text-slate-700 dark:text-slate-300"
                        >
                          {tr("a.6c1a8a4bd3")}
                        </Label>
                        <Input
                          id="char"
                          value={charity}
                          onChange={(e) => setCharity(e.target.value)}
                          placeholder={tr("a.a27af674f9")}
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="goal"
                        className="text-slate-700 dark:text-slate-300"
                      >
                        {tr("a.8b6a0fcfd1")}
                      </Label>
                      <div className="mt-1 flex gap-2">
                        <select
                          aria-label={tr("a.0deecc4622")}
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
                        {tr("a.56abda2153")}
                      </Label>
                      <Textarea
                        id="story"
                        rows={4}
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        placeholder={tr("a.95a6e40ad5")}
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
                      {tr("a.fdd995f7c5")}{" "}
                      <Link
                        to="/terms#donations"
                        target="_blank"
                        className="text-amber-600 underline underline-offset-4"
                      >
                        {tr("a.1db7342a87")}
                      </Link>
                      .
                    </span>
                  </label>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="rounded-xl w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {creating ? tr("a.94d7d8ee47") : tr("a.6704216b4e")}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <HeartHandshake className="w-10 h-10 mx-auto mb-3 text-amber-600/60" />
                  <p>{tr("a.0a2c6d7b16")}</p>
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
                      {tr("a.26f5fa9e8e")} {money(Number(campaign.target_goal_amount), currency)} goal
                    </p>
                  </div>
                  <Progress value={pct} className="h-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {totals.donors}{" "}
                    {totals.donors === 1 ? "donor" : "donors"} · {pct}{tr("a.4db753f56c")}
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
                        {tr("a.def62cefe1")}
                      </Link>
                    </div>
                  )}
                </div>

                {campaign.status !== "active" ? (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                    {tr("a.817693da30")} {campaign.status} {tr("a.a54ff4566d")}
                  </div>
                ) : (
                  <>
                    <Separator />

                    {/* Fundraiser recipient */}
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      {fundraiserType === "charity" ? (
                        <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
                      ) : (
                        <User size={18} className="text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <span>
                        {fundraiserType === "charity"
                          ? `Certified charity fundraiser — proceeds go to ${campaign.charity_organization_name || campaign.beneficiary_name}. Fee 2.9% + ${symbol}0.30.`
                          : `Personal fundraiser — proceeds go to ${campaign.beneficiary_name}. Fee 3.1% + ${symbol}0.30.`}
                      </span>
                    </div>

                    {/* Donor Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {tr("a.6f5706be02")}
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
                          <User size={16} /> {tr("a.a7abed83ed")}
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
                          <Building2 size={16} /> {tr("a.7a1994999d")}
                        </button>
                      </div>
                    </div>


                    {/* Currency + frequency */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          {tr("a.e070de2244")}
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
                          {tr("a.89836a870e")}
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
                            {tr("a.e9292906f5")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!userId) {
                                toast.error(
                                  tr("a.48eb2d19a4")
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
                            {tr("a.d31edb7b8a")}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preset Amounts */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {tr("a.3702bc0d53")}
                      </label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
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
                          placeholder={tr("a.fde9fe7d71")}
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
                            ? tr("a.1e5f7dc45c")
                            : tr("a.ab42293e29")}
                        </Label>
                        <Input
                          id="dn"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          disabled={isAnonymous}
                          placeholder={isAnonymous ? tr("a.9bed510400") : ""}
                          className="mt-1"
                        />
                      </div>
                      {!userEmail && (
                        <div>
                          <Label
                            htmlFor="de"
                            className="text-slate-700 dark:text-slate-300"
                          >
                            {tr("a.86bf72420a")}
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
                        {tr("a.70fb40031f")}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={tr("a.b6c05a2af6")}
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
                        {tr("a.538a69135c")}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notify}
                          onChange={(e) => setNotify(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                        />
                        {tr("a.f480e7d0b6")}
                      </label>
                      <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <Checkbox
                          checked={accepted}
                          onCheckedChange={(v) => setAccepted(v === true)}
                          className="mt-0.5"
                        />
                        <span>
                          {tr("a.fdd995f7c5")}{" "}
                          <Link
                            to="/terms#donations"
                            target="_blank"
                            className="text-amber-600 underline underline-offset-4"
                          >
                            {tr("a.a4bb8a9b7b")}
                          </Link>
                          {tr("a.fb4fd8eb0c")}
                        </span>
                      </label>
                    </div>

                    {/* Fee & Transparent Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>{tr("a.b30f9c95de")}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {validAmount ? money(amount, donationCurrency) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {tr("a.6c051098ab")}
                          {fundraiserType === "charity" ? "2.9%" : "3.1%"} + {symbol}0.30):
                        </span>

                        <span>
                          {validAmount ? `−${money(platformFee, donationCurrency)}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{tr("a.894c1379bb")}</span>
                        <span className="text-[11px]">
                          {tr("a.6ec178f348")}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        <span>{tr("a.7f353cf963")} {campaign.beneficiary_name}:</span>
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
                        : tr("a.5baa68cbbd")}
                    </button>

                    {/* Terms Footer */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span>
                        {tr("a.f3cb02e021")}
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
                        {tr("a.321e65d378")}
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
