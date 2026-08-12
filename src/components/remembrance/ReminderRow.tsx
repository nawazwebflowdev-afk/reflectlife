import { Badge } from "@/components/ui/badge";
import { MapPin, Repeat, Users } from "lucide-react";
import { format } from "date-fns";
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  displayTitle,
  formatClock,
  formatCountdown,
  recurrenceLabel,
  type Remembrance,
} from "@/lib/remembrance";

interface Props {
  remembrance: Remembrance;
  date: Date;
  onOpen: (id: string) => void;
  showDate?: boolean;
  showCountdown?: boolean;
  compact?: boolean;
}

export default function ReminderRow({
  remembrance: r,
  date,
  onOpen,
  showDate = true,
  showCountdown = true,
  compact = false,
}: Props) {
  const participants = (r.remembrance_recipients ?? []).filter((x) => x.status !== "removed").length;

  return (
    <button
      onClick={() => onOpen(r.id)}
      className="w-full text-left rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-start gap-3">
        {r.image_url ? (
          <img
            src={r.image_url}
            alt=""
            loading="lazy"
            className="h-11 w-11 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <span className="text-xl leading-none mt-0.5" aria-hidden="true">
            {EVENT_TYPE_EMOJI[r.event_type] ?? "🔔"}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium truncate">{displayTitle(r)}</p>
            {showCountdown && (
              <span className="text-xs font-medium text-[#4A324A] whitespace-nowrap">
                {formatCountdown(date)}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {showDate ? `${format(date, "EEEE, d MMMM")} · ` : ""}
            {formatClock(date)}
          </p>

          {!compact && r.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
          )}

          {!compact && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {EVENT_TYPE_LABELS[r.event_type]}
              </Badge>
              {r.category && (
                <Badge variant="outline" className="text-xs">
                  {r.category}
                </Badge>
              )}
              {r.recurrence !== "once" && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Repeat className="h-3 w-3" /> {recurrenceLabel(r)}
                </Badge>
              )}
              {r.location && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {r.location}
                </span>
              )}
              {participants > 1 && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {participants}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
