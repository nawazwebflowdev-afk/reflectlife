import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import SubjectPicker, { type SelectedSubject } from "./SubjectPicker";
import RecipientPicker, { type SelectedRecipient } from "./RecipientPicker";
import {
  CATEGORY_OPTIONS,
  EVENT_TYPE_LABELS,
  MEMORIAL_EVENT_TYPES,
  RECURRENCE_LABELS,
  toDateKey,
  type Remembrance,
  type RemembranceEventType,
  type RecurrenceType,
  type RecurrenceUnit,
} from "@/lib/remembrance";

import { tr } from "@/i18n/tr";
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

const PRESETS: { key: string; label: string; compute: () => Date }[] = [
  { key: "1h", label: tr("a.57e831c688"), compute: () => new Date(Date.now() + 3600_000) },
  {
    key: "tomorrow",
    label: tr("a.1948bf2dfa"),
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    key: "3d",
    label: tr("a.fe579269c6"),
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    key: "1w",
    label: tr("a.5a20763adf"),
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    key: "1mo",
    label: tr("a.8abf7cf1d0"),
    compute: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    key: "1y",
    label: tr("a.22c6f667e4"),
    compute: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>("none");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
  const [recipients, setRecipients] = useState<SelectedRecipient[]>([]);
  const [eventType, setEventType] = useState<RemembranceEventType>("reminder");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState(localTz);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [interval, setIntervalValue] = useState(1);
  const [unit, setUnit] = useState<RecurrenceUnit>("day");
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isMemorialType = MEMORIAL_EVENT_TYPES.includes(eventType);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title ?? "");
      setDescription(existing.description ?? "");
      setLocation(existing.location ?? "");
      setCategory(existing.category ?? "none");
      setImageUrl(existing.image_url ?? null);
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
      setMoreOpen(true);
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("none");
      setImageUrl(null);
      setSubjects([]);
      setRecipients([
        { user_id: currentUserId, invited_email: null, invited_phone: null, display_name: currentUserName },
      ]);
      setEventType("reminder");
      setDate(toDateKey(defaultDate ?? new Date()));
      setTime("09:00");
      setTimezone(localTz);
      setRecurrence("once");
      setIntervalValue(1);
      setUnit("day");
      setHasEnd(false);
      setEndDate("");
      setMessage("");
      setIsActive(true);
      setMoreOpen(false);
    }
  }, [open, existing, defaultDate, currentUserId, currentUserName, localTz]);

  const applyPreset = (d: Date) => {
    setDate(toDateKey(d));
    setTime(`${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`);
  };

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(tr("a.f8c8c1c46c"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(tr("a.08f3fdaa0c"));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${currentUserId}/reminders/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("memorial_uploads").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("memorial_uploads").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("a.ad0d0603e2"));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim() && subjects.length === 0) {
      toast.error(tr("a.b40be615f0"));
      return;
    }
    if (isMemorialType && subjects.length === 0) {
      toast.error(tr("a.67d8f7ffe4"));
      return;
    }
    if (recipients.length === 0) {
      toast.error(tr("a.002dfa67d6"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        creator_id: currentUserId,
        title: title.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        category: category === "none" ? null : category,
        image_url: imageUrl,
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

      if (subjects.length > 0) {
        const { error: subjErr } = await supabase.from("remembrance_subjects").insert(
          subjects.map((s) => ({
            remembrance_id: remembranceId!,
            memorial_id: s.memorial_id,
            subject_name: s.subject_name,
            subject_avatar_url: s.subject_avatar_url,
          }))
        );
        if (subjErr) throw subjErr;
      }

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

      toast.success(existing ? tr("a.8e553b57d6") : tr("a.072ab4bc0c"));
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("a.8d886c0ba6");
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
            {existing ? tr("a.1c3c423170") : tr("a.b1d4f6ad5f")}
          </DialogTitle>
          <DialogDescription>
            {tr("a.9b16c909d5")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-2">
            <Label htmlFor="r-title" className="text-base">
              {tr("a.015312c358")}
            </Label>
            <Input
              id="r-title"
              className="h-12"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("a.481223f728")}
            />
          </section>

          <section className="space-y-2">
            <Label className="text-base">{tr("a.b2028cfcc7")}</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => applyPreset(p.compute())}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-2">
                <Label htmlFor="r-date">{tr("a.eb9a4bc1c0")}</Label>
                <Input id="r-date" type="date" className="h-12" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-time">{tr("a.6c82e6dd86")}</Label>
                <Input id="r-time" type="time" className="h-12" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-repeat">{tr("a.659eba1219")}</Label>
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
                  <Label>{tr("a.3560d90b70")}</Label>
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
                        {(["hour", "day", "week", "month", "year"] as RecurrenceUnit[]).map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            {recurrence !== "once" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-end">{tr("a.8c698a7e00")}</Label>
                  <Switch id="r-end" checked={hasEnd} onCheckedChange={setHasEnd} />
                </div>
                {hasEnd && (
                  <Input type="date" className="h-12" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                )}
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <Label className="text-base">{tr("a.04bc4c6c70")}</Label>
            <RecipientPicker
              value={recipients}
              onChange={setRecipients}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          </section>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                {tr("a.05f6a45e56")}
                <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="r-type">{tr("a.3deb745651")}</Label>
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
                  <Label htmlFor="r-cat">{tr("a.a3c686e711")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="r-cat" className="h-12">
                      <SelectValue placeholder={tr("a.fdc24c707e")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tr("a.fdc24c707e")}</SelectItem>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-loc">{tr("a.d219c68101")}</Label>
                  <Input
                    id="r-loc"
                    className="h-12"
                    maxLength={160}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={tr("a.27f1d7b2d7")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-tz">{tr("a.eea79afd83")}</Label>
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
                </div>
              </section>

              <section className="space-y-2">
                <Label htmlFor="r-desc">{tr("a.70440046a3")}</Label>
                <Textarea
                  id="r-desc"
                  rows={3}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tr("a.4e17e77d0a")}
                />
              </section>

              <section className="space-y-2">
                <Label>{tr("a.50e19fda0d")}</Label>
                {imageUrl ? (
                  <div className="relative w-40">
                    <img src={imageUrl} alt={tr("a.b87a1929f7")} className="w-40 h-28 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      aria-label={tr("a.5f94b03c2e")}
                      onClick={() => setImageUrl(null)}
                      className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? tr("a.d921a79afa") : tr("a.739743f630")}
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImage(f);
                    e.target.value = "";
                  }}
                />
              </section>

              <Separator />

              <section className="space-y-3">
                <Label className="text-base">{tr("a.b447842798")}</Label>
                <p className="text-xs text-muted-foreground">
                  {tr("a.22ef4d482f")}
                </p>
                <SubjectPicker value={subjects} onChange={setSubjects} />
              </section>

              <section className="space-y-2">
                <Label htmlFor="r-msg">{tr("a.593c0277c3")}</Label>
                <Textarea
                  id="r-msg"
                  rows={3}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tr("a.7537c22149")}
                />
              </section>

              <section className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor="r-active">{tr("a.f16fcf2c86")}</Label>
                  <p className="text-xs text-muted-foreground">{tr("a.f80983af56")}</p>
                </div>
                <Switch id="r-active" checked={isActive} onCheckedChange={setIsActive} />
              </section>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {tr("a.77dfd2135f")}
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-full px-8"
            style={{ backgroundColor: "#4A324A", color: "#fff" }}
          >
            {saving ? tr("a.56a2285c5b") : existing ? tr("a.179359b39e") : tr("a.41cd579fe0")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
