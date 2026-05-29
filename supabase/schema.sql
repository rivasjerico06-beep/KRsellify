-- ============================================================
--  KRSELLIFY — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. PRODUCTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT          NOT NULL,
  category      TEXT          NOT NULL,            -- 'medallions' | 'collectibles' | 'crypto' | 'apparel' | 'accessories'
  price         DECIMAL(10,2) NOT NULL,
  old_price     DECIMAL(10,2),
  is_sale       BOOLEAN       DEFAULT FALSE,
  is_new        BOOLEAN       DEFAULT FALSE,
  rating        SMALLINT      DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  reviews_count INTEGER       DEFAULT 0,
  img           TEXT          NOT NULL,
  cat_label     TEXT          NOT NULL,            -- display label e.g. 'Crypto'
  in_stock      BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Row-level security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products"
  ON products FOR SELECT USING (true);

-- ── 2. NEWSLETTER SUBSCRIBERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email          TEXT        UNIQUE NOT NULL,
  subscribed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- ── 3. ORDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  items       JSONB         NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  status      TEXT          DEFAULT 'pending',   -- 'pending' | 'processing' | 'shipped' | 'delivered'
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place orders"
  ON orders FOR INSERT WITH CHECK (true);

-- ── 4. SEED PRODUCTS ─────────────────────────────────────────
INSERT INTO products (name, category, price, old_price, is_sale, is_new, rating, reviews_count, img, cat_label) VALUES
(
  'XRP Nesara/Gesara Gold Bar',
  'medallions', 199.00, NULL, FALSE, TRUE, 5, 28,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331760/5762187052.webp',
  'Medallions'
),
(
  'Bitcoin Diamond 2025',
  'crypto', 399.00, 999.00, TRUE, FALSE, 5, 64,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328754/5762178888.webp',
  'Crypto'
),
(
  'D.O.G.E COIN Collectible',
  'crypto', 199.00, 1999.99, TRUE, FALSE, 4, 112,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328752/5762183409.webp',
  'Crypto'
),
(
  'Bitcoin Crypto Passport',
  'collectibles', 399.00, 999.00, TRUE, FALSE, 5, 47,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331761/5762178792.webp',
  'Collectibles'
),
(
  'Trump 1000 Bitcoins Gold Bar',
  'collectibles', 199.00, 1999.00, TRUE, FALSE, 5, 89,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328757/5762187026.webp',
  'Collectibles'
),
(
  'Nesara Gesara QFS Gold Coin',
  'medallions', 299.00, NULL, FALSE, TRUE, 5, 33,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835401009/5762614918.webp',
  'Medallions'
),
(
  'Trump Legacy One Milli BTC Block',
  'collectibles', 199.00, NULL, FALSE, FALSE, 4, 21,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356299/5773174012.webp',
  'Collectibles'
),
(
  'TRUMP WLFI TOKEN',
  'crypto', 299.00, NULL, FALSE, TRUE, 5, 15,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356303/5773174048.webp',
  'Crypto'
);

-- ── 5. OPTIONAL: Category counts helper view ─────────────────
CREATE OR REPLACE VIEW category_counts AS
SELECT category, cat_label, COUNT(*) AS count
FROM products
WHERE in_stock = TRUE
GROUP BY category, cat_label;
