import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Bell, Share2, MessageCircle, Send, Phone, CalendarIcon, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import PhoneRecipientPicker, { type PhoneRecipient } from "./PhoneRecipientPicker";

import { tr } from "@/i18n/tr";
type Frequency = "once" | "daily" | "weekly" | "monthly" | "yearly";
type Timing =
  | "2_minutes_before"
  | "15_minutes_before"
  | "1_hour_before"
  | "1_day_before"
  | "1_week_before";

const TIMING_OPTIONS: { value: Timing; label: string }[] = [
  { value: "15_minutes_before", label: tr("a.4bba5a7257") },
  { value: "1_hour_before", label: tr("a.f2a1e2cbf0") },
  { value: "1_day_before", label: tr("a.0ef8e54401") },
  { value: "1_week_before", label: tr("a.efb33729dd") },
];


const MESSAGE_MAX = 300;

interface Schedule {
  id: string;
  memorial_id: string;
  created_by: string;
  time_utc: string;
  time_local: string;
  timezone: string;
  frequency: Frequency;
  anchor_date: string;
  has_end_date: boolean;
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_timing: Timing;
  custom_message: string | null;
}

interface Props {
  memorialId: string;
  memorialName: string;
  isOwner: boolean;
  hasAccess: boolean;
  actionSlot?: ReactNode;
}

function localToUtcTime(local: string): string {
  const today = new Date();
  const [h, m] = local.split(":").map(Number);
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
  const uh = d.getUTCHours().toString().padStart(2, "0");
  const um = d.getUTCMinutes().toString().padStart(2, "0");
  return `${uh}:${um}:00`;
}

