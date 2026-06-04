import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Check, Loader2, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
  country: string;
  is_free: boolean | null;
  price: number | null;
}

type PageType = "memorial" | "tree" | "timeline";
type FilterType = "all" | "my";

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
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [templatesRes, purchasesRes] = await Promise.all([
        supabase.from("site_templates").select("id, name, preview_url, country, is_free, price").order("name"),
        user
          ? supabase
              .from("template_purchases")
              .select("template_id")
              .eq("buyer_id", user.id)
              .eq("payment_status", "success")
          : Promise.resolve({ data: [] }),
      ]);

      setAllTemplates(templatesRes.data || []);
      setPurchasedIds((purchasesRes.data || []).map((p: any) => p.template_id));
    } catch (err: any) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const displayedTemplates = filter === "my" ? allTemplates.filter((t) => purchasedIds.includes(t.id)) : allTemplates;

  const handleSelect = async (templateId: string | null) => {
    // 1. Validation Logic
    if (templateId) {
      const template = allTemplates.find((t) => t.id === templateId);
      const isPaid = template && !template.is_free && (template.price ?? 0) > 0;

      if (isPaid && !purchasedIds.includes(templateId)) {
        toast({
          title: "Purchase required",
          description: `You need to purchase "${template?.name}" before using it.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. Database Update
      const field = PROFILE_FIELD_MAP[pageType];
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: templateId })
        .eq("id", user.id);

      if (error) throw error;

      // 3. UI Sync
      onTemplateChange(templateId);
      toast({
        title: templateId ? "Design applied" : "Canvas cleared",
        description: `Successfully updated to ${templateId ? "selected template" : "default blank view"}.`,
      });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const pageLabel = pageType === "memorial" ? "Memorial Wall" : pageType === "tree" ? "Connection Tree" : "Timeline";
  const triggerLabel =
    pageType === "tree" ? "Tree Design" : pageType === "timeline" ? "Timeline Design" : "Memorial Design";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} className="gap-2 shrink-0" size={compact ? "sm" : "default"}>
          <Palette className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Design for {pageLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">Select a background for your {pageLabel}.</p>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designs</SelectItem>
              <SelectItem value="my">My Purchased</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              <button
                onClick={() => handleSelect(null)}
                disabled={saving}
                className={`relative rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${!currentTemplateId ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <div className="aspect-video bg-gradient-to-br from-muted to-background flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">Blank</span>
                </div>
                {!currentTemplateId && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>

              {displayedTemplates.map((template) => {
                const isPaid = !template.is_free && (template.price ?? 0) > 0;
                const isOwned = purchasedIds.includes(template.id);
                const isLocked = isPaid && !isOwned;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.id)}
                    disabled={saving}
                    className={`relative rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${currentTemplateId === template.id ? "border-primary ring-2 ring-primary/30" : "border-border"} ${isLocked ? "opacity-75" : ""}`}
                  >
                    <div className="aspect-video bg-muted">
                      {template.preview_url ? (
                        <img src={template.preview_url} alt={template.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <Palette className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-card flex items-center justify-between">
                      <p className="text-xs font-medium truncate">{template.name}</p>
                      {isLocked && <span className="text-[10px] font-semibold text-amber-600">€{template.price}</span>}
                    </div>
                    {currentTemplateId === template.id && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PageTemplateSelector;
