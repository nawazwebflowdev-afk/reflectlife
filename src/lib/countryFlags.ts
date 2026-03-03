export const getCountryFlag = (country: string): string => {
  const flags: Record<string, string> = {
    "United States": "🇺🇸",
    "USA": "🇺🇸",
    "United Kingdom": "🇬🇧",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷",
    "Japan": "🇯🇵",
    "Italy": "🇮🇹",
    "Spain": "🇪🇸",
    "Germany": "🇩🇪",
    "India": "🇮🇳",
    "Brazil": "🇧🇷",
    "Australia": "🇦🇺",
    "Mexico": "🇲🇽",
    "Israel": "🇮🇱",
    "Morocco": "🇲🇦",
    "Tanzania": "🇹🇿",
    "Thailand": "🇹🇭",
    "Ukraine": "🇺🇦",
    "Netherlands": "🇳🇱",
    "Switzerland": "🇨🇭",
    "Austria": "🇦🇹",
    "Albania": "🇦🇱",
    "Vatican": "🇻🇦",
    "Vatican City": "🇻🇦",
  };
  return flags[country] || "🌍";
};
