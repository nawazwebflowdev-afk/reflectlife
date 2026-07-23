import { formatDistanceToNow } from 'date-fns';

interface Contribution {
  id: string;
  contributor_name: string | null;
  anonymous: boolean;
  message: string | null;
  plan: string;
  created_at: string;
}

export function DedicationList({ items }: { items: Contribution[] }) {
  if (items.length === 0) return null;
  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <h3 className="text-sm uppercase tracking-wide text-muted-foreground text-center">
        Recent dedications
      </h3>
      <ul className="space-y-2">
        {items.slice(0, 5).map((c) => {
          const name = c.anonymous || !c.contributor_name ? 'Anonymous' : c.contributor_name;
          return (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col animate-fade-in"
            >
              {c.message && (
                <p className="text-foreground italic">"{c.message}"</p>
              )}
              <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                <span>— {name}</span>
                <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
