import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Flame, Loader2 } from "lucide-react";
import RemembranceForm from "@/components/remembrance/RemembranceForm";
import {
  EVENT_TYPE_LABELS,
  formatTime,
  nextOccurrence,
  occurrencesInRange,
  recurrenceLabel,
  subjectNames,
  toDateKey,
  type Remembrance,
} from "@/lib/remembrance";
import { format } from "date-fns";

const SELECT =
  "*, remembrance_subjects(*), remembrance_recipients(*)";

interface Occurrence {
  date: Date;
  remembrance: Remembrance;
}

export default function RemembrancePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Me");
  const [items, setItems] = useState<Remembrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("remembrances").select(SELECT).order("event_date", { ascending: true });
    setItems((data as unknown as Remembrance[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate("/login?redirect=/remembrance");
        return;
      }
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setUserName(profile?.full_name || user.email || "Me");
      load();
    })();
  }, [navigate, load]);

  const monthOccurrences = useMemo<Occurrence[]>(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return items
      .filter((r) => r.is_active)
      .flatMap((r) => occurrencesInRange(r, from, to).map((date) => ({ date, remembrance: r })));
  }, [items, month]);

  const eventDays = useMemo(() => monthOccurrences.map((o) => o.date), [monthOccurrences]);

  const todayKey = toDateKey(new Date());
  const todays = useMemo<Occurrence[]>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return items
      .filter((r) => r.is_active)
      .flatMap((r) => occurrencesInRange(r, start, start).map((date) => ({ date, remembrance: r })));
  }, [items]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return items
      .filter((r) => r.is_active)
      .map((r) => ({ remembrance: r, date: nextOccurrence(r, now) }))
      .filter((x): x is { remembrance: Remembrance; date: Date } => !!x.date && toDateKey(x.date) !== todayKey)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [items, todayKey]);

  const selectedDay = useMemo(() => {
    if (!selected) return [];
    const key = toDateKey(selected);
    return monthOccurrences.filter((o) => toDateKey(o.date) === key);
  }, [monthOccurrences, selected]);

  const past = useMemo(() => items.filter((r) => !nextOccurrence(r, new Date())), [items]);

  const Row = ({ o, showRepeat = true }: { o: { remembrance: Remembrance; date: Date }; showRepeat?: boolean }) => (
    <button
      onClick={() => navigate(`/remembrance/${o.remembrance.id}`)}
      className="w-full text-left rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">🕯️</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{subjectNames(o.remembrance)}</p>
          <p className="text-sm text-muted-foreground">
            {format(o.date, "EEEE, d MMMM")} · {formatTime(o.remembrance.time_local)}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {EVENT_TYPE_LABELS[o.remembrance.event_type]}
            </Badge>
            {showRepeat && (
              <Badge variant="outline" className="text-xs">
                {recurrenceLabel(o.remembrance)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Remembrance Calendar</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Gentle moments to remember the people we love — on your own, or together with family and friends.
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full h-12 px-6"
            style={{ backgroundColor: "#4A324A", color: "#fff" }}
          >
            <Plus className="h-4 w-4 mr-2" /> Create Remembrance
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-3 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={setSelected}
                    month={month}
                    onMonthChange={setMonth}
                    modifiers={{ remembrance: eventDays }}
                    modifiersClassNames={{
                      remembrance: "font-semibold text-[#4A324A] underline underline-offset-4",
                    }}
                    className="p-3 pointer-events-auto"
                  />
                </CardContent>
              </Card>

              {selected && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-serif">{format(selected, "d MMMM yyyy")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedDay.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No remembrances on this day.</p>
                    ) : (
                      selectedDay.map((o, i) => <Row key={`${o.remembrance.id}-${i}`} o={o} />)
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <Flame className="h-5 w-5 text-[#4A324A]" /> Today we remember
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todays.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
                  ) : (
                    todays.map((o, i) => <Row key={`${o.remembrance.id}-today-${i}`} o={o} />)
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Upcoming memories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming remembrances yet.</p>
                  ) : (
                    upcoming.map((o, i) => <Row key={`${o.remembrance.id}-up-${i}`} o={o} />)
                  )}
                </CardContent>
              </Card>

              {past.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-serif">Past remembrances</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {past.map((r) => (
                      <Row
                        key={`past-${r.id}`}
                        o={{ remembrance: r, date: new Date(r.event_date) }}
                        showRepeat={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />

      {userId && (
        <RemembranceForm
          open={formOpen}
          onOpenChange={setFormOpen}
          currentUserId={userId}
          currentUserName={userName}
          defaultDate={selected ?? null}
          onSaved={load}
        />
      )}
    </div>
  );
}
