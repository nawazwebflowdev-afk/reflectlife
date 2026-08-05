import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import SubjectPicker, { type SelectedSubject } from "./SubjectPicker";
import RecipientPicker, { type SelectedRecipient } from "./RecipientPicker";
import {
  EVENT_TYPE_LABELS,
  RECURRENCE_LABELS,
  toDateKey,
  type Remembrance,
  type RemembranceEventType,
  type RecurrenceType,
  type RecurrenceUnit,
} from "@/lib/remembrance";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  currentUserName: string;
  existing?: Remembrance | null;
  defaultDate?: Date | null;
  onSaved: () => void;
}

function timezoneOptions(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const all = anyIntl.supportedValuesOf?.("timeZone") ?? [];
    if (all.length) return Array.from(new Set([local, ...all]));
  } catch {
    // ignore
  }
  return Array.from(new Set([local, "UTC", "Europe/Berlin", "Europe/London", "America/New_York", "America/Los_Angeles"]));
}

export default function RemembranceForm({
  open,
  onOpenChange,
  currentUserId,
  currentUserName,
  existing,
  defaultDate,
  onSaved,
}: Props) {
  const tzOptions = useMemo(timezoneOptions, []);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
  const [recipients, setRecipients] = useState<SelectedRecipient[]>([]);
  const [eventType, setEventType] = useState<RemembranceEventType>("special_memory");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState(localTz);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("yearly");
  const [interval, setIntervalValue] = useState(1);
  const [unit, setUnit] = useState<RecurrenceUnit>("year");
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setSubjects(
        (existing.remembrance_subjects ?? []).map((s) => ({
          memorial_id: s.memorial_id,
          subject_name: s.subject_name,
          subject_avatar_url: s.subject_avatar_url,
        }))
      );
      setRecipients(
        (existing.remembrance_recipients ?? [])
          .filter((r) => r.status !== "removed")
          .map((r) => ({
            user_id: r.user_id,
            invited_email: r.invited_email,
            invited_phone: r.invited_phone,
            display_name: r.display_name || r.invited_email || r.invited_phone || "Reflectlife member",
          }))
      );
      setEventType(existing.event_type);
      setDate(existing.event_date);
      setTime(existing.time_local.slice(0, 5));
      setTimezone(existing.timezone);
      setRecurrence(existing.recurrence);
      setIntervalValue(existing.recurrence_interval);
      setUnit(existing.recurrence_unit);
      setHasEnd(!!existing.end_date);
      setEndDate(existing.end_date ?? "");
      setMessage(existing.message ?? "");
      setIsActive(existing.is_active);
    } else {
      setSubjects([]);
      setRecipients([
        { user_id: currentUserId, invited_email: null, invited_phone: null, display_name: currentUserName },
      ]);
      setEventType("special_memory");
      setDate(toDateKey(defaultDate ?? new Date()));
      setTime("09:00");
      setTimezone(localTz);
      setRecurrence("yearly");
      setIntervalValue(1);
      setUnit("year");
      setHasEnd(false);
      setEndDate("");
      setMessage("");
      setIsActive(true);
    }
  }, [open, existing, defaultDate, currentUserId, currentUserName, localTz]);

  const save = async () => {
    if (subjects.length === 0) {
      toast.error("Please choose at least one person to remember.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Please choose who should receive this remembrance.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        creator_id: currentUserId,
        event_type: eventType,
        event_date: date,
        time_local: `${time}:00`,
        timezone,
        recurrence,
        recurrence_interval: recurrence === "custom" ? Math.max(1, interval) : 1,
        recurrence_unit: recurrence === "custom" ? unit : "year",
        end_date: hasEnd && endDate ? endDate : null,
        message: message.trim() || null,
        is_active: isActive,
      };

      let remembranceId = existing?.id;
      if (existing) {
        const { error } = await supabase.from("remembrances").update(payload).eq("id", existing.id);
        if (error) throw error;
        await supabase.from("remembrance_subjects").delete().eq("remembrance_id", existing.id);
        await supabase.from("remembrance_recipients").delete().eq("remembrance_id", existing.id);
      } else {
        const { data, error } = await supabase.from("remembrances").insert(payload).select("id").single();
        if (error) throw error;
        remembranceId = data.id;
      }

      const { error: subjErr } = await supabase.from("remembrance_subjects").insert(
        subjects.map((s) => ({
          remembrance_id: remembranceId!,
          memorial_id: s.memorial_id,
          subject_name: s.subject_name,
          subject_avatar_url: s.subject_avatar_url,
        }))
      );
      if (subjErr) throw subjErr;

      const { error: recErr } = await supabase.from("remembrance_recipients").insert(
        recipients.map((r) => ({
          remembrance_id: remembranceId!,
          user_id: r.user_id,
          invited_email: r.invited_email,
          invited_phone: r.invited_phone,
          display_name: r.display_name,
          timezone: r.user_id === currentUserId ? localTz : null,
        }))
      );
      if (recErr) throw recErr;

      toast.success(existing ? "Remembrance updated" : "Remembrance created");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {existing ? "Edit remembrance" : "Create a remembrance"}
          </DialogTitle>
          <DialogDescription>
            A gentle reminder to pause and remember, shared with the people who hold that memory too.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <Label className="text-base">Who would you like to remember?</Label>
            <SubjectPicker value={subjects} onChange={setSubjects} />
          </section>

          <Separator />

          <section className="space-y-3">
            <Label className="text-base">Who should receive this remembrance?</Label>
            <RecipientPicker
              value={recipients}
              onChange={setRecipients}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          </section>

          <Separator />

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="r-type">Type of remembrance</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as RemembranceEventType)}>
                <SelectTrigger id="r-type" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-date">Date</Label>
              <Input id="r-date" type="date" className="h-12" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-time">Time</Label>
              <Input id="r-time" type="time" className="h-12" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-tz">Time zone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="r-tz" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {tzOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Members receive it in their own time zone when we know it.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-repeat">Repeat</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                <SelectTrigger id="r-repeat" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {recurrence === "custom" && (
              <div className="space-y-2">
                <Label>Every</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    className="h-12 w-24"
                    value={interval}
                    onChange={(e) => setIntervalValue(Number(e.target.value))}
                  />
                  <Select value={unit} onValueChange={(v) => setUnit(v as RecurrenceUnit)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["day", "week", "month", "year"] as RecurrenceUnit[]).map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}s
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>

          {recurrence !== "once" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="r-end">Stop repeating on a date</Label>
                <Switch id="r-end" checked={hasEnd} onCheckedChange={setHasEnd} />
              </div>
              {hasEnd && (
                <Input type="date" className="h-12" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              )}
            </section>
          )}

          <section className="space-y-2">
            <Label htmlFor="r-msg">Personal message (optional)</Label>
            <Textarea
              id="r-msg"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Today we remember Maria and the beautiful life she shared with us."
            />
          </section>

          <section className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="r-active">Reminders active</Label>
              <p className="text-xs text-muted-foreground">Pause any time without losing the remembrance.</p>
            </div>
            <Switch id="r-active" checked={isActive} onCheckedChange={setIsActive} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-full px-8"
            style={{ backgroundColor: "#4A324A", color: "#fff" }}
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Create remembrance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
