-- Bancos y billeteras
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  type TEXT CHECK (type IN ('bank', 'wallet')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarjetas vinculadas a banco
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_type TEXT CHECK (card_type IN ('debit', 'credit')) NOT NULL,
  network TEXT CHECK (network IN ('visa', 'mastercard', 'amex', 'none')) NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descuentos
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  percentage INT,
  max_reintegro NUMERIC,
  category TEXT,
  days_of_week INT[],
  valid_from DATE,
  valid_to DATE,
  terms TEXT,
  source_url TEXT,
  scrape_hash TEXT UNIQUE, -- deduplication key
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descuento <-> banco (muchos a muchos)
CREATE TABLE IF NOT EXISTS discount_banks (
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, bank_id)
);

-- Descuento <-> tarjeta (muchos a muchos)
CREATE TABLE IF NOT EXISTS discount_cards (
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, card_id)
);

-- Tarjetas del usuario
CREATE TABLE IF NOT EXISTS user_cards (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, card_id)
);

-- Favoritos del usuario
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, discount_id)
);

-- Expo push tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  PRIMARY KEY (user_id, token)
);

-- Logs de scraper
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_slug TEXT,
  status TEXT CHECK (status IN ('success', 'error')) NOT NULL,
  discounts_found INT DEFAULT 0,
  error_msg TEXT,
  ran_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_discounts_valid_to ON discounts(valid_to);
CREATE INDEX IF NOT EXISTS idx_discounts_category ON discounts(category);
CREATE INDEX IF NOT EXISTS idx_discount_banks_bank ON discount_banks(bank_id);
CREATE INDEX IF NOT EXISTS idx_discount_cards_card ON discount_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);

-- RLS: activar en todas las tablas
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

-- Lectura pública en datos de catálogo
CREATE POLICY "public_read_banks" ON banks FOR SELECT USING (true);
CREATE POLICY "public_read_cards" ON cards FOR SELECT USING (true);
CREATE POLICY "public_read_discounts" ON discounts FOR SELECT USING (true);
CREATE POLICY "public_read_discount_banks" ON discount_banks FOR SELECT USING (true);
CREATE POLICY "public_read_discount_cards" ON discount_cards FOR SELECT USING (true);

-- user_cards: solo propio usuario
CREATE POLICY "user_cards_select" ON user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_cards_insert" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_cards_delete" ON user_cards FOR DELETE USING (auth.uid() = user_id);

-- user_favorites: solo propio usuario
CREATE POLICY "user_favorites_select" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_favorites_insert" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_favorites_delete" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- user_push_tokens: solo propio usuario
CREATE POLICY "push_tokens_select" ON user_push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_insert" ON user_push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_tokens_delete" ON user_push_tokens FOR DELETE USING (auth.uid() = user_id);
