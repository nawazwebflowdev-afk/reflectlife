import { useMemo } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_TYPE_EMOJI, displayTitle, formatClock, occurrenceTimesInRange, type Remembrance } from "@/lib/remembrance";

export interface Occurrence {
  date: Date;
  remembrance: Remembrance;
}

export function occurrencesBetween(items: Remembrance[], from: Date, to: Date): Occurrence[] {
  return items
    .filter((r) => r.is_active)
    .flatMap((r) => occurrenceTimesInRange(r, from, to).map((date) => ({ date, remembrance: r })))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function Chip({ o, onOpen }: { o: Occurrence; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(o.remembrance.id)}
      className="w-full text-left rounded-md bg-[#4A324A]/10 px-2 py-1 text-xs hover:bg-[#4A324A]/20 transition-colors"
    >
      <span className="mr-1" aria-hidden="true">
        {EVENT_TYPE_EMOJI[o.remembrance.event_type] ?? "🔔"}
      </span>
      <span className="font-medium">{formatClock(o.date)}</span>{" "}
      <span className="text-muted-foreground">{displayTitle(o.remembrance)}</span>
    </button>
  );
}

export function WeekView({
  items,
  anchor,
  onOpen,
}: {
  items: Remembrance[];
  anchor: Date;
  onOpen: (id: string) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const occ = useMemo(() => {
    const from = new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate());
    const last = days[6];
    const to = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999);
    return occurrencesBetween(items, from, to);
  }, [items, days]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const dayOcc = occ.filter((o) => isSameDay(o.date, d));
        const today = isSameDay(d, new Date());
        return (
          <Card key={d.toISOString()} className={today ? "border-[#4A324A]" : undefined}>
            <CardContent className="p-3 space-y-2">
              <p className={`text-xs uppercase tracking-wide ${today ? "text-[#4A324A] font-semibold" : "text-muted-foreground"}`}>
                {format(d, "EEE d MMM")}
              </p>
              {dayOcc.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                dayOcc.slice(0, 6).map((o, i) => <Chip key={`${o.remembrance.id}-${i}`} o={o} onOpen={onOpen} />)
              )}
              {dayOcc.length > 6 && (
                <p className="text-xs text-muted-foreground">+{dayOcc.length - 6} more</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DayView({
  items,
  anchor,
  onOpen,
}: {
  items: Remembrance[];
  anchor: Date;
  onOpen: (id: string) => void;
}) {
  const occ = useMemo(() => {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const to = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59, 59, 999);
    return occurrencesBetween(items, from, to);
  }, [items, anchor]);

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border">
        {hours.map((h) => {
          const slot = occ.filter((o) => o.date.getHours() === h);
          if (slot.length === 0) {
            return (
              <div key={h} className="flex gap-4 px-4 py-2 text-xs text-muted-foreground">
                <span className="w-12 shrink-0 tabular-nums">{`${h}`.padStart(2, "0")}:00</span>
                <span className="opacity-40">—</span>
              </div>
            );
          }
          return (
            <div key={h} className="flex gap-4 px-4 py-2">
              <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums pt-1">
                {`${h}`.padStart(2, "0")}:00
              </span>
              <div className="flex-1 space-y-1">
                {slot.map((o, i) => (
                  <Chip key={`${o.remembrance.id}-${i}`} o={o} onOpen={onOpen} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
