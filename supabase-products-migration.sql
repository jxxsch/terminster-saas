-- Produkte-Tabelle für Beban Barbershop
-- Führe dieses SQL im Supabase Dashboard aus (SQL Editor)

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL, -- Preis in Cent
  category VARCHAR(50) NOT NULL, -- bart, haare, rasur, pflege
  image VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für Sortierung
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(category, sort_order);

-- RLS aktivieren
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Lesezugriff
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

-- Initiale Produkte einfügen (ohne Bilder - können später im Admin hinzugefügt werden)
INSERT INTO products (name, price, category, sort_order) VALUES
  ('Schnurrbartwachs', 1490, 'bart', 1),
  ('Bart Pomade', 2990, 'bart', 2),
  ('Bartbürste Dick Johnson', 3500, 'bart', 3),
  ('Bartcreme Balm', 2990, 'bart', 4),
  ('Bartöl Snake Oil 50ml', 2490, 'bart', 5),
  ('Haarwachs Fiber', 1990, 'haare', 1),
  ('Pomade Grease', 1990, 'haare', 2),
  ('Pomade High Sheen', 1990, 'haare', 3),
  ('Pomade Pink', 1990, 'haare', 4),
  ('Reuzel Pomade Blue', 1990, 'haare', 5),
  ('Fibre Wax Insouciant', 2490, 'haare', 6),
  ('Pomade Inepuisable', 2490, 'haare', 7),
  ('Sicherheitsrasierer Gold', 4100, 'rasur', 1),
  ('Sicherheitsrasierer Silber', 4100, 'rasur', 2),
  ('Sicherheitsrasierer Black', 4100, 'rasur', 3),
  ('Kamm Original Dick', 2500, 'rasur', 4),
  ('Hair & Body Wash', 2390, 'pflege', 1);
