import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookUser, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { tr } from "@/i18n/tr";
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

const contactKey = (r: PhoneRecipient) => `email:${r.email ?? ""}`;

export default function PhoneRecipientPicker({ value, onChange }: Props) {
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

  const addEmail = () => {
    setEmailError(null);
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (addMany([{ phone: null, email: v, display_name: null, channel: "email" }]) === 0) {
      toast.info(tr("a.a13ae0c634"));
      return;
    }
    setEmail("");
  };

  const importFromContacts = async () => {
    const nav = navigator as ContactsNavigator;
    if (!nav.contacts?.select) {
      toast.error(tr("a.7232162412"));
      return;
    }
    try {
      const picked = await nav.contacts.select(["name", "email"], { multiple: true });
      const items: PhoneRecipient[] = [];
      for (const c of picked) {
        const name = c.name?.[0] ?? null;
        const mail = c.email?.[0]?.trim().toLowerCase();
        if (mail && EMAIL_RE.test(mail)) items.push({ phone: null, email: mail, display_name: name, channel: "email" });
      }
      if (items.length === 0) {
        toast.error(tr("a.9091b0f6da"));
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
      <Label>{tr("a.78cbf8eb1d")}</Label>

      <Button type="button" variant="outline" className="w-full rounded-full" onClick={importFromContacts}>
        <BookUser className="w-4 h-4 mr-2" />
        {tr("a.2f420b163f")}
      </Button>

      <div className="space-y-2 pt-1">
        <Label htmlFor="remembrance-email">{tr("a.3668efae1f")}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="remembrance-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder={tr("a.9703026304")}
              className="pl-10"
              aria-invalid={!!emailError}
            />
          </div>
          <Button type="button" variant="secondary" onClick={addEmail}>
            {tr("a.61cc55aa04")}
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
                {r.email}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                aria-label={`Remove ${r.email}`}
                onClick={() => remove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {tr("a.f079eefb5a")}
      </p>
    </div>
  );
}
