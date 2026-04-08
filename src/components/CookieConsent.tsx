import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Flame } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils";

type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  personalization: boolean;
};

const COOKIE_CONSENT_KEY = "reflectlife-cookie-consent";

const getStoredConsent = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    personalization: false,
  });

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveAndClose = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setAnimateOut(true);
    setTimeout(() => setVisible(false), 300);
  };

  const handleAcceptAll = () => {
    saveAndClose({ essential: true, analytics: true, personalization: true });
  };

  const handleEssentialOnly = () => {
    saveAndClose({ essential: true, analytics: false, personalization: false });
  };

  const handleSavePreferences = () => {
    saveAndClose(preferences);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300",
          animateOut ? "opacity-0" : "opacity-100"
        )}
        onClick={handleEssentialOnly}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("cookies.title")}
        className={cn(
          "relative w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] border border-white/60 overflow-hidden transition-all duration-300 ease-out",
          animateOut
            ? "opacity-0 translate-y-4 scale-[0.98]"
            : "opacity-100 translate-y-0 scale-100",
          !animateOut && "animate-[cookieSlideUp_0.4s_ease-out]"
        )}
      >
        <div className="p-7 sm:p-8">
          {!showPreferences ? (
            /* ── Main consent view ── */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#8A2BE2]/8">
                  <Flame className="w-[18px] h-[18px] text-[#8A2BE2]" strokeWidth={1.8} />
                </div>
                <h2 className="text-[17px] font-semibold text-gray-900 tracking-[-0.01em]">
                  {t("cookies.title")}
                </h2>
              </div>

              {/* Body */}
              <p className="text-[14.5px] leading-[1.65] text-gray-500">
                {t("cookies.description")}
              </p>

              {/* Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleAcceptAll}
                  className="w-full h-11 rounded-xl bg-[#8A2BE2] text-white text-[14.5px] font-medium shadow-[0_2px_12px_-3px_rgba(138,43,226,0.4)] hover:bg-[#7B27CC] hover:shadow-[0_4px_16px_-3px_rgba(138,43,226,0.5)] active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2"
                  aria-label={t("cookies.acceptAll")}
                >
                  {t("cookies.acceptAll")}
                </button>
                <div className="flex gap-2.5">
                  <button
                    onClick={handleEssentialOnly}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-[13.5px] font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2"
                    aria-label={t("cookies.essentialOnly")}
                  >
                    {t("cookies.essentialOnly")}
                  </button>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-[13.5px] font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2"
                    aria-label={t("cookies.customize")}
                  >
                    {t("cookies.customize")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Preferences panel ── */
            <div className="space-y-5 animate-[cookieFadeIn_0.25s_ease-out]">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#8A2BE2]/8">
                  <Shield className="w-[18px] h-[18px] text-[#8A2BE2]" strokeWidth={1.8} />
                </div>
                <h2 className="text-[17px] font-semibold text-gray-900 tracking-[-0.01em]">
                  {t("cookies.preferencesTitle")}
                </h2>
              </div>

              {/* Categories */}
              <div className="space-y-1">
                {/* Essential */}
                <div className="flex items-center justify-between py-3.5 px-1">
                  <div className="pr-4">
                    <p className="text-[14px] font-medium text-gray-800">
                      {t("cookies.essential")}
                    </p>
                    <p className="text-[12.5px] text-gray-400 mt-0.5 leading-relaxed">
                      {t("cookies.essentialDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={true}
                    disabled
                    className="opacity-50 data-[state=checked]:bg-[#8A2BE2]"
                    aria-label={t("cookies.essential")}
                  />
                </div>
                <div className="h-px bg-gray-100 mx-1" />

                {/* Analytics */}
                <div className="flex items-center justify-between py-3.5 px-1">
                  <div className="pr-4">
                    <p className="text-[14px] font-medium text-gray-800">
                      {t("cookies.analytics")}
                    </p>
                    <p className="text-[12.5px] text-gray-400 mt-0.5 leading-relaxed">
                      {t("cookies.analyticsDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={(v) =>
                      setPreferences((p) => ({ ...p, analytics: v }))
                    }
                    className="data-[state=checked]:bg-[#8A2BE2]"
                    aria-label={t("cookies.analytics")}
                  />
                </div>
                <div className="h-px bg-gray-100 mx-1" />

                {/* Personalization */}
                <div className="flex items-center justify-between py-3.5 px-1">
                  <div className="pr-4">
                    <p className="text-[14px] font-medium text-gray-800">
                      {t("cookies.personalization")}
                    </p>
                    <p className="text-[12.5px] text-gray-400 mt-0.5 leading-relaxed">
                      {t("cookies.personalizationDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.personalization}
                    onCheckedChange={(v) =>
                      setPreferences((p) => ({ ...p, personalization: v }))
                    }
                    className="data-[state=checked]:bg-[#8A2BE2]"
                    aria-label={t("cookies.personalization")}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleSavePreferences}
                  className="w-full h-11 rounded-xl bg-[#8A2BE2] text-white text-[14.5px] font-medium shadow-[0_2px_12px_-3px_rgba(138,43,226,0.4)] hover:bg-[#7B27CC] hover:shadow-[0_4px_16px_-3px_rgba(138,43,226,0.5)] active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2"
                >
                  {t("cookies.savePreferences")}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="w-full h-10 rounded-xl border border-gray-200 text-gray-600 text-[13.5px] font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A2BE2] focus-visible:ring-offset-2"
                >
                  {t("cookies.acceptAll")}
                </button>
              </div>
            </div>
          )}

          {/* Trust links */}
          <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
            <a
              href="/privacy-policy"
              className="text-[12px] text-gray-400 hover:text-[#8A2BE2] transition-colors duration-200"
            >
              {t("cookies.privacyPolicy")}
            </a>
            <span className="text-gray-200 text-[10px]">·</span>
            <a
              href="/privacy-policy#cookies"
              className="text-[12px] text-gray-400 hover:text-[#8A2BE2] transition-colors duration-200"
            >
              {t("cookies.cookiePolicy")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
