// Avatar configuration - centralized avatar system
import avatar1 from "@/assets/avatars/avatar-1.webp";
import avatar2 from "@/assets/avatars/avatar-2.webp";
import avatar3 from "@/assets/avatars/avatar-3.webp";
import avatar4 from "@/assets/avatars/avatar-4.webp";
import avatar5 from "@/assets/avatars/avatar-5.webp";
import avatar6 from "@/assets/avatars/avatar-6.webp";
import avatar7 from "@/assets/avatars/avatar-7.webp";
import avatar8 from "@/assets/avatars/avatar-8.webp";
import avatar9 from "@/assets/avatars/avatar-9.webp";
import avatar10 from "@/assets/avatars/avatar-10.webp";
import avatar11 from "@/assets/avatars/avatar-11.webp";
import avatar12 from "@/assets/avatars/avatar-12.webp";
import avatar13 from "@/assets/avatars/avatar-13.webp";
import avatar14 from "@/assets/avatars/avatar-14.webp";
import avatar15 from "@/assets/avatars/avatar-15.webp";
import avatar16 from "@/assets/avatars/avatar-16.webp";
import avatar17 from "@/assets/avatars/avatar-17.webp";
import avatar18 from "@/assets/avatars/avatar-18.webp";
import avatar19 from "@/assets/avatars/avatar-19.webp";
import avatar20 from "@/assets/avatars/avatar-20.webp";
import avatar21 from "@/assets/avatars/avatar-21.webp";
import avatar22 from "@/assets/avatars/avatar-22.webp";
import avatar23 from "@/assets/avatars/avatar-23.webp";
import avatar24 from "@/assets/avatars/avatar-24.webp";
import avatar25 from "@/assets/avatars/avatar-25.webp";
import avatar26 from "@/assets/avatars/avatar-26.webp";
import avatar27 from "@/assets/avatars/avatar-27.webp";

export const AVATARS = [
  avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8, avatar9,
  avatar10, avatar11, avatar12, avatar13, avatar14, avatar15, avatar16, avatar17,
  avatar18, avatar19, avatar20, avatar21, avatar22, avatar23, avatar24, avatar25,
  avatar26, avatar27
];

export const getAvatarByIndex = (index: number): string => {
  return AVATARS[index % AVATARS.length];
};

// For backwards compatibility with emoji system
export const getAvatarIndexFromEmoji = (emoji: string): number => {
  const emojiMap: { [key: string]: number } = {
    "🌸": 0, "🕊️": 1, "🌻": 2, "🪶": 3, "💫": 4, "🕯️": 5,
    "💐": 6, "🦋": 7, "🌿": 8, "⭐": 9, "🌙": 10, "🌺": 11
  };
  return emojiMap[emoji] ?? 0;
};
