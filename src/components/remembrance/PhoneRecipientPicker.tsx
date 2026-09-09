import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookUser, Mail, X } from "lucide-react";
import PhoneNumberField, { detectDefaultCountry, toE164 } from "@/components/PhoneNumberField";
import type { CountryCode } from "libphonenumber-js";
import { toast } from "sonner";

export type RecipientChannel = "sms" | "whatsapp" | "email";

export interface PhoneRecipient {
  phone: string | null;
  email: string | null;
  display_name: string | null;
  channel: RecipientChannel;
}

interface Props {
  value: PhoneRecipient[];
  onChange: (next: PhoneRecipient[]) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactsNavigator = Navigator & {
  contacts?: {
    select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
  };
};

const contactKey = (r: PhoneRecipient) => `${r.channel}:${r.phone ?? r.email ?? ""}`;

export default function PhoneRecipientPicker({ value, onChange }: Props) {
  const [country] = useState<CountryCode>(detectDefaultCountry());
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);


  const addMany = (items: PhoneRecipient[]) => {
    const merged = [...value];
    let added = 0;
    for (const item of items) {
      if (merged.some((v) => contactKey(v) === contactKey(item))) continue;
      merged.push(item);
      added++;
    }
    onChange(merged);
    return added;
  };

  const addManualPhone = () => {
    setPhoneError(null);
    const e164 = toE164(phone, country);
    if (!e164) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }
    if (addMany([{ phone: e164, email: null, display_name: null, channel }]) === 0) {
      toast.info("That number is already on the list.");
      return;
    }
    setPhone("");
  };

  const addEmail = () => {
    setEmailError(null);
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (addMany([{ phone: null, email: v, display_name: null, channel: "email" }]) === 0) {
      toast.info("That email is already on the list.");
      return;
    }
    setEmail("");
  };

  const importFromPhonebook = async () => {
    const nav = navigator as ContactsNavigator;
    if (!nav.contacts?.select) {
      toast.error("Your device or browser doesn't support importing contacts. Please add the details manually.");
      return;
    }
    try {
      const picked = await nav.contacts.select(["name", "tel", "email"], { multiple: true });
      const items: PhoneRecipient[] = [];
      for (const c of picked) {
        const name = c.name?.[0] ?? null;
        const raw = c.tel?.[0];
        if (raw) {
          const e164 = toE164(raw, country) ?? (raw.startsWith("+") ? raw.replace(/[^\d+]/g, "") : null);
          if (e164) items.push({ phone: e164, email: null, display_name: name, channel });
          continue;
        }
        const mail = c.email?.[0]?.trim().toLowerCase();
        if (mail && EMAIL_RE.test(mail)) items.push({ phone: null, email: mail, display_name: name, channel: "email" });
      }
      if (items.length === 0) {
        toast.error("No usable phone numbers or emails found in the selected contacts.");
        return;
      }
      const added = addMany(items);
      toast.success(`${added} contact${added === 1 ? "" : "s"} added`);
    } catch {
      /* user dismissed the picker */
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const channelLabel = (c: RecipientChannel) => (c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Recipients</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "whatsapp")}>
          <SelectTrigger className="w-[150px] h-9" aria-label="Phone delivery method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">Send by SMS</SelectItem>
            <SelectItem value="whatsapp">Send by WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="outline" className="w-full rounded-full" onClick={importFromPhonebook}>
        <BookUser className="w-4 h-4 mr-2" />
        Import from Phonebook
      </Button>

      <PhoneNumberField
        id="remembrance-phone"
        label="Add a phone number"
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onValueChange={setPhone}
        error={phoneError}
      />
      <Button type="button" variant="secondary" className="w-full rounded-full" onClick={addManualPhone}>
        Add phone recipient
      </Button>

      <div className="space-y-2 pt-1">
        <Label htmlFor="remembrance-email">Add an email address</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="remembrance-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="pl-10"
              aria-invalid={!!emailError}
            />
          </div>
          <Button type="button" variant="secondary" onClick={addEmail}>
            Add
          </Button>
        </div>
        {emailError && <p className="text-xs text-destructive">{emailError}</p>}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((r, i) => (
            <Badge key={contactKey(r)} variant="secondary" className="gap-2 py-1 pl-3 pr-1">
              <span className="text-xs">
                {r.display_name ? `${r.display_name} · ` : ""}
                {r.phone ?? r.email}
                <span className="text-muted-foreground"> ({channelLabel(r.channel)})</span>
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                aria-label={`Remove ${r.phone ?? r.email}`}
                onClick={() => remove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Importing contacts only works on supported mobile browsers, and nothing leaves your device until you save.
      </p>
    </div>
  );
}
