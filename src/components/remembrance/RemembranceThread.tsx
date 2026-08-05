import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { QUICK_RESPONSES, REACTIONS } from "@/lib/remembrance";
import { formatDistanceToNow } from "date-fns";

interface ResponseRow {
  id: string;
  remembrance_id: string;
  user_id: string;
  response_type: string | null;
  response_text: string | null;
  created_at: string;
}

interface ReactionRow {
  id: string;
  response_id: string | null;
  user_id: string;
  reaction: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  remembranceId: string;
  currentUserId: string | null;
  occurrenceDate?: string | null;
}

export default function RemembranceThread({ remembranceId, currentUserId, occurrenceDate }: Props) {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: res }, { data: rea }] = await Promise.all([
      supabase
        .from("remembrance_responses")
        .select("*")
        .eq("remembrance_id", remembranceId)
        .order("created_at", { ascending: true }),
      supabase.from("remembrance_reactions").select("*").eq("remembrance_id", remembranceId),
    ]);
    const rows = (res as ResponseRow[]) ?? [];
    setResponses(rows);
    setReactions((rea as ReactionRow[]) ?? []);
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs as Profile[] | null)?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
  }, [remembranceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`remembrance-thread-${remembranceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "remembrance_responses", filter: `remembrance_id=eq.${remembranceId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "remembrance_reactions", filter: `remembrance_id=eq.${remembranceId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [remembranceId, load]);

  const submit = async (responseType: string | null, responseText: string | null) => {
    if (!currentUserId) {
      toast.error("Please sign in to respond.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("remembrance_responses").insert({
      remembrance_id: remembranceId,
      user_id: currentUserId,
      occurrence_date: occurrenceDate ?? null,
      response_type: responseType,
      response_text: responseText,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    toast.success("Your response was shared");
    load();
  };

  const toggleReaction = async (responseId: string | null, reaction: string) => {
    if (!currentUserId) return;
    const mine = reactions.find(
      (r) => r.user_id === currentUserId && (r.response_id ?? null) === (responseId ?? null)
    );
    if (mine && mine.reaction === reaction) {
      await supabase.from("remembrance_reactions").delete().eq("id", mine.id);
    } else if (mine) {
      await supabase.from("remembrance_reactions").update({ reaction }).eq("id", mine.id);
    } else {
      await supabase.from("remembrance_reactions").insert({
        remembrance_id: remembranceId,
        response_id: responseId,
        user_id: currentUserId,
        reaction,
      });
    }
    load();
  };

  const reactionsFor = (responseId: string | null) =>
    reactions.filter((r) => (r.response_id ?? null) === (responseId ?? null));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">A gentle response</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_RESPONSES.map((q) => (
            <Button
              key={q.type}
              type="button"
              variant="outline"
              disabled={busy}
              className="rounded-full h-11"
              onClick={() => submit(q.type, null)}
            >
              <span className="mr-2">{q.emoji}</span>
              {q.label}
            </Button>
          ))}
        </div>
        <Textarea
          rows={3}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a response…"
        />
        <Button
          disabled={busy || !text.trim()}
          onClick={() => submit(null, text.trim())}
          className="rounded-full px-8"
          style={{ backgroundColor: "#4A324A", color: "#fff" }}
        >
          Share response
        </Button>
      </div>

      <div className="space-y-4">
        {responses.length === 0 && (
          <p className="text-sm text-muted-foreground">No responses yet — be the first to remember together.</p>
        )}
        {responses.map((r) => {
          const p = profiles[r.user_id];
          const quick = QUICK_RESPONSES.find((q) => q.type === r.response_type);
          const rx = reactionsFor(r.id);
          return (
            <div key={r.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p?.avatar_url ?? undefined} alt={p?.full_name ?? ""} />
                  <AvatarFallback>{(p?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p?.full_name || "A loved one"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mt-1 break-words">
                    {quick ? `${quick.emoji} ${quick.label}` : r.response_text}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {REACTIONS.map((re) => {
                  const count = rx.filter((x) => x.reaction === re.type).length;
                  const mine = rx.some((x) => x.reaction === re.type && x.user_id === currentUserId);
                  return (
                    <Button
                      key={re.type}
                      type="button"
                      size="sm"
                      variant={mine ? "secondary" : "ghost"}
                      className="rounded-full h-8 px-3"
                      title={re.label}
                      onClick={() => toggleReaction(r.id, re.type)}
                    >
                      <span>{re.emoji}</span>
                      {count > 0 && <span className="ml-1 text-xs">{count}</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
