import { useEffect, useState } from "react";
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
          title: "Access denied",
          description: "Only the campaign organizer can view this dashboard.",
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
        title: "Error loading dashboard",
        description: err.message || "Could not load campaign data.",
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
        title: "Monthly payout already requested",
        description: `Payouts run once per month. Your next payout can be requested on ${nextPayoutDate.toLocaleDateString()}.`,
        variant: "destructive",
      });
      return;
    }

    const requestAmount = parseFloat(amount);
    if (!requestAmount || requestAmount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    if (requestAmount > summary.available_payout) {
      toast({ title: "Insufficient funds", description: "The requested amount exceeds the available payout.", variant: "destructive" });
      return;
    }
    if (requestAmount < 10) {
      toast({ title: "Minimum payout", description: "Minimum withdrawal is €10.", variant: "destructive" });
      return;
    }


    const payoutMethod = method === "paypal"
      ? { type: "paypal", email: paypalEmail.trim() }
      : { type: "bank", account_holder: accountHolder.trim(), iban: iban.trim() };

    if (method === "paypal" && !payoutMethod.email) {
      toast({ title: "PayPal email required", variant: "destructive" });
      return;
    }
    if (method === "bank" && (!payoutMethod.account_holder || !payoutMethod.iban)) {
      toast({ title: "Bank details required", variant: "destructive" });
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
      toast({ title: "Payout request failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Monthly payout requested", description: "Funds will be sent to the beneficiary in this month's payout run." });
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
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">Pending</Badge>;
      case "failed":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-700">Failed</Badge>;
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
        <h1 className="font-serif text-2xl font-semibold mb-2">Campaign not found</h1>
        <p className="text-muted-foreground mb-6">The campaign dashboard you are looking for does not exist.</p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
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
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Campaign Dashboard</h1>
          <p className="text-muted-foreground text-sm">{campaign.beneficiary_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Raised</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {money(summary?.total_gross || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{percentOfGoal}% of {money(campaign.target_goal_amount)} goal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Payout</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {money(summary?.total_net || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">After platform fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available to Withdraw</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {money(summary?.available_payout || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Minus completed payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Supporters</CardDescription>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {summary?.donor_count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Successful donations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="donations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="payouts">Payouts & Withdraw</TabsTrigger>
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>All successful donations for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No donations yet.</p>
                  <p className="text-sm">Share the memorial page to start receiving contributions.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Donor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {d.is_anonymous ? "Anonymous" : d.donor_name || d.donor_email}
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
                Monthly Payout to Beneficiary
              </CardTitle>
              <CardDescription>
                Payouts are sent once per month. Minimum withdrawal is {money(10)}.
                {currentMonthPayout
                  ? ` This month's payout of ${money(currentMonthPayout.amount)} is already requested — next payout available on ${nextPayoutDate.toLocaleDateString()}.`
                  : ` Next payout window opens ${nextPayoutDate.toLocaleDateString()} if you skip this month.`}
              </CardDescription>

            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <Label htmlFor="payoutAmount">Amount ({campaign.currency}) *</Label>
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
                    Available: {money(summary?.available_payout || 0)}
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={method === "paypal" ? "default" : "outline"}
                    onClick={() => setMethod("paypal")}
                  >
                    PayPal
                  </Button>
                  <Button
                    type="button"
                    variant={method === "bank" ? "default" : "outline"}
                    onClick={() => setMethod("bank")}
                  >
                    Bank Transfer
                  </Button>
                </div>

                {method === "paypal" ? (
                  <div>
                    <Label htmlFor="paypalEmail">PayPal Email *</Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="accountHolder">Account Holder Name *</Label>
                      <Input
                        id="accountHolder"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Full name on the account"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="iban">IBAN *</Label>
                      <Input
                        id="iban"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder="DE89 3704 0044 0532 0130 00"
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
                      Processing...
                    </>
                  ) : currentMonthPayout ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Payout scheduled this month
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Send Monthly Payout
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Track withdrawal requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payout requests yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                        <TableCell>
                          {p.payout_method?.type === "paypal" ? (
                            <span className="text-sm">PayPal — {p.payout_method.email}</span>
                          ) : p.payout_method?.type === "bank" ? (
                            <span className="text-sm">Bank — {p.payout_method.account_holder}</span>
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
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Beneficiary</Label>
                <p className="text-sm">{campaign.beneficiary_name}</p>
              </div>
              {campaign.charity_organization_name && (
                <div>
                  <Label>Charity / Organization</Label>
                  <p className="text-sm">{campaign.charity_organization_name}</p>
                </div>
              )}
              <div>
                <Label>Goal</Label>
                <p className="text-sm">{money(campaign.target_goal_amount)}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="text-sm capitalize">{campaign.status}</p>
              </div>
              <div>
                <Label>Story</Label>
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
