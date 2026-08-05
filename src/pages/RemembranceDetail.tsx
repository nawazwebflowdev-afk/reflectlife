import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RemembranceForm from "@/components/remembrance/RemembranceForm";
import RemembranceThread from "@/components/remembrance/RemembranceThread";
import {
  EVENT_TYPE_LABELS,
  formatTime,
  nextOccurrence,
  recurrenceLabel,
  subjectNames,
  toDateKey,
  type Remembrance,
} from "@/lib/remembrance";
import { format } from "date-fns";

export default function RemembranceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Me");
  const [item, setItem] = useState<Remembrance | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("remembrances")
      .select("*, remembrance_subjects(*), remembrance_recipients(*)")
      .eq("id", id)
      .maybeSingle();
    setItem((data as unknown as Remembrance) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate(`/login?redirect=/remembrance/${id ?? ""}`);
        return;
      }
      setUserId(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setUserName(profile?.full_name || data.user.email || "Me");
      load();
    })();
  }, [id, navigate, load]);

  const isCreator = !!item && item.creator_id === userId;

  const togglePaused = async (active: boolean) => {
    if (!item) return;
    const { error } = await supabase.from("remembrances").update({ is_active: active }).eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(active ? "Reminders resumed" : "Reminders paused");
    load();
  };

  const remove = async () => {
    if (!item) return;
    const { error } = await supabase.from("remembrances").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Remembrance removed");
    navigate("/remembrance");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
          <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
          <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-2xl mb-3">This remembrance isn't available</h1>
          <p className="text-muted-foreground mb-6">It may have been removed, or you may not be part of it.</p>
          <Button onClick={() => navigate("/remembrance")} className="rounded-full">
            Back to calendar
          </Button>
        </main>
      </div>
    );
  }

  const next = nextOccurrence(item, new Date());
  const recipients = (item.remembrance_recipients ?? []).filter((r) => r.status !== "removed");
  const visibleRecipients = recipients.filter((r) => r.share_presence || r.user_id === userId || isCreator);
  const isToday = next && toDateKey(next) === toDateKey(new Date());

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/remembrance")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Remembrance Calendar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">In memory of</p>
                <CardTitle className="font-serif text-3xl">{subjectNames(item)}</CardTitle>
              </div>
              {isCreator && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setFormOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this remembrance?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The reminder and its responses will be removed for everyone. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {(item.remembrance_subjects ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={s.subject_avatar_url ?? undefined} alt={s.subject_name} />
                    <AvatarFallback className="text-[10px]">{s.subject_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{s.subject_name}</span>
                  {s.memorial_id && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate(`/memorial/${s.memorial_id}`)}
                    >
                      Visit memorial
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Reminder sent to</p>
                <p className="font-medium">
                  {visibleRecipients.map((r) => r.display_name || r.invited_email || r.invited_phone).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(item.event_date), "d MMMM yyyy")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium">
                  {formatTime(item.time_local)} · {item.timezone}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Repeat</p>
                <p className="font-medium">{recurrenceLabel(item)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{EVENT_TYPE_LABELS[item.event_type]}</Badge>
              {next && (
                <Badge variant="outline">
                  {isToday ? "Today" : `Next: ${format(next, "d MMM yyyy")}`} · {formatTime(item.time_local)}
                </Badge>
              )}
              {!item.is_active && <Badge variant="outline">Paused</Badge>}
            </div>

            {item.message && (
              <blockquote className="border-l-2 border-[#4A324A] pl-4 italic text-foreground/90">
                “{item.message}”
              </blockquote>
            )}

            {visibleRecipients.length > 1 && (
              <p className="text-sm text-muted-foreground">
                {visibleRecipients
                  .filter((r) => r.user_id !== userId)
                  .map((r) => r.display_name || "A loved one")
                  .join(", ")}{" "}
                {visibleRecipients.length > 2 ? "are" : "is"} also remembering {subjectNames(item)}.
              </p>
            )}

            {isCreator && (
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Reminders active</p>
                  <p className="text-xs text-muted-foreground">Pause without losing this remembrance.</p>
                </div>
                <Switch checked={item.is_active} onCheckedChange={togglePaused} />
              </div>
            )}

            {recipients.some((r) => r.user_id === userId) && (
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Show others that I'm remembering too</p>
                  <p className="text-xs text-muted-foreground">You can stay private and still respond.</p>
                </div>
                <Switch
                  checked={recipients.find((r) => r.user_id === userId)?.share_presence ?? true}
                  onCheckedChange={async (v) => {
                    const mine = recipients.find((r) => r.user_id === userId);
                    if (!mine) return;
                    await supabase.from("remembrance_recipients").update({ share_presence: v }).eq("id", mine.id);
                    load();
                  }}
                />
              </div>
            )}

            <Separator />

            <div>
              <h2 className="font-serif text-xl mb-4">Remember together</h2>
              <RemembranceThread
                remembranceId={item.id}
                currentUserId={userId}
                occurrenceDate={next ? toDateKey(next) : null}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {userId && (
        <RemembranceForm
          open={formOpen}
          onOpenChange={setFormOpen}
          currentUserId={userId}
          currentUserName={userName}
          existing={item}
          onSaved={load}
        />
      )}
    </div>
  );
}
