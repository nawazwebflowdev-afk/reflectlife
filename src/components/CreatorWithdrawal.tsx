import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, CreditCard, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payout_method: any;
}

export const CreatorWithdrawal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [accountDetails, setAccountDetails] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch creator balance
  const { data: profile } = useQuery({
    queryKey: ['creator-balance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('earnings_balance')
        .eq('id', user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch payout history
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['creator-payouts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Payout[];
    },
    enabled: !!user?.id,
  });

  const handleWithdrawal = async () => {
    if (!user?.id || !withdrawAmount || !accountDetails) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const balance = profile?.earnings_balance || 0;

    if (amount < 10) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is €10",
        variant: "destructive",
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('request_payout', {
        p_amount: amount,
        p_payout_method: {
          type: paymentMethod,
          details: accountDetails,
        },
      });

      if (error) throw error;

      toast({
        title: "Withdrawal requested",
        description: "Your withdrawal request has been submitted and will be processed within 5-7 business days",
      });

      setWithdrawAmount("");
      setAccountDetails("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request withdrawal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'completed':
        return <Badge>Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            €{(profile?.earnings_balance || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Minimum withdrawal: €10.00
          </p>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Request Withdrawal</CardTitle>
          <CardDescription>
            Withdrawals are processed within 5-7 business days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="10"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="paypal">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    PayPal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">
              {paymentMethod === 'bank' ? 'IBAN / Account Number' : 'PayPal Email'}
            </Label>
            <Input
              id="details"
              placeholder={paymentMethod === 'bank' ? 'DE89370400440532013000' : 'your@email.com'}
              value={accountDetails}
              onChange={(e) => setAccountDetails(e.target.value)}
            />
          </div>

          <Button
            onClick={handleWithdrawal}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Request Withdrawal"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No withdrawal history yet
            </p>
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
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{formatDate(payout.created_at)}</TableCell>
                    <TableCell className="font-medium">€{payout.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">
                      {payout.payout_method?.type || 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
