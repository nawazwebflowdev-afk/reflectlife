import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookUser, X } from "lucide-react";
import PhoneNumberField, { detectDefaultCountry, toE164 } from "@/components/PhoneNumberField";
import type { CountryCode } from "libphonenumber-js";
import { toast } from "sonner";

export interface PhoneRecipient {
  phone: string;
  display_name: string | null;
  channel: "sms" | "whatsapp";
}

interface Props {
  value: PhoneRecipient[];
  onChange: (next: PhoneRecipient[]) => void;
}

type ContactsNavigator = Navigator & {
  contacts?: {
    select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

export default function PhoneRecipientPicker({ value, onChange }: Props) {
  const [country, setCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");

  const addMany = (items: PhoneRecipient[]) => {
    const merged = [...value];
    let added = 0;
    for (const item of items) {
      if (merged.some((v) => v.phone === item.phone && v.channel === item.channel)) continue;
      merged.push(item);
      added++;
    }
    onChange(merged);
    return added;
  };

  const addManual = () => {
    setError(null);
    const e164 = toE164(phone, country);
    if (!e164) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (addMany([{ phone: e164, display_name: null, channel }]) === 0) {
      toast.info("That number is already on the list.");
      return;
    }
    setPhone("");
  };

  const importFromPhonebook = async () => {
    const nav = navigator as ContactsNavigator;
    if (!nav.contacts?.select) {
      toast.error("Your device or browser doesn't support importing contacts. Please add the number manually.");
      return;
    }
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: true });
      const items: PhoneRecipient[] = [];
      for (const c of picked) {
        const raw = c.tel?.[0];
        if (!raw) continue;
        const e164 = toE164(raw, country) ?? (raw.startsWith("+") ? raw.replace(/[^\d+]/g, "") : null);
        if (!e164) continue;
        items.push({ phone: e164, display_name: c.name?.[0] ?? null, channel });
      }
      if (items.length === 0) {
        toast.error("No usable phone numbers found in the selected contacts.");
        return;
      }
      const added = addMany(items);
      toast.success(`${added} contact${added === 1 ? "" : "s"} added`);
    } catch {
      /* user dismissed the picker */
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Recipients</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "whatsapp")}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="outline" className="w-full rounded-full" onClick={importFromPhonebook}>
        <BookUser className="w-4 h-4 mr-2" />
        Import from Phonebook
      </Button>

      <PhoneNumberField
        id="remembrance-phone"
        label="Or add a number manually"
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onValueChange={setPhone}
        error={error}
      />
      <Button type="button" variant="secondary" className="w-full rounded-full" onClick={addManual}>
        Add recipient
      </Button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((r, i) => (
            <Badge key={`${r.phone}-${r.channel}`} variant="secondary" className="gap-2 py-1 pl-3 pr-1">
              <span className="text-xs">
                {r.display_name ? `${r.display_name} · ` : ""}
                {r.phone}
                <span className="text-muted-foreground"> ({r.channel === "sms" ? "SMS" : "WhatsApp"})</span>
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                aria-label={`Remove ${r.phone}`}
                onClick={() => remove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Importing contacts only works on supported mobile browsers and never leaves your device until you save.
      </p>
    </div>
  );
}
