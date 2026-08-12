import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, AlertCircle, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import RemembranceForm from "@/components/remembrance/RemembranceForm";
import ReminderRow from "@/components/remembrance/ReminderRow";
import { DayView, WeekView, occurrencesBetween, type Occurrence } from "@/components/remembrance/CalendarViews";
import {
  lastOccurrence,
  nextOccurrence,
  occurrencesInRange,
  toDateKey,
  type Remembrance,
} from "@/lib/remembrance";

const SELECT = "*, remembrance_subjects(*), remembrance_recipients(*)";

export default function RemembrancePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Me");
  const [items, setItems] = useState<Remembrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [anchor, setAnchor] = useState(new Date());
  const [tick, setTick] = useState(0);

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

  // Refresh countdowns every 30 seconds.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const openDetail = useCallback((id: string) => navigate(`/remembrance/${id}`), [navigate]);

  const active = useMemo(() => items.filter((r) => r.is_active), [items]);

  const monthOccurrences = useMemo<Occurrence[]>(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return active.flatMap((r) => occurrencesInRange(r, from, to).map((date) => ({ date, remembrance: r })));
  }, [active, month]);

  const eventDays = useMemo(() => monthOccurrences.map((o) => o.date), [monthOccurrences]);

  const todays = useMemo<Occurrence[]>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
    return occurrencesBetween(active, start, end);
  }, [active, tick]);

  const upcoming = useMemo(() => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return active
      .map((r) => ({ remembrance: r, date: nextOccurrence(r, now) }))
      .filter((x): x is Occurrence => !!x.date && x.date > endOfToday)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 12);
  }, [active, tick]);

  const overdue = useMemo(() => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
    const cutoff = new Date(now.getTime() - 7 * 86400000);
    return active
      .map((r) => ({ remembrance: r, date: lastOccurrence(r, now) }))
      .filter((x): x is Occurrence => !!x.date && x.date >= cutoff)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [active, tick]);

  const selectedDay = useMemo(() => {
    if (!selected) return [];
    const key = toDateKey(selected);
    const from = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59, 999);
    return occurrencesBetween(active, from, to).filter((o) => toDateKey(o.date) === key);
  }, [active, selected]);

  const agenda = useMemo(() => {
    const now = new Date();
    const to = addDays(now, 60);
    return occurrencesBetween(active, now, to).slice(0, 80);
  }, [active]);

  const stepAnchor = (dir: 1 | -1) =>
    setAnchor((a) => (view === "week" ? addWeeks(a, dir) : addDays(a, dir)));

  const nextUp = todays[0] ?? upcoming[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Reminders & Calendar | Reflectlife</title>
        <meta
          name="description"
          content="Create reminders by the hour, day, week, month or year and see everything that matters in one calm calendar."
        />
      </Helmet>

      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Reminders</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {nextUp
                ? `Next up: ${nextUp.remembrance.title || "your reminder"} — ${format(nextUp.date, "EEEE d MMM, HH:mm")}`
                : "Everything that matters, from the next hour to many years from now."}
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-full h-12 px-6"
            style={{ backgroundColor: "#4A324A", color: "#fff" }}
          >
            <Plus className="h-4 w-4 mr-2" /> New reminder
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="today" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="today" className="flex-1 sm:flex-none">Today</TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 sm:flex-none">Calendar</TabsTrigger>
              <TabsTrigger value="agenda" className="flex-1 sm:flex-none">Agenda</TabsTrigger>
            </TabsList>

            {/* TODAY */}
            <TabsContent value="today" className="space-y-6">
              {overdue.length > 0 && (
                <Card className="border-destructive/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-serif flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" /> Missed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overdue.map((o, i) => (
                      <ReminderRow key={`od-${o.remembrance.id}-${i}`} remembrance={o.remembrance} date={o.date} onOpen={openDetail} />
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <Sun className="h-5 w-5 text-[#4A324A]" /> Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todays.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
                  ) : (
                    todays.map((o, i) => (
                      <ReminderRow
                        key={`t-${o.remembrance.id}-${i}`}
                        remembrance={o.remembrance}
                        date={o.date}
                        onOpen={openDetail}
                        showDate={false}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Coming up</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming reminders yet.</p>
                  ) : (
                    upcoming.map((o, i) => (
                      <ReminderRow key={`u-${o.remembrance.id}-${i}`} remembrance={o.remembrance} date={o.date} onOpen={openDetail} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CALENDAR */}
            <TabsContent value="calendar" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                  <TabsList>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                  </TabsList>
                </Tabs>

                {view !== "month" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label="Previous" onClick={() => stepAnchor(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[11rem] text-center">
                      {view === "week"
                        ? `${format(startOfWeek(anchor, { weekStartsOn: 1 }), "d MMM")} – ${format(
                            addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6),
                            "d MMM yyyy"
                          )}`
                        : format(anchor, "EEEE d MMMM yyyy")}
                    </span>
                    <Button variant="outline" size="icon" aria-label="Next" onClick={() => stepAnchor(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
                      Today
                    </Button>
                  </div>
                )}
              </div>

              {view === "month" && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
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

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-serif">
                        {selected ? format(selected, "d MMMM yyyy") : "Pick a day"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedDay.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nothing on this day.</p>
                      ) : (
                        selectedDay.map((o, i) => (
                          <ReminderRow
                            key={`s-${o.remembrance.id}-${i}`}
                            remembrance={o.remembrance}
                            date={o.date}
                            onOpen={openDetail}
                            showDate={false}
                            showCountdown={false}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {view === "week" && <WeekView items={active} anchor={anchor} onOpen={openDetail} />}
              {view === "day" && <DayView items={active} anchor={anchor} onOpen={openDetail} />}
            </TabsContent>

            {/* AGENDA */}
            <TabsContent value="agenda">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif">Next 60 days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agenda.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
                  ) : (
                    agenda.map((o, i) => (
                      <ReminderRow key={`a-${o.remembrance.id}-${i}`} remembrance={o.remembrance} date={o.date} onOpen={openDetail} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

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
