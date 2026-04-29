-- Seed: bancos y billeteras base
INSERT INTO banks (name, slug, type) VALUES
  ('Banco Galicia', 'galicia', 'bank'),
  ('Banco Santander', 'santander', 'bank'),
  ('BBVA Argentina', 'bbva', 'bank'),
  ('Banco Macro', 'macro', 'bank'),
  ('Banco Ciudad', 'ciudad', 'bank'),
  ('Banco Provincia', 'bapro', 'bank'),
  ('ICBC', 'icbc', 'bank'),
  ('Naranja X', 'naranja-x', 'bank'),
  ('Modo', 'modo', 'wallet'),
  ('Mercado Pago', 'mercadopago', 'wallet')
ON CONFLICT (slug) DO NOTHING;

-- Seed: tarjetas principales por banco
INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Crédito', 'credit', 'visa' FROM banks b WHERE b.slug = 'galicia'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Débito', 'debit', 'visa' FROM banks b WHERE b.slug = 'galicia'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Mastercard Crédito', 'credit', 'mastercard' FROM banks b WHERE b.slug = 'galicia'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Crédito', 'credit', 'visa' FROM banks b WHERE b.slug = 'santander'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Débito', 'debit', 'visa' FROM banks b WHERE b.slug = 'santander'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Mastercard Crédito', 'credit', 'mastercard' FROM banks b WHERE b.slug = 'santander'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Crédito', 'credit', 'visa' FROM banks b WHERE b.slug = 'bbva'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Mastercard Crédito', 'credit', 'mastercard' FROM banks b WHERE b.slug = 'bbva'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Crédito', 'credit', 'visa' FROM banks b WHERE b.slug = 'macro'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Visa Débito', 'debit', 'visa' FROM banks b WHERE b.slug = 'macro'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Mastercard Crédito', 'credit', 'mastercard' FROM banks b WHERE b.slug = 'naranja-x'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Naranja X Prepaga', 'debit', 'mastercard' FROM banks b WHERE b.slug = 'naranja-x'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Tarjeta Modo', 'debit', 'none' FROM banks b WHERE b.slug = 'modo'
ON CONFLICT DO NOTHING;

INSERT INTO cards (bank_id, name, card_type, network)
SELECT b.id, 'Tarjeta Mercado Pago', 'debit', 'mastercard' FROM banks b WHERE b.slug = 'mercadopago'
ON CONFLICT DO NOTHING;

-- Seed: descuentos de ejemplo para desarrollo
INSERT INTO discounts (title, description, percentage, max_reintegro, category, days_of_week, valid_from, valid_to, source_url, scrape_hash)
VALUES
  (
    '30% en supermercados con Galicia',
    'Descuento en supermercados seleccionados pagando con tarjeta Galicia.',
    30, 3000, 'supermercado', ARRAY[2, 4], '2024-01-01', '2024-12-31',
    'https://www.galicia.ar/beneficios',
    'galicia-super-30-2024'
  ),
  (
    '20% en gastronomía con Santander',
    'Reintegro en restaurantes y deliveries con tarjeta Santander.',
    20, 2000, 'gastronomia', ARRAY[5, 6], '2024-01-01', '2024-12-31',
    'https://www.santander.com.ar/beneficios',
    'santander-gastro-20-2024'
  ),
  (
    '25% en farmacias con BBVA',
    'Descuento en farmacias adheridas con cualquier tarjeta BBVA.',
    25, 1500, 'farmacia', ARRAY[1, 3, 5], '2024-01-01', '2024-12-31',
    'https://www.bbva.com.ar/beneficios',
    'bbva-farmacia-25-2024'
  )
ON CONFLICT (scrape_hash) DO NOTHING;

-- Vincular descuentos con bancos
INSERT INTO discount_banks (discount_id, bank_id)
SELECT d.id, b.id FROM discounts d, banks b
WHERE d.scrape_hash = 'galicia-super-30-2024' AND b.slug = 'galicia'
ON CONFLICT DO NOTHING;

INSERT INTO discount_banks (discount_id, bank_id)
SELECT d.id, b.id FROM discounts d, banks b
WHERE d.scrape_hash = 'santander-gastro-20-2024' AND b.slug = 'santander'
ON CONFLICT DO NOTHING;

INSERT INTO discount_banks (discount_id, bank_id)
SELECT d.id, b.id FROM discounts d, banks b
WHERE d.scrape_hash = 'bbva-farmacia-25-2024' AND b.slug = 'bbva'
ON CONFLICT DO NOTHING;

-- Vincular descuentos con tarjetas
INSERT INTO discount_cards (discount_id, card_id)
SELECT d.id, c.id FROM discounts d, cards c, banks b
WHERE d.scrape_hash = 'galicia-super-30-2024' AND b.slug = 'galicia' AND c.bank_id = b.id
ON CONFLICT DO NOTHING;

INSERT INTO discount_cards (discount_id, card_id)
SELECT d.id, c.id FROM discounts d, cards c, banks b
WHERE d.scrape_hash = 'santander-gastro-20-2024' AND b.slug = 'santander' AND c.bank_id = b.id
ON CONFLICT DO NOTHING;

INSERT INTO discount_cards (discount_id, card_id)
SELECT d.id, c.id FROM discounts d, cards c, banks b
WHERE d.scrape_hash = 'bbva-farmacia-25-2024' AND b.slug = 'bbva' AND c.bank_id = b.id
ON CONFLICT DO NOTHING;
