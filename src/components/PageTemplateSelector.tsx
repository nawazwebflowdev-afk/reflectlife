import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
}

interface PageTemplateSelectorProps {
  activeTemplateId: string | null;
  templates: Template[];
  onSelect: (templateId: string | null) => Promise<void>;
  label?: string;
}

export const PageTemplateSelector = ({
  activeTemplateId,
  templates,
  onSelect,
  label = "Page Template",
}: PageTemplateSelectorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSelect = async (templateId: string | null) => {
    try {
      await onSelect(templateId);
      toast({
        title: "Template Updated",
        description: templateId ? "Template applied to this page" : "Template removed from this page",
      });
      setOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const activeName = templates.find(t => t.id === activeTemplateId)?.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Image className="h-4 w-4" />
          <span className="hidden sm:inline">{activeName || label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* No template option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              !activeTemplateId ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
          >
            <p className="font-medium text-sm">Default (No template)</p>
            <p className="text-xs text-muted-foreground">Use the standard background</p>
          </button>

          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No templates available. Visit the <a href="/templates" className="underline">Templates page</a> to get started.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`relative cursor-pointer transition-all hover:shadow-md ${
                  activeTemplateId === template.id
                    ? "ring-2 ring-primary shadow-elegant"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelect(template.id)}
              >
                <CardContent className="p-0">
                  <div className="relative h-28 overflow-hidden rounded-t-lg">
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                    )}
                    {activeTemplateId === template.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-medium text-xs truncate">{template.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
