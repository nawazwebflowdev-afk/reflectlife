import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payout_method: any;
}

const CreatorPayouts = () => {
  const [balance, setBalance] = useState<number>(0);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
    fetchPayouts();
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("earnings_balance")
      .eq("id", user.id)
      .single();

    if (data && !error) {
      setBalance(Number(data.earnings_balance) || 0);
    }
  };

  const fetchPayouts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("creator_payouts")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setPayouts(data);
    }
    setLoading(false);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requestAmount = parseFloat(amount);
    
    if (requestAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (requestAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    if (requestAmount < 10) {
      toast({
        title: "Minimum Amount",
        description: "Minimum withdrawal amount is €10",
        variant: "destructive",
      });
      return;
    }

    if (!paypalEmail) {
      toast({
        title: "PayPal Email Required",
        description: "Please enter your PayPal email address",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("creator_payouts")
      .insert({
        creator_id: user.id,
        amount: requestAmount,
        status: "pending",
        payout_method: {
          type: "paypal",
          email: paypalEmail,
        },
      });

    setRequesting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted and will be processed within 5-7 business days",
      });
      setAmount("");
      setPaypalEmail("");
      fetchPayouts();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

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
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif text-2xl flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                Available Balance
              </CardTitle>
              <CardDescription>Your current earnings available for withdrawal</CardDescription>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold font-serif text-primary">
            €{balance.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Request Payout Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Minimum withdrawal amount is €10. Payouts are processed within 5-7 business days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestPayout} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="10"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: €{balance.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="paypal">PayPal Email *</Label>
              <Input
                id="paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                We'll send the payment to this PayPal email address
              </p>
            </div>

            <Button type="submit" disabled={requesting || balance < 10}>
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Request Payout"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Track your withdrawal requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length > 0 ? (
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
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {new Date(payout.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      €{Number(payout.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payout.payout_method?.type === "paypal" ? (
                        <div className="text-sm">
                          <p className="font-medium">PayPal</p>
                          <p className="text-muted-foreground text-xs">
                            {payout.payout_method?.email}
                          </p>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payout.status)}
                        {getStatusBadge(payout.status)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payout requests yet</p>
              <p className="text-sm mt-1">Request your first payout above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorPayouts;
