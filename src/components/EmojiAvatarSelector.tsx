import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils";

export const AVATAR_EMOJIS = ["🌸", "🕊️", "🌻", "🪶", "💫", "🕯️", "💐", "🦋", "🌿", "⭐", "🌙", "🌺"];

interface EmojiAvatarSelectorProps {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
  size?: "sm" | "md" | "lg";
}

export const EmojiAvatarSelector = ({
  selectedEmoji,
  onSelectEmoji,
  size = "md",
}: EmojiAvatarSelectorProps) => {
  const sizeClasses = {
    sm: "text-2xl w-10 h-10",
    md: "text-3xl w-14 h-14",
    lg: "text-4xl w-16 h-16",
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_EMOJIS.map((emoji) => (
        <Card
          key={emoji}
          className={cn(
            "flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:shadow-md",
            sizeClasses[size],
            selectedEmoji === emoji
              ? "ring-2 ring-primary shadow-lg scale-105"
              : "hover:ring-1 hover:ring-primary/50"
          )}
          onClick={() => onSelectEmoji(emoji)}
        >
          <span className={sizeClasses[size]}>{emoji}</span>
        </Card>
      ))}
    </div>
  );
};

interface EmojiAvatarProps {
  emoji: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const EmojiAvatar = ({ emoji, size = "md", className }: EmojiAvatarProps) => {
  const sizeClasses = {
    sm: "text-xl w-8 h-8",
    md: "text-2xl w-10 h-10",
    lg: "text-4xl w-16 h-16",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10",
        sizeClasses[size],
        className
      )}
    >
      <span>{emoji}</span>
    </div>
  );
};
