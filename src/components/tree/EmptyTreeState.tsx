import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { tr } from "@/i18n/tr";
interface EmptyTreeStateProps {
  mode: "family" | "friendship";
  onAddConnection: () => void;
}

const EmptyTreeState = ({ mode, onAddConnection }: EmptyTreeStateProps) => {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="text-8xl mb-4">
          {mode === "family" ? "🌱" : "🕸️"}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold">
            {mode === "family"
              ? tr("a.366f739839")
              : tr("a.05e05df531")}
          </h3>
          <p className="text-muted-foreground">
            {mode === "family"
              ? tr("a.419f7810ea")
              : tr("a.c1391825f1")}
          </p>
        </div>

        <Button onClick={onAddConnection} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {tr("a.ddb8c8a4e4")}
        </Button>
      </div>
    </div>
  );
};

export default EmptyTreeState;
