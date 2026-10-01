import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
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

import { tr } from "@/i18n/tr";
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
        title: tr("a.a8a2251c7a"),
        description: tr("a.1a3f3f6292"),
        variant: "destructive",
      });
      return;
    }

    if (requestAmount > balance) {
      toast({
        title: tr("a.0859d7e4e7"),
        description: tr("a.67c7511a39"),
        variant: "destructive",
      });
      return;
    }

    if (requestAmount < 10) {
      toast({
        title: tr("a.65fc08218a"),
        description: tr("a.49ea19cd0c"),
        variant: "destructive",
      });
      return;
    }

    if (!paypalEmail) {
      toast({
        title: tr("a.7168fc5151"),
        description: tr("a.4f8e88be4d"),
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
        title: tr("a.7f2f6a15cf"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: tr("a.355f3db9bd"),
        description: tr("a.cc8df7f1a1"),
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
                {tr("a.396a220e3e")}
              </CardTitle>
              <CardDescription>{tr("a.3580a21d7a")}</CardDescription>
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
          <CardTitle>{tr("a.34d13ee7f5")}</CardTitle>
          <CardDescription>
            {tr("a.f1c83cba12")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestPayout} className="space-y-4">
            <div>
              <Label htmlFor="amount">{tr("a.7b70a12c35")}</Label>
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
                {tr("a.fb7a4abf0e")}{balance.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="paypal">{tr("a.d8a403b62a")}</Label>
              <Input
                id="paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder={tr("a.9b5ca72bb2")}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tr("a.cd7b0af0cb")}
              </p>
            </div>

            <Button type="submit" disabled={requesting || balance < 10}>
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tr("a.272bc02ec5")}
                </>
              ) : (
                tr("a.34d13ee7f5")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("a.877b60eff7")}</CardTitle>
          <CardDescription>{tr("a.86f335432c")}</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length > 0 ? (
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
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {formatDate(payout.created_at)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      €{Number(payout.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payout.payout_method?.type === "paypal" ? (
                        <div className="text-sm">
                          <p className="font-medium">{tr("a.559ef5544c")}</p>
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
              <p>{tr("a.7c4da13a12")}</p>
              <p className="text-sm mt-1">{tr("a.a4ff7e0160")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorPayouts;