function utcTimeToLocalDisplay(utc: string, tz: string): string {
  const [h, m] = utc.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(d);
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export default function RemembranceSection({ memorialId, memorialName, isOwner, hasAccess, actionSlot }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [recipients, setRecipients] = useState<PhoneRecipient[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [date, setDate] = useState<Date>(new Date());
  const [timeLocal, setTimeLocal] = useState("09:00");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState<Timing>("1_hour_before");
  const [message, setMessage] = useState("");

  const canEdit = isOwner || hasAccess;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("memorial_remembrances")
        .select("*")
        .eq("memorial_id", memorialId)
        .maybeSingle();
      if (!mounted || !data) return;
      const s = data as Schedule;
      setSchedule(s);
      setTimeLocal(s.time_local);
      setFrequency(s.frequency as Frequency);
      setHasEnd(s.has_end_date);
      setEndDate(s.end_date ?? "");
      setReminderEnabled(s.reminder_enabled);
      setReminderTiming(s.reminder_timing as Timing);
      setMessage(s.custom_message ?? "");
      if (s.anchor_date) setDate(parseDateKey(s.anchor_date));

      const { data: rec } = await supabase
        .from("remembrance_phone_recipients")
        .select("phone,email,display_name,channel")
        .eq("remembrance_id", s.id);
      if (mounted && rec) {
        setRecipients(rec as PhoneRecipient[]);
        setSavedCount(rec.length);
      }
    })();
    const channel = supabase
      .channel(`remembrance-${memorialId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "memorial_remembrances", filter: `memorial_id=eq.${memorialId}` }, (payload: any) => {
        if (payload.eventType === "DELETE") setSchedule(null);
        else setSchedule(payload.new as Schedule);
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [memorialId]);

  const displayTime = schedule
    ? utcTimeToLocalDisplay(schedule.time_utc, schedule.timezone)
    : "—:—";

  const nowStr = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);

  const scheduledSubtext = schedule
    ? `Scheduled for ${format(parseDateKey(schedule.anchor_date), "MMM d")} at ${displayTime} · ${savedCount} recipient${savedCount === 1 ? "" : "s"}`
    : "No remembrance scheduled yet";

  const handleSave = async () => {
    if (!userId) { toast.error(tr("a.74d04a61dc")); return; }
    if (!canEdit) { toast.error(tr("a.532725526a")); return; }
    setSaving(true);
    try {
      const payload = {
        memorial_id: memorialId,
        created_by: userId,
        time_local: timeLocal,
        time_utc: localToUtcTime(timeLocal),
        timezone: tz,
        frequency,
        anchor_date: toDateKey(date),
        has_end_date: frequency === "once" ? false : hasEnd,
        end_date: frequency !== "once" && hasEnd && endDate ? endDate : null,
        reminder_enabled: reminderEnabled,
        reminder_timing: reminderTiming,
        custom_message: message.trim() ? message.trim().slice(0, MESSAGE_MAX) : null,
      };

      let scheduleId = schedule?.id ?? null;
      if (scheduleId) {
        const { error } = await supabase.from("memorial_remembrances").update(payload).eq("id", scheduleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("memorial_remembrances").insert(payload).select("*").single();
        if (error) throw error;
        scheduleId = (data as Schedule).id;
        setSchedule(data as Schedule);
      }

      // Replace the recipient list
      await supabase.from("remembrance_phone_recipients").delete().eq("remembrance_id", scheduleId);
      if (recipients.length > 0) {
        const { error: recErr } = await supabase.from("remembrance_phone_recipients").insert(
          recipients.map((r) => ({
            remembrance_id: scheduleId!,
            memorial_id: memorialId,
            phone: r.phone,
            email: r.email,
            display_name: r.display_name,
            channel: r.channel,
            created_by: userId,
          }))
        );
        if (recErr) throw recErr;
      }
      setSavedCount(recipients.length);
      toast.success(frequency === "once" ? tr("a.1a237f5de7") : tr("a.973bda2f69"));
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? tr("a.d8866cc1c8"));
    } finally {
      setSaving(false);
    }
  };

  // Share urls
  const url = typeof window !== "undefined" ? `${window.location.origin}/memorial/${memorialId}` : "";
  const text = `A moment to remember ${memorialName} on Reflectlife`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const viber = `viber://forward?text=${encodeURIComponent(text + " " + url)}`;

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(tr("a.c2e98476ef"));
    }
  };

  return (
    <Card className="mb-8 shadow-elegant border-primary/10 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Clock */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{tr("a.1705f344ad")}</p>
              <div className="font-mono text-4xl md:text-5xl font-light tracking-tight text-foreground tabular-nums">
                {schedule ? displayTime : nowStr.slice(0, 5)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{scheduledSubtext}</p>
              {schedule && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} · {schedule.timezone}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-row flex-wrap items-center gap-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full">
                    <Bell className="w-4 h-4 mr-2" />
                    {schedule ? tr("a.1645dfdd7e") : tr("a.28d5ec3c85")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">

                  <DialogHeader>
                    <DialogTitle>{tr("a.28d5ec3c85")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{tr("a.eb9a4bc1c0")}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "PPP") : <span>{tr("a.629b7ca5d3")}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(d) => d && setDate(d)}
                              defaultMonth={date}
                              fromYear={1900}
                              toYear={new Date().getFullYear() + 10}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tor-time">{tr("a.eff4a229ed")}{tz})</Label>
                        <Input id="tor-time" type="time" value={timeLocal} onChange={(e) => setTimeLocal(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{tr("a.89836a870e")}</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">{tr("a.d9c768782e")}</SelectItem>
                          <SelectItem value="daily">{tr("a.728298d3db")}</SelectItem>
                          <SelectItem value="weekly">{tr("a.158f3da592")}</SelectItem>
                          <SelectItem value="monthly">{tr("a.d31edb7b8a")}</SelectItem>
                          <SelectItem value="yearly">{tr("a.7622eb5aa4")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {frequency !== "once" && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="tor-hasend">{tr("a.860294a3af")}</Label>
                          <Switch id="tor-hasend" checked={hasEnd} onCheckedChange={setHasEnd} />
                        </div>
                        {hasEnd && (
                          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        )}
                      </>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      <Label htmlFor="tor-message">{tr("a.a903690960")}</Label>
                      <Textarea
                        id="tor-message"
                        value={message}
                        maxLength={MESSAGE_MAX}
                        rows={3}
                        placeholder={`A gentle reminder to pause and remember ${memorialName}.`}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground text-right">{message.length}/{MESSAGE_MAX}</p>
                    </div>

                    <div className="border-t pt-4">
                      <PhoneRecipientPicker value={recipients} onChange={setRecipients} />
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tor-remind">{tr("a.1e9a491991")}</Label>
                        <Switch id="tor-remind" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                      </div>
                      {reminderEnabled && (
                        <div>
                          <Label>{tr("a.25df3f712a")}</Label>
                          <Select value={reminderTiming} onValueChange={(v) => setReminderTiming(v as Timing)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIMING_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}

                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-2">
                            {tr("a.5bb4db62ca")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{tr("a.77dfd2135f")}</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? tr("a.56a2285c5b") : tr("a.efc007a393")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {actionSlot}
            </div>


            {savedCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-end">
                <Users className="w-3.5 h-3.5" />
                {savedCount} recipient{savedCount === 1 ? "" : "s"} {tr("a.a00a8dd71c")}
              </p>
            )}

            {/* Share row */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-muted-foreground mr-1 hidden md:inline">{tr("a.fe783f0c10")}</span>
              <a href={wa} target="_blank" rel="noreferrer" aria-label={tr("a.7e03939f86")}
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href={tg} target="_blank" rel="noreferrer" aria-label={tr("a.26ea633cf7")}
                className="w-10 h-10 rounded-full bg-[#229ED9] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <Send className="w-5 h-5" />
              </a>
              <a href={viber} aria-label={tr("a.4d7069d9e0")}
                className="w-10 h-10 rounded-full bg-[#7360F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <Phone className="w-5 h-5" />
              </a>
              <button onClick={nativeShare} aria-label={tr("a.5b68a8aa36")}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
