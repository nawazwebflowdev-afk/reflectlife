import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, Plus } from "lucide-react";

export interface SelectedSubject {
  memorial_id: string | null;
  subject_name: string;
  subject_avatar_url: string | null;
}

interface Props {
  value: SelectedSubject[];
  onChange: (next: SelectedSubject[]) => void;
}

interface MemorialRow {
  id: string;
  name: string;
  preview_image_url: string | null;
}

export default function SubjectPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorialRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, name, preview_image_url")
        .ilike("name", `%${q}%`)
        .limit(8);
      if (active) {
        setResults((data as MemorialRow[]) ?? []);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  const add = (s: SelectedSubject) => {
    if (value.some((v) => (s.memorial_id ? v.memorial_id === s.memorial_id : v.subject_name === s.subject_name))) return;
    onChange([...value, s]);
    setQuery("");
    setResults([]);
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a memorial or type a name"
          className="pl-9 h-12"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {loading && <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>}
          {!loading &&
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => add({ memorial_id: m.id, subject_name: m.name, subject_avatar_url: m.preview_image_url })}
                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.preview_image_url ?? undefined} alt={m.name} />
                  <AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{m.name}</span>
              </button>
            ))}
          {!loading && (
            <button
              type="button"
              onClick={() => add({ memorial_id: null, subject_name: query.trim(), subject_avatar_url: null })}
              className="w-full flex items-center gap-2 px-3 py-3 text-left text-sm hover:bg-muted/60 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Remember “{query.trim()}”
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s, i) => (
            <Badge key={`${s.memorial_id ?? s.subject_name}-${i}`} variant="secondary" className="pl-1 pr-1 py-1 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={s.subject_avatar_url ?? undefined} alt={s.subject_name} />
                <AvatarFallback className="text-[10px]">{s.subject_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{s.subject_name}</span>
              <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => remove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
