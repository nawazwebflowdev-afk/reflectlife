-- Add emoji_avatar column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emoji_avatar TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.emoji_avatar IS 'Emoji avatar selected by user as alternative to photo';