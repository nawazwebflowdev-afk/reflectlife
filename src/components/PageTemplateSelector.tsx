import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
  country: string;
}

type PageType = "memorial" | "tree" | "timeline";

const PROFILE_FIELD_MAP: Record<PageType, string> = {
  memorial: "memorial_template_id",
  tree: "tree_template_id",
  timeline: "timeline_template_id",
};

interface PageTemplateSelectorProps {
  pageType: PageType;
  currentTemplateId: string | null;
  onTemplateChange: (templateId: string | null) => void;
  triggerVariant?: "default" | "outline" | "ghost";
  compact?: boolean;
}

const PageTemplateSelector = ({
  pageType,
  currentTemplateId,
  onTemplateChange,
  triggerVariant = "outline",
  compact = false,
}: PageTemplateSelectorProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_templates")
        .select("id, name, preview_url, country")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (templateId: string | null) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const field = PROFILE_FIELD_MAP[pageType];
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: templateId } as any)
        .eq("id", user.id);

      if (error) throw error;

      onTemplateChange(templateId);
      toast({ title: "Template updated", description: `Your ${pageType} page background has been changed.` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const pageLabel = pageType === "memorial" ? "Memorial Wall" : pageType === "tree" ? "Connection Tree" : "Timeline";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2" size={compact ? "sm" : "default"}>
          <Palette className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">Change Background</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template for {pageLabel}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Select a template to use as the full-page background for your {pageLabel}. This is independent of other pages.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {/* None / Default option */}
              <button
                onClick={() => handleSelect(null)}
                disabled={saving}
                className={`relative rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
                  !currentTemplateId ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
              >
                <div className="aspect-video bg-gradient-to-br from-muted to-background flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">Default</span>
                </div>
                {!currentTemplateId && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>

              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  disabled={saving}
                  className={`relative rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
                    currentTemplateId === template.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                >
                  <div className="aspect-video bg-muted">
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <Palette className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-card">
                    <p className="text-xs font-medium truncate">{template.name}</p>
                  </div>
                  {currentTemplateId === template.id && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PageTemplateSelector;
