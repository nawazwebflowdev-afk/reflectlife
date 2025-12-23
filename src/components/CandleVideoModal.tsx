import { useState } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CandleVideoModalProps {
  memorialName: string;
}

export const CandleVideoModal = ({ memorialName }: CandleVideoModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        >
          <Flame className="h-4 w-4" />
          Light a Candle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-amber-500/20">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center text-amber-100 font-serif">
            In Memory of {memorialName}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full">
          <video
            src="/videos/memorial-candle.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-center text-amber-100/80 text-sm italic">
              A light of remembrance burns eternal
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
