import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type Visibility = "public" | "link" | "private";

/** Link-only reuses the existing "friends" privacy level: viewable by link, never listed, noindex. */
export const visibilityToDb = (v: Visibility) =>
  v === "public" ? { is_public: true, privacy_level: "public" as const }
  : v === "link" ? { is_public: true, privacy_level: "friends" as const }
  : { is_public: false, privacy_level: "private" as const };

export const visibilityFromDb = (isPublic: boolean | null | undefined, level: string | null | undefined): Visibility =>
  isPublic === false || level === "private" ? "private" : level === "friends" ? "link" : "public";

export function PrivacyPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const { t } = useTranslation();
  const opts: [Visibility, string, string][] = [
    ["public", "nov.privPublic", "nov.privPublicHint"],
    ["link", "nov.privLink", "nov.privLinkHint"],
    ["private", "nov.privPrivate", "nov.privPrivateHint"],
  ];
  return (
    <div className="space-y-2">
      <Label>{t("nov.privacy")}</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)} className="grid gap-2">
        {opts.map(([v, l, h]) => (
          <label key={v} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${value === v ? "border-primary" : ""}`}>
            <RadioGroupItem value={v} className="mt-1" />
            <span><span className="block text-sm font-medium">{t(l)}</span><span className="block text-xs text-muted-foreground">{t(h)}</span></span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
