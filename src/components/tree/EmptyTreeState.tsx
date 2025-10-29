import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
              ? "Your family tree is waiting to grow"
              : "Your friendship web is ready to connect"}
          </h3>
          <p className="text-muted-foreground">
            {mode === "family"
              ? "Start building your family tree by adding your first family member."
              : "Begin weaving your friendship web by adding your first friend."}
          </p>
        </div>

        <Button onClick={onAddConnection} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Add First Connection
        </Button>
      </div>
    </div>
  );
};

export default EmptyTreeState;
