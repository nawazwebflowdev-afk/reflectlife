import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Wallet, TrendingUp, Users, Clock, CheckCircle, XCircle, Landmark, CreditCard, AlertCircle } from "lucide-react";

import { tr } from "@/i18n/tr";
interface Campaign {
  id: string;
  memory_wall_id: string;
  organizer_user_id: string;
  beneficiary_name: string;
  charity_organization_name: string | null;
  story: string | null;
  target_goal_amount: number;
  currency: string;
  status: "active" | "paused" | "completed" | "closed";
  created_at: string;
}

interface Donation {
  id: string;
  donor_name: string | null;
  donor_email: string;
  donor_type: "private" | "company";
  gross_amount: number;
  platform_fee_amount: number;
  net_payout_amount: number;
  condolence_message: string | null;
  is_anonymous: boolean;
  is_recurring: boolean;
  payment_status: string;
  currency: string;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: { type?: string; email?: string; iban?: string; account_holder?: string } | null;
  created_at: string;
}

interface Summary {
  total_gross: number;
  total_net: number;
  total_paid_out: number;
  available_payout: number;
  donor_count: number;
}

const CampaignDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"paypal" | "bank">("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      if (id) await loadAll(user.id, id);
    };
    init();
  }, [id, navigate]);

  const loadAll = async (uid: string, campaignId: string) => {
    setLoading(true);
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("memorial_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (campaignError) throw campaignError;
      if (campaignData.organizer_user_id !== uid) {
        toast({
          title: tr("a.64343a83ad"),
          description: tr("a.6ed06d3cf6"),
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setCampaign(campaignData as Campaign);

      const [{ data: donationsData }, { data: payoutsData }, { data: summaryData }] = await Promise.all([
        supabase
          .from("memorial_donations")
          .select("*")
          .eq("campaign_id", campaignId)
          .eq("payment_status", "succeeded")
          .order("created_at", { ascending: false }),
        supabase
          .from("memorial_campaign_payouts")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_campaign_payout_summary", { _campaign_id: campaignId }),
      ]);

      setDonations((donationsData as Donation[]) ?? []);
      setPayouts((payoutsData as Payout[]) ?? []);
      if (summaryData && summaryData.length > 0) {
        const s = summaryData[0];
        setSummary({
          total_gross: Number(s.total_gross),
          total_net: Number(s.total_net),
          total_paid_out: Number(s.total_paid_out),
          available_payout: Number(s.available_payout),
          donor_count: Number(s.donor_count),
        });
      }
    } catch (err: any) {
      toast({
        title: tr("a.7ad7e91622"),
        description: err.message || tr("a.ed4c1cf6f0"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const monthKey = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  };

  const currentMonthPayout = payouts.find(
    (p) => p.status !== "failed" && monthKey(p.created_at) === monthKey(new Date())
  );

  const nextPayoutDate = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)
  );

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !userId || !summary) return;

    if (currentMonthPayout) {
      toast({
        title: tr("a.a050a0d86f"),
        description: `Payouts run once per month. Your next payout can be requested on ${formatDate(nextPayoutDate)}.`,
        variant: "destructive",
      });
      return;
    }

    const requestAmount = parseFloat(amount);
    if (!requestAmount || requestAmount <= 0) {
      toast({ title: tr("a.a2f6ca327e"), description: tr("a.ea70556eb6"), variant: "destructive" });
      return;
    }
    if (requestAmount > summary.available_payout) {
      toast({ title: tr("a.0f1b4fb91c"), description: tr("a.ebb6c45b78"), variant: "destructive" });
      return;
    }
    if (requestAmount < 10) {
      toast({ title: tr("a.3117d66203"), description: tr("a.0b0eeabaa3"), variant: "destructive" });
      return;
    }


    const payoutMethod = method === "paypal"
      ? { type: "paypal", email: paypalEmail.trim() }
      : { type: "bank", account_holder: accountHolder.trim(), iban: iban.trim() };

    if (method === "paypal" && !payoutMethod.email) {
      toast({ title: tr("a.c28edc8f79"), variant: "destructive" });
      return;
    }
    if (method === "bank" && (!payoutMethod.account_holder || !payoutMethod.iban)) {
      toast({ title: tr("a.06a3f1eafd"), variant: "destructive" });
      return;
    }

    setRequesting(true);
    const { error } = await supabase.from("memorial_campaign_payouts").insert({
      campaign_id: campaign.id,
      organizer_user_id: userId,
      amount: requestAmount,
      status: "pending",
      payout_method: payoutMethod,
    });
    setRequesting(false);

    if (error) {
      toast({ title: tr("a.aa3e027c21"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: tr("a.3343491ea1"), description: tr("a.a069e9d880") });
      setAmount("");
      setPaypalEmail("");
      setAccountHolder("");
      setIban("");
      if (id) await loadAll(userId, id);
    }
  };

  const money = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: campaign?.currency || "EUR",
      maximumFractionDigits: 2,
    }).format(v);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700">{tr("a.1798b3ba42")}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">{tr("a.96f608c16c")}</Badge>;
      case "failed":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-700">{tr("a.09fef5d8d9")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-serif text-2xl font-semibold mb-2">{tr("a.1ae44bb422")}</h1>
        <p className="text-muted-foreground mb-6">{tr("a.658a70ee2e")}</p>
        <Button asChild>
          <Link to="/dashboard">{tr("a.f7b5bf8cef")}</Link>
        </Button>
      </div>
    );
  }

  const percentOfGoal = Math.min(
    100,
    Math.round(((summary?.total_gross || 0) / (campaign.target_goal_amount || 1)) * 100)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link to={`/memorial/${campaign.memory_wall_id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold">{tr("a.7ccc21e58b")}</h1>
          <p className="text-muted-foreground text-sm">{campaign.beneficiary_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("a.1bbce7c6a7")}</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {money(summary?.total_gross || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{percentOfGoal}{tr("a.0f9771a13a")} {money(campaign.target_goal_amount)} goal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("a.110f85cef4")}</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {money(summary?.total_net || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tr("a.2ebbdada6a")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("a.e7bd7a0352")}</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {money(summary?.available_payout || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tr("a.da7b7b58f5")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("a.74b5d46318")}</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {summary?.donor_count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tr("a.69a4b1f1ec")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="donations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="donations">{tr("a.a2e2fff532")}</TabsTrigger>
          <TabsTrigger value="payouts">{tr("a.1a48f23dca")}</TabsTrigger>
          <TabsTrigger value="details">{tr("a.0cfdcf4d38")}</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("a.8a6da9b5e5")}</CardTitle>
              <CardDescription>{tr("a.760a9a1451")}</CardDescription>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p>{tr("a.ad64fa771c")}</p>
                  <p className="text-sm">{tr("a.39f72b9e39")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tr("a.eb9a4bc1c0")}</TableHead>
                        <TableHead>{tr("a.4962c9f8e2")}</TableHead>
                        <TableHead>{tr("a.3deb745651")}</TableHead>
                        <TableHead>{tr("a.9580a6176f")}</TableHead>
                        <TableHead>{tr("a.c6e89c9caf")}</TableHead>
                        <TableHead>{tr("a.9bb81c2ecc")}</TableHead>
                        <TableHead>{tr("a.68f4145fee")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{formatDate(d.created_at)}</TableCell>
                          <TableCell>
                            {d.is_anonymous ? tr("a.9bed510400") : d.donor_name || d.donor_email}
                          </TableCell>
                          <TableCell className="capitalize">{d.donor_type}</TableCell>
                          <TableCell>{money(d.gross_amount)}</TableCell>
                          <TableCell>{money(d.platform_fee_amount)}</TableCell>
                          <TableCell className="font-medium">{money(d.net_payout_amount)}</TableCell>
                          <TableCell className="max-w-xs truncate">{d.condolence_message || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {tr("a.7613b8d59d")}
              </CardTitle>
              <CardDescription>
                {tr("a.dc8f089d41")} {money(10)}.
                {currentMonthPayout
                  ? ` This month's payout of ${money(currentMonthPayout.amount)} is already requested — next payout available on ${formatDate(nextPayoutDate)}.`
                  : ` Next payout window opens ${formatDate(nextPayoutDate)} if you skip this month.`}
              </CardDescription>

            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <Label htmlFor="payoutAmount">{tr("a.52b139c9d3")}{campaign.currency}) *</Label>
                  <Input
                    id="payoutAmount"
                    type="number"
                    step="0.01"
                    min={10}
                    max={summary?.available_payout || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tr("a.4a8c2fb2e5")} {money(summary?.available_payout || 0)}
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={method === "paypal" ? "default" : "outline"}
                    onClick={() => setMethod("paypal")}
                  >
                    {tr("a.559ef5544c")}
                  </Button>
                  <Button
                    type="button"
                    variant={method === "bank" ? "default" : "outline"}
                    onClick={() => setMethod("bank")}
                  >
                    {tr("a.17ef50d8f8")}
                  </Button>
                </div>

                {method === "paypal" ? (
                  <div>
                    <Label htmlFor="paypalEmail">{tr("a.d8a403b62a")}</Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder={tr("a.9b5ca72bb2")}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="accountHolder">{tr("a.a51fafdcfc")}</Label>
                      <Input
                        id="accountHolder"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder={tr("a.c6784774ff")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="iban">{tr("a.36fa8baf67")}</Label>
                      <Input
                        id="iban"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder={tr("a.1e13899480")}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={requesting || !!currentMonthPayout || (summary?.available_payout || 0) < 10}
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tr("a.272bc02ec5")}
                    </>
                  ) : currentMonthPayout ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      {tr("a.dd85f8adfa")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {tr("a.e268c84cda")}
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("a.877b60eff7")}</CardTitle>
              <CardDescription>{tr("a.becd9db401")}</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{tr("a.6c6baaf298")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tr("a.eb9a4bc1c0")}</TableHead>
                      <TableHead>{tr("a.43dc8532f7")}</TableHead>
                      <TableHead>{tr("a.88306943fe")}</TableHead>
                      <TableHead>{tr("a.bae7d5be70")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.created_at)}</TableCell>
                        <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                        <TableCell>
                          {p.payout_method?.type === "paypal" ? (
                            <span className="text-sm">{tr("a.674695c99a")} {p.payout_method.email}</span>
                          ) : p.payout_method?.type === "bank" ? (
                            <span className="text-sm">{tr("a.456c594210")} {p.payout_method.account_holder}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("a.0cfdcf4d38")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{tr("a.3f327acd78")}</Label>
                <p className="text-sm">{campaign.beneficiary_name}</p>
              </div>
              {campaign.charity_organization_name && (
                <div>
                  <Label>{tr("a.5f4672aef2")}</Label>
                  <p className="text-sm">{campaign.charity_organization_name}</p>
                </div>
              )}
              <div>
                <Label>{tr("a.9fe00acebc")}</Label>
                <p className="text-sm">{money(campaign.target_goal_amount)}</p>
              </div>
              <div>
                <Label>{tr("a.bae7d5be70")}</Label>
                <p className="text-sm capitalize">{campaign.status}</p>
              </div>
              <div>
                <Label>{tr("a.86b4ba2ff9")}</Label>
                <p className="text-sm whitespace-pre-wrap">{campaign.story || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignDashboard;
