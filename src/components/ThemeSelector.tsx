import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme, themeColors } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";

const themeOptions = [
  { id: 'default', name: 'Default Plum', description: 'Warm & compassionate' },
  { id: 'blue', name: 'Ocean Blue', description: 'Calm & serene' },
  { id: 'green', name: 'Forest Green', description: 'Natural & peaceful' },
  { id: 'purple', name: 'Royal Purple', description: 'Elegant & dignified' },
  { id: 'pink', name: 'Rose Pink', description: 'Gentle & loving' },
  { id: 'orange', name: 'Sunset Orange', description: 'Warm & uplifting' },
  { id: 'red', name: 'Ruby Red', description: 'Bold & passionate' },
  { id: 'teal', name: 'Teal', description: 'Fresh & balanced' },
];

export const ThemeSelector = () => {
  const { currentTheme, setTheme } = useTheme();

  const getColorPreview = (themeId: string) => {
    const colors = themeColors[themeId as keyof typeof themeColors] || themeColors.default;
    return `hsl(${colors.primary})`;
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Choose Your Theme Color</Label>
      <p className="text-sm text-muted-foreground">
        Select a color theme that will be applied across all pages, buttons, and UI elements
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {themeOptions.map((theme) => (
          <Card
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`relative p-4 cursor-pointer transition-all hover:shadow-elegant hover:-translate-y-1 ${
              currentTheme === theme.id
                ? 'ring-2 ring-primary shadow-elegant'
                : 'hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              {/* Color Preview Circle */}
              <div
                className="w-16 h-16 rounded-full shadow-md relative"
                style={{ backgroundColor: getColorPreview(theme.id) }}
              >
                {currentTheme === theme.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>
              
              {/* Theme Info */}
              <div className="text-center">
                <p className="font-semibold text-sm">{theme.name}</p>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Your theme will be saved and applied instantly across all pages
      </p>
    </div>
  );
};
