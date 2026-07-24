import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Bell, Share2, MessageCircle, Send, Phone } from "lucide-react";
import { toast } from "sonner";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type Timing = "2_minutes_before" | "1_day_before";

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
}

interface Props {
  memorialId: string;
  memorialName: string;
  isOwner: boolean;
  hasAccess: boolean;
}

function localToUtcTime(local: string): string {
  // local "HH:MM" in user's timezone -> "HH:MM:00" in UTC
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

export default function RemembranceSection({ memorialId, memorialName, isOwner, hasAccess }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);

  // Form
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [timeLocal, setTimeLocal] = useState("09:00");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState<Timing>("2_minutes_before");

  const canEdit = isOwner || hasAccess;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("memorial_remembrances")
        .select("*")
        .eq("memorial_id", memorialId)
        .maybeSingle();
      if (mounted && data) {
        setSchedule(data as Schedule);
        setTimeLocal(data.time_local);
        setFrequency(data.frequency as Frequency);
        setHasEnd(data.has_end_date);
        setEndDate(data.end_date ?? "");
        setReminderEnabled(data.reminder_enabled);
        setReminderTiming(data.reminder_timing as Timing);
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

  const handleSave = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!canEdit) { toast.error("Only the memorial owner or collaborators can set the schedule"); return; }
    const payload = {
      memorial_id: memorialId,
      created_by: user.id,
      time_local: timeLocal,
      time_utc: localToUtcTime(timeLocal),
      timezone: tz,
      frequency,
      anchor_date: new Date().toISOString().slice(0, 10),
      has_end_date: hasEnd,
      end_date: hasEnd && endDate ? endDate : null,
      reminder_enabled: reminderEnabled,
      reminder_timing: reminderTiming,
    };
    const { error } = schedule
      ? await supabase.from("memorial_remembrances").update(payload).eq("id", schedule.id)
      : await supabase.from("memorial_remembrances").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Time to Remember saved");
    setOpen(false);
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
      toast.success("Link copied");
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
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Time to Remember</p>
              <div className="font-mono text-4xl md:text-5xl font-light tracking-tight text-foreground tabular-nums">
                {schedule ? displayTime : nowStr.slice(0, 5)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {schedule ? (
                  <>{schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} · {schedule.timezone}</>
                ) : (
                  "No remembrance scheduled yet"
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full">
                    <Bell className="w-4 h-4 mr-2" />
                    {schedule ? "Edit Time to Remember" : "Set Time to Remember"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set Time to Remember</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tor-time">Time of day ({tz})</Label>
                      <Input id="tor-time" type="time" value={timeLocal} onChange={(e) => setTimeLocal(e.target.value)} />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tor-hasend">End on specific date</Label>
                      <Switch id="tor-hasend" checked={hasEnd} onCheckedChange={setHasEnd} />
                    </div>
                    {hasEnd && (
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    )}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tor-remind">Send reminder email</Label>
                        <Switch id="tor-remind" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                      </div>
                      {reminderEnabled && (
                        <div>
                          <Label>Remind me</Label>
                          <Select value={reminderTiming} onValueChange={(v) => setReminderTiming(v as Timing)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2_minutes_before">2 minutes before</SelectItem>
                              <SelectItem value="1_day_before">1 day before</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-2">
                            Sent to the memorial owner and everyone with accepted access.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Share row */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-muted-foreground mr-1 hidden md:inline">Share:</span>
              <a href={wa} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href={tg} target="_blank" rel="noreferrer" aria-label="Share on Telegram"
                className="w-10 h-10 rounded-full bg-[#229ED9] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <Send className="w-5 h-5" />
              </a>
              <a href={viber} aria-label="Share on Viber"
                className="w-10 h-10 rounded-full bg-[#7360F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                <Phone className="w-5 h-5" />
              </a>
              <button onClick={nativeShare} aria-label="Share this Memorial"
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
