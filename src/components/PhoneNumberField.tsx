import { useMemo } from "react";
import { Phone } from "lucide-react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const detectDefaultCountry = (): CountryCode => {
  try {
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const locale of locales) {
      const region = locale?.split("-")[1]?.toUpperCase();
      if (region && (getCountries() as string[]).includes(region)) {
        return region as CountryCode;
      }
    }
  } catch {
    // ignore
  }
  return "DE";
};

/** Returns the E.164 string when valid, otherwise null. */
export const toE164 = (national: string, country: CountryCode): string | null => {
  const parsed = parsePhoneNumberFromString(national, country);
  return parsed && parsed.isValid() ? parsed.number : null;
};

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

interface PhoneNumberFieldProps {
  id?: string;
  label?: string;
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
}

const PhoneNumberField = ({
  id = "phoneNumber",
  label = "Phone Number",
  country,
  onCountryChange,
  value,
  onValueChange,
  disabled,
  error,
}: PhoneNumberFieldProps) => {
  const options = useMemo(
    () =>
      getCountries()
        .map((c) => ({ code: c, name: countryName(c), dial: `+${getCountryCallingCode(c)}` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d\s()+-]/g, "");
    onValueChange(new AsYouType(country).input(cleaned));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Select
          value={country}
          onValueChange={(c) => onCountryChange(c as CountryCode)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[110px] shrink-0" aria-label="Country code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {options.map((o) => (
              <SelectItem key={o.code} value={o.code}>
                {o.code} {o.dial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="151 40017533"
            className="pl-10"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            required
            disabled={disabled}
            aria-invalid={!!error}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default PhoneNumberField;
