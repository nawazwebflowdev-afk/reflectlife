import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActiveTemplate } from "@/hooks/useActiveTemplate";
import { Check, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TemplateBackgroundSelector = () => {
  const { activeTemplate, purchasedTemplates, loading, setActiveTemplate } = useActiveTemplate();
  const { toast } = useToast();

  const handleSelectTemplate = async (templateId: string) => {
    try {
      await setActiveTemplate(templateId);
      toast({
        title: "Background Updated",
        description: "Your active template background has been applied across all pages",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update active template",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (purchasedTemplates.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You haven't purchased any templates yet. Visit the{" "}
          <a href="/templates" className="underline font-medium">Templates page</a>{" "}
          to browse and purchase beautiful memorial templates.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Active Background Template</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which purchased template to use as your background across Profile, Timeline, Tree, and Memorial Wall pages
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {purchasedTemplates.map((template) => (
          <Card
            key={template.id}
            className={`relative cursor-pointer transition-all hover:shadow-elegant ${
              activeTemplate?.id === template.id
                ? 'ring-2 ring-primary shadow-elegant'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSelectTemplate(template.id)}
          >
            <CardContent className="p-0">
              {/* Template Preview */}
              <div className="relative h-40 overflow-hidden rounded-t-lg">
                {template.preview_url ? (
                  <img
                    src={template.preview_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                )}
                
                {/* Active Badge */}
                {activeTemplate?.id === template.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <p className="font-semibold text-sm truncate">{template.name}</p>
                {activeTemplate?.id === template.id ? (
                  <p className="text-xs text-primary font-medium mt-1">Currently Active</p>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template.id);
                    }}
                  >
                    Set as Active
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Your active template will be applied as a subtle background across multiple pages for a personalized experience
      </p>
    </div>
  );
};
