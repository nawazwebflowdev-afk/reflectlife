import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type AuthClient = { name?: string; client_name?: string };
type AuthorizationDetails = {
  client?: AuthClient;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?redirect=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "this application";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 gradient-subtle">
      <Card className="w-full max-w-md shadow-elegant border-border/50">
        {error ? (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-card-foreground">Authorization failed</CardTitle>
              <CardDescription>We could not load this authorization request.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </>
        ) : !details ? (
          <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-card-foreground">
                Connect {clientName} to Reflectlife
              </CardTitle>
              <CardDescription>
                {clientName} will be able to read and create memorials, tributes, and diary entries as you.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Deny
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default OAuthConsent;
