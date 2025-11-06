-- Add new columns to connections table for enhanced tree functionality
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS related_person_name text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS x_pos numeric,
ADD COLUMN IF NOT EXISTS y_pos numeric;

-- Make person_id nullable (since we now support adding people not in the system)
ALTER TABLE public.connections
ALTER COLUMN person_id DROP NOT NULL;

-- Add a check to ensure either person_id or related_person_name is set
ALTER TABLE public.connections
ADD CONSTRAINT check_person_reference CHECK (
  (person_id IS NOT NULL) OR (related_person_name IS NOT NULL)
);

-- Update existing records to have default positions
UPDATE public.connections
SET x_pos = 0, y_pos = 0
WHERE x_pos IS NULL OR y_pos IS NULL;