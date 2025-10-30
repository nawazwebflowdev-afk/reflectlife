-- Update all existing templates to €4.99
UPDATE site_templates
SET price = 4.99, is_free = false;

-- Insert new country templates
INSERT INTO site_templates (name, country, preview_url, price, is_free, is_creator_template, description) VALUES
('Turkey - Osman Hamdi Bey', 'Turkey', 'https://ik.imagekit.io/cohen/TurkeyOsman%20Hamdi%20Bey.png?updatedAt=1761838435284', 4.99, false, false, 'Inspired by Turkish master Osman Hamdi Bey'),
('Serbia - Maja Đokić Mihajlović', 'Serbia', 'https://ik.imagekit.io/cohen/SerbiaMaja%20%C4%90oki%C4%87%20Mihajlovi%C4%87.png?updatedAt=1761838435126', 4.99, false, false, 'Inspired by Serbian artist Maja Đokić Mihajlović'),
('Russia - Marc Chagall', 'Russia', 'https://ik.imagekit.io/cohen/RussiaMarcChagall.png?updatedAt=1761838434931', 4.99, false, false, 'Inspired by Russian-French artist Marc Chagall'),
('San Marino - Andrea Mantegna', 'San Marino', 'https://ik.imagekit.io/cohen/SanMarinoAndrea%20Mantegna.png?updatedAt=1761838431777', 4.99, false, false, 'Inspired by Italian Renaissance master Andrea Mantegna'),
('Norway - Edvard Munch', 'Norway', 'https://ik.imagekit.io/cohen/NorwayEdvardMunch.png?updatedAt=1761838429532', 4.99, false, false, 'Inspired by Norwegian expressionist Edvard Munch'),
('Sweden - Hilma af Klint', 'Sweden', 'https://ik.imagekit.io/cohen/SwedenHilmaAtKlint.png?updatedAt=1761838428291', 4.99, false, false, 'Inspired by Swedish abstract art pioneer Hilma af Klint'),
('Slovenia - Ivan Grohar', 'Slovenia', 'https://ik.imagekit.io/cohen/SloveniaIvanGrohar.png?updatedAt=1761838426739', 4.99, false, false, 'Inspired by Slovenian impressionist Ivan Grohar'),
('Portugal - José Malhoa', 'Portugal', 'https://ik.imagekit.io/cohen/PortugalJoseMalhoa.png?updatedAt=1761838425142', 4.99, false, false, 'Inspired by Portuguese realist José Malhoa'),
('Romania - Hermann Sachs', 'Romania', 'https://ik.imagekit.io/cohen/RomaniaHermanSachs.png?updatedAt=1761838415429', 4.99, false, false, 'Inspired by Romanian artist Hermann Sachs'),
('Poland - Jan Matejko', 'Poland', 'https://ik.imagekit.io/cohen/PolandJan%20Matejkos.png?updatedAt=1761838382445', 4.99, false, false, 'Inspired by Polish history painter Jan Matejko'),
('Slovakia - Magdaléna Štrompachová', 'Slovakia', 'https://ik.imagekit.io/cohen/SlovakiaMagdal%C3%A9na%20%C5%A0trompachov%C3%A1.png?updatedAt=1761838343381', 4.99, false, false, 'Inspired by Slovak artist Magdaléna Štrompachová');