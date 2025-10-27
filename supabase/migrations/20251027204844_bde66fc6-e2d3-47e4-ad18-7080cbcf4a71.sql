-- Clear existing seed data
DELETE FROM site_templates WHERE creator_id IS NULL;

-- Insert new template records
INSERT INTO site_templates (country, name, preview_url, price, is_free, description) VALUES
  ('England', 'William Turner', 'https://i.imgur.com/G17A7pg.jpg', 0, true, 'An expressive and heartfelt memorial design inspired by England and William Turner, reflecting the beauty of remembrance.'),
  ('Mexico', 'Frida', 'https://i.imgur.com/4yHnE3R.jpg', 0, true, 'A vibrant and colorful memorial design inspired by Mexico and Frida Kahlo, celebrating life and memory.'),
  ('India', 'Abanindranath Tagores', 'https://i.imgur.com/9UGnBLn.jpg', 0, true, 'An elegant and spiritual memorial design inspired by India and Abanindranath Tagore, honoring cultural heritage.'),
  ('Australia', 'Alvera Bird', 'https://i.imgur.com/GRtpqNP.jpg', 0, true, 'A natural and serene memorial design inspired by Australia and Alvera Bird, connecting with nature.'),
  ('Israel', 'Tod Lindenmuths', 'https://i.imgur.com/6ry0GgF.jpg', 12, false, 'A meaningful and artistic memorial design inspired by Israel and Tod Lindenmuth, capturing timeless beauty.'),
  ('Morocco', 'Jacques Majorelle', 'https://i.imgur.com/D7lvrIi.jpg', 15, false, 'A stunning and bold memorial design inspired by Morocco and Jacques Majorelle, featuring rich colors and patterns.'),
  ('Tanzania', 'Damian B Msagula', 'https://i.imgur.com/0kLmJI0.jpg', 10, false, 'A powerful and authentic memorial design inspired by Tanzania and Damian B Msagula, celebrating African artistry.'),
  ('Thailand', 'Abanindranath Tagores', 'https://i.imgur.com/LbqoXSF.jpg', 8, false, 'A peaceful and harmonious memorial design inspired by Thailand and traditional Asian art, honoring spiritual connections.'),
  ('Ukraine', 'Ukrainian Heritage', 'https://i.imgur.com/tsNpGDh.jpg', 18, false, 'A touching and resilient memorial design inspired by Ukraine, reflecting strength and remembrance.'),
  ('USA', 'Keith Haring', 'https://i.imgur.com/ZIAbP3H.jpg', 20, false, 'A contemporary and energetic memorial design inspired by USA and Keith Haring, celebrating modern artistic expression.');