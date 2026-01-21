-- Bestehende Services löschen
DELETE FROM services;

-- Neue Services einfügen
INSERT INTO services (name_de, name_en, description_de, description_en, duration, price_cents, display_order, is_active) VALUES
('Haarschnitt', 'Haircut', 'Kurz oder lang', 'Short or long', 30, 2000, 1, true),
('Bartrasur', 'Beard Shave', 'Nassrasur mit Schaum und einem heißen Handtuch', 'Wet shave with foam and a hot towel', 20, 1500, 2, true),
('Haare und Bart', 'Hair and Beard', 'Haarschnitt und Bartpflege Kombi', 'Haircut and beard care combo', 45, 3500, 3, true),
('Augenbrauen', 'Eyebrows', 'Mit Faden', 'With thread', 10, 800, 4, true),
('Maschinen Haarschnitt', 'Buzz Cut', 'Auf eine Länge', 'One length all over', 15, 1200, 5, true),
('Waschen', 'Wash', 'Haarwäsche', 'Hair wash', 5, 300, 6, true),
('Komplett Paket', 'Complete Package', 'Schneiden, Waschen, Föhnen, Styling, Augenbrauen, Bartrasur', 'Cut, wash, blow-dry, styling, eyebrows, beard shave', 60, 4000, 7, true),
('Kinderhaarschnitt', 'Kids Haircut', 'Bis 12 Jahre', 'Up to 12 years', 25, 1500, 8, true);
