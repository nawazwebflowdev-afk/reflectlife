import { Printer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PrintButtonProps {
  label?: string;
}

const PrintButton = ({ label = "Print / PDF" }: PrintButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label={label}
          className="print-hide fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Printer className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
};

export default PrintButton;
