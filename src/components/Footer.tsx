import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import reflectlifeLogo from "@/assets/reflectlife-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src={reflectlifeLogo} 
                alt="Reflectlife" 
                className="h-10 w-auto object-contain transition-smooth group-hover:scale-105"
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              A timeless space to celebrate, remember, and share the stories of those who live on in our hearts.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-destructive fill-destructive" />
              <span>for remembrance</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/memorials" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Memorial Wall
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-serif font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Settings
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Help Centre
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Reflectlife. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
