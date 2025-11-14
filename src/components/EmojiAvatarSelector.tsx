import { Card } from "@/components/ui/card";
import { cn } from "@/utils";
import { AVATARS } from "@/config/avatars";

interface AvatarSelectorProps {
  selectedAvatar: number;
  onSelectAvatar: (index: number) => void;
  size?: "sm" | "md" | "lg";
}

export const AvatarSelector = ({
  selectedAvatar,
  onSelectAvatar,
  size = "md",
}: AvatarSelectorProps) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };

  return (
    <div className="grid grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
      {AVATARS.map((avatar, index) => (
        <Card
          key={index}
          className={cn(
            "flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:shadow-md p-1",
            sizeClasses[size],
            selectedAvatar === index
              ? "ring-2 ring-primary shadow-lg scale-105"
              : "hover:ring-1 hover:ring-primary/50"
          )}
          onClick={() => onSelectAvatar(index)}
        >
          <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover rounded" />
        </Card>
      ))}
    </div>
  );
};

interface AvatarDisplayProps {
  avatarIndex: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const AvatarDisplay = ({ avatarIndex, size = "md", className }: AvatarDisplayProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full overflow-hidden bg-muted",
        sizeClasses[size],
        className
      )}
    >
      <img 
        src={AVATARS[avatarIndex % AVATARS.length]} 
        alt={`Avatar ${avatarIndex + 1}`} 
        className="w-full h-full object-cover"
      />
    </div>
  );
};
