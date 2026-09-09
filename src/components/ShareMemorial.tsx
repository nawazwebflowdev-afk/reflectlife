import { Facebook, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareMemorialProps {
  name: string;
  title?: string;
  description?: string;
  shareText?: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.03-1.378l-.36-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.534.26l.19-2.712 4.94-4.465c.215-.19-.047-.297-.332-.107L8.55 13.63l-2.66-.83c-.578-.183-.59-.578.12-.855l10.4-4.006c.485-.176.913.107.756.86z" />
  </svg>
);

const ViberIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817c-.06 3.11-.13 8.937 5.487 10.517v2.416s-.037.978.61 1.177c.777.24 1.234-.5 1.978-1.3.408-.44.973-1.087 1.398-1.58 3.842.323 6.795-.416 7.13-.525.775-.252 5.164-.813 5.878-6.64.735-6.005-.36-9.803-2.34-11.517C20.176.842 17.83.026 15.6.001c0 0-.245-.033-1.4-.033-1.005 0-2.42.033-2.8.033zm.078 1.706c1.11 0 2.462.005 2.462.005 2.13.024 4.005.703 5.323 1.837 1.586 1.37 2.34 4.44 1.777 9.4-.59 4.844-4.078 5.13-4.687 5.34-.283.09-2.99.755-6.34.535 0 0-2.5 3.017-3.28 3.8-.24.24-.51.217-.51-.267l.017-4.98c-4.755-1.32-4.478-6.29-4.43-8.887.055-2.6.548-4.727 1.997-6.16 1.958-1.79 5.477-2.058 6.822-2.077l.85-.005zm.313 2.42a.32.32 0 00-.317.32.32.32 0 00.317.32c1.51.005 2.755.5 3.756 1.475 1.024 1 1.523 2.35 1.523 4.03a.32.32 0 00.318.32.32.32 0 00.318-.32c0-1.83-.567-3.36-1.72-4.487-1.144-1.122-2.55-1.683-4.195-1.688zm-3.24 1.006c-.246-.03-.494.02-.717.14h-.02c-.517.303-.984.687-1.386 1.15-.007.005-.014.007-.02.014-.34.406-.523.816-.572 1.213-.03.235.008.472.11.687l.005.005c.32.75.72 1.465 1.19 2.126.61.917 1.36 1.727 2.223 2.4l.03.043.038.032.036.028.038.03c.677.87 1.5 1.617 2.435 2.2.66.462 1.372.858 2.12 1.175l.038.017c.202.096.42.146.638.15h.023c.4-.048.816-.234 1.222-.573.007-.007.014-.01.02-.017.464-.402.848-.868 1.15-1.386v-.014c.183-.343.148-.667-.113-.887-.657-.575-1.374-1.077-2.14-1.5-.51-.28-1.033-.11-1.245.174l-.44.56c-.226.276-.65.24-.65.24l-.013.007c-2.34-.6-2.965-2.983-2.965-2.983s-.036-.436.244-.656l.554-.437c.28-.216.463-.735.174-1.245-.42-.766-.923-1.485-1.5-2.14-.116-.132-.256-.223-.4-.276zm4.35.176a.32.32 0 00-.32.318.32.32 0 00.318.32c1.115.007 1.966.383 2.634 1.06.667.68 1.006 1.505 1.008 2.582a.32.32 0 00.32.318.32.32 0 00.318-.32c-.004-1.213-.416-2.238-1.194-3.032-.78-.795-1.816-1.24-3.084-1.246zm.646 2.088a.32.32 0 00-.283.353.32.32 0 00.354.283c.478.03.837.19 1.076.44.24.25.386.612.4 1.085a.32.32 0 00.32.31.32.32 0 00.318-.328c-.017-.575-.207-1.066-.545-1.42-.34-.354-.83-.575-1.42-.628a.32.32 0 00-.07 0z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.053 1.805.249 2.227.415.56.217.96.477 1.38.896.42.42.679.819.896 1.38.164.422.36 1.057.413 2.227.059 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.053 1.17-.249 1.805-.413 2.227a3.72 3.72 0 01-.896 1.38 3.72 3.72 0 01-1.38.896c-.422.164-1.057.36-2.227.413-1.266.059-1.646.07-4.85.07s-3.584-.011-4.85-.07c-1.17-.053-1.805-.249-2.227-.413a3.72 3.72 0 01-1.38-.896 3.72 3.72 0 01-.896-1.38c-.164-.422-.36-1.057-.413-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.053-1.17.249-1.805.413-2.227.217-.56.477-.96.896-1.38.42-.42.819-.679 1.38-.896.422-.164 1.057-.36 2.227-.413C8.416 2.175 8.796 2.163 12 2.163zM12 0C8.741 0 8.332.014 7.052.072 5.775.13 4.902.333 4.14.63a5.88 5.88 0 00-2.126 1.384A5.88 5.88 0 00.63 4.14C.333 4.902.131 5.775.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.059 1.277.261 2.15.558 2.912a5.88 5.88 0 001.384 2.126A5.88 5.88 0 004.14 23.37c.762.297 1.635.499 2.912.558C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.059 2.15-.261 2.912-.558a5.88 5.88 0 002.126-1.384 5.88 5.88 0 001.384-2.126c.297-.762.499-1.635.558-2.912C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.948c-.059-1.277-.261-2.15-.558-2.912a5.88 5.88 0 00-1.384-2.126A5.88 5.88 0 0019.86.63c-.762-.297-1.635-.5-2.912-.558C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);


export const ShareMemorial = ({
  name,
  title = "Share this Memorial",
  description = "Help family and friends remember and celebrate this loved one's life.",
  shareText,
}: ShareMemorialProps) => {
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText ?? `Remembering ${name}`);

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
      icon: XIcon,
      hoverColor: "hover:bg-black hover:text-white hover:border-black",
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: WhatsAppIcon,
      hoverColor: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
    {
      label: "Share on Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: TelegramIcon,
      hoverColor: "hover:bg-[#26A5E4] hover:text-white hover:border-[#26A5E4]",
    },
    {
      label: "Share on Viber",
      href: `viber://forward?text=${encodedText}%20${encodedUrl}`,
      icon: ViberIcon,
      hoverColor: "hover:bg-[#7360F2] hover:text-white hover:border-[#7360F2]",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied successfully.");
    } catch {
      toast.error("Could not copy link. Please try again.");
    }
  };

  return (
    <section className="my-10 py-8 px-6 rounded-2xl bg-card/80 backdrop-blur-sm shadow-elegant border border-border">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground mb-6">
          {description}
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
            aria-label="Copy Link"
            title="Copy Link"
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
