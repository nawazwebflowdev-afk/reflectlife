import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

import { tr } from "@/i18n/tr";
export default function DonationSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const memorialId = params.get("memorial_id");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId || !memorialId) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-donation-payment", {
          body: { session_id: sessionId },
        });
        if (error || (data as any)?.error) setStatus("error");
        else setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [params, navigate, memorialId]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      {status === "pending" && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
      {status === "ok" && (
        <div className="p-4 rounded-full bg-primary/10">
          <HeartHandshake className="w-10 h-10 text-primary" />
        </div>
      )}
      <h1 className="font-serif text-2xl text-foreground">
        {status === "ok"
          ? tr("a.c7a2c74a44")
          : status === "error"
          ? tr("a.fc8ffedcdd")
          : tr("a.58449e0a3c")}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {status === "ok"
          ? tr("a.643386316a")
          : status === "error"
          ? tr("a.bfe0a005be")
          : tr("a.0a3f9281c3")}
      </p>
      {status !== "pending" && memorialId && (
        <Button asChild className="rounded-full mt-2">
          <Link to={`/memorial/${memorialId}`}>{tr("a.903162b951")}</Link>
        </Button>
      )}
    </div>
  );
}
