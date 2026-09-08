import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import reflectlifeLogo from "@/assets/reflectlife-logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-muted/30 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 group">
              <img src={reflectlifeLogo} alt="Reflectlife" className="h-10 w-auto object-contain transition-smooth group-hover:scale-105" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              {t("footer.tagline")}
            </p>
            <div className="text-sm text-muted-foreground">
              Made with ❤️ for a life we never forget and to heal our souls
            </div>
          </div>

          <div>
            <h3 className="font-serif font-semibold text-foreground mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("nav.home")}</Link></li>
              <li><Link to="/memorials" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("nav.memorialWall")}</Link></li>
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("nav.dashboard")}</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("footer.about")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-semibold text-foreground mb-4">{t("footer.support")}</h3>
            <ul className="space-y-2">
              <li><Link to="/cookie-policy" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("footer.cookiePolicy")}</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">Terms & Conditions</Link></li>
              <li><Link to="/qa" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("footer.qa")}</Link></li>
              <li><Link to="/help" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("footer.helpCentre")}</Link></li>
              <li><Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{t("footer.privacyPolicy")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Sypera. All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
