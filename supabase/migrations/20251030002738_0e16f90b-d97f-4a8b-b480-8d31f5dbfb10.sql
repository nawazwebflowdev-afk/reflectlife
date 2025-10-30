-- Add is_creator_template column to site_templates table
ALTER TABLE site_templates
ADD COLUMN IF NOT EXISTS is_creator_template boolean NOT NULL DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_site_templates_is_creator_template 
ON site_templates(is_creator_template) WHERE is_creator_template = true;