
-- Remove the 2 duplicate Daniela entries (keep only the first one)
DELETE FROM connections WHERE id IN (
  '75852e0e-a6db-4f19-801e-9a6fd8bd83ac',
  '3773f411-4fa0-450b-94ca-0033e826f797'
);

-- Fix the remaining Daniela to be a family connection (matching her parent Rosa)
UPDATE connections 
SET connection_type = 'family' 
WHERE id = '1f609f64-0baa-4682-ad95-c6a5c5543675';
