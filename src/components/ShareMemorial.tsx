import { Facebook, Twitter, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareMemorialProps {
  name: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.03-1.378l-.36-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const ShareMemorial = ({ name }: ShareMemorialProps) => {
  const memorialUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(memorialUrl);
  const encodedText = encodeURIComponent(`Remembering ${name}`);

  const shareLinks = [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      hoverColor: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      icon: Twitter,
      hoverColor: "hover:bg-foreground hover:text-background hover:border-foreground",
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: WhatsAppIcon,
      hoverColor: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memorialUrl);
      toast.success("Memorial link copied successfully.");
    } catch {
      toast.error("Could not copy link. Please try again.");
    }
  };

  return (
    <section className="my-10 py-8 px-6 rounded-2xl bg-card/80 backdrop-blur-sm shadow-elegant border border-border">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
          Share this Memorial
        </h2>
        <p className="text-muted-foreground mb-6">
          Help family and friends remember and celebrate this loved one's life.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {shareLinks.map(({ label, href, icon: Icon, hoverColor }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className={`group flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${hoverColor}`}
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}

          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy Memorial Link"
            title="Copy Memorial Link"
            className="group flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md hover:bg-primary hover:text-primary-foreground hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Link2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ShareMemorial;
