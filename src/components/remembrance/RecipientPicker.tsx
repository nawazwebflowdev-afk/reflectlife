import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Search, X, UserPlus, Mail } from "lucide-react";
import PhoneNumberField, { detectDefaultCountry, toE164 } from "@/components/PhoneNumberField";
import type { CountryCode } from "libphonenumber-js";
import { toast } from "sonner";

export interface SelectedRecipient {
  user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  display_name: string;
  avatar_url?: string | null;
}

interface Props {
  value: SelectedRecipient[];
  onChange: (next: SelectedRecipient[]) => void;
  currentUserId: string | null;
  currentUserName: string;
}

interface ContactRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  relation: string | null;
}

export default function RecipientPicker({ value, onChange, currentUserId, currentUserName }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_my_contacts", { _query: q });
      if (active) {
        setResults((data as ContactRow[]) ?? []);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  const has = (r: SelectedRecipient) =>
    value.some(
      (v) =>
        (r.user_id && v.user_id === r.user_id) ||
        (r.invited_email && v.invited_email === r.invited_email) ||
        (r.invited_phone && v.invited_phone === r.invited_phone)
    );

  const add = (r: SelectedRecipient) => {
    if (has(r)) return;
    onChange([...value, r]);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const meSelected = !!currentUserId && value.some((v) => v.user_id === currentUserId);

  const addPhone = async () => {
    setPhoneError(null);
    const e164 = toE164(phone, country);
    if (!e164) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }
    const { data } = await supabase.rpc("lookup_contact_by_phone", { _phone: e164 });
    const match = (data as ContactRow[] | null)?.[0];
    if (match) {
      add({
        user_id: match.user_id,
        invited_email: null,
        invited_phone: e164,
        display_name: match.full_name || "Reflectlife member",
        avatar_url: match.avatar_url,
      });
      toast.success("Added from your connections");
    } else {
      add({ user_id: null, invited_email: null, invited_phone: e164, display_name: e164 });
      toast.info("We'll invite this number to the remembrance.");
    }
    setPhone("");
  };

  const addEmail = () => {
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    add({ user_id: null, invited_email: v, invited_phone: null, display_name: v });
    setEmail("");
  };

  return (
    <div className="space-y-4">
      {currentUserId && (
        <Button
          type="button"
          variant={meSelected ? "secondary" : "outline"}
          className="rounded-full h-11"
          onClick={() =>
            meSelected
              ? onChange(value.filter((v) => v.user_id !== currentUserId))
              : add({ user_id: currentUserId, invited_email: null, invited_phone: null, display_name: currentUserName })
          }
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {meSelected ? "Me — added" : "Remind me"}
        </Button>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people you're connected with"
          className="pl-9 h-12"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {loading && <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No one found among your connections. You can invite them by email or phone below.
            </p>
          )}
          {results.map((c) => (
            <button
              key={c.user_id}
              type="button"
              onClick={() =>
                add({
                  user_id: c.user_id,
                  invited_email: null,
                  invited_phone: null,
                  display_name: c.full_name || "Reflectlife member",
                  avatar_url: c.avatar_url,
                })
              }
              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/60 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={c.avatar_url ?? undefined} alt={c.full_name ?? ""} />
                <AvatarFallback>{(c.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{c.full_name || "Reflectlife member"}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Invite by email</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={addEmail}>
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <PhoneNumberField
            id="invite-phone"
            label="Find someone by phone number"
            country={country}
            onCountryChange={setCountry}
            value={phone}
            onValueChange={setPhone}
            error={phoneError}
          />
          <Button type="button" variant="outline" className="w-full" onClick={addPhone}>
            Add contact
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((r, i) => (
            <Badge key={`${r.user_id ?? r.invited_email ?? r.invited_phone}-${i}`} variant="secondary" className="pl-1 pr-1 py-1 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={r.avatar_url ?? undefined} alt={r.display_name} />
                <AvatarFallback className="text-[10px]">{r.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{r.display_name}</span>
              <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => remove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        We only show people you are already connected with. A phone number that isn't in your connections never reveals
        whether it belongs to a Reflectlife account.
      </p>
    </div>
  );
}
