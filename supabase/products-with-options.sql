-- ============================================================
--  KRSELLIFY — Products with Descriptions & Quantity Options
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run: deletes & re-inserts by name
-- ============================================================

-- 1. Add columns if not already present
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_options JSONB;

-- 2. Remove existing versions of these products (they will be re-inserted below)
DELETE FROM products WHERE name IN (
  'XRP Nesara/Gesara Gold Bar',
  'Bitcoin Diamond 2025',
  'D.O.G.E COIN',
  'D.O.G.E COIN Collectible',
  'Bitcoin Crypto Passport',
  'Trump 1000 Bitcoins Gold Bar',
  'Nesara Gesara QFS Gold Coin',
  'Trump Legacy One Milli BTC Block',
  'TRUMP WLFI TOKEN'
);

-- 3. Insert all 8 products with full data
INSERT INTO products
  (name, category, price, old_price, is_sale, is_new, rating, reviews_count, img, cat_label, in_stock, description, quantity_options)
VALUES

-- 1. XRP Nesara/Gesara Gold Bar
(
  'XRP Nesara/Gesara Gold Bar',
  'medallions', 199.00, NULL, FALSE, TRUE, 5, 28,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331760/5762187052.webp',
  'Medallions', TRUE,
  'THIS IS IT, PATRIOTS. LIMITED STOCK. ONCE IT''S GONE, IT''S GONE FOR GOOD. With its striking golden finish, precision-engraved XRP emblem, and certified collector presentation, the XRP NESARA/GESARA Gold Bar stands as a bold symbol of a new financial era built on speed, innovation, and American leadership. This is not merely a collectible — it represents the spirit of progress, technological advancement, and the belief in a faster, more connected global economy.',
  '[
    {"label": "1X + 1X FREE XRP Nesara/Gesara Gold Bar", "qty": 2, "bundle_total": 199},
    {"label": "2", "qty": 2, "bundle_total": 398},
    {"label": "5 (+$100.00)", "qty": 5, "bundle_total": 299},
    {"label": "8 (+$300.00)", "qty": 8, "bundle_total": 499},
    {"label": "13 (+$500.00)", "qty": 13, "bundle_total": 699},
    {"label": "20 (+$800.00)", "qty": 20, "bundle_total": 999},
    {"label": "35 (+$1200.00)", "qty": 35, "bundle_total": 1399}
  ]'::jsonb
),

-- 2. Bitcoin Diamond 2025
(
  'Bitcoin Diamond 2025',
  'crypto', 399.00, 999.00, TRUE, FALSE, 5, 64,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328754/5762178888.webp',
  'Crypto', TRUE,
  'A genuine limited-edition masterpiece. Each diamond is engraved with the Bitcoin insignia and an exclusive Trump 2025 certification seal, symbolizing leadership, value, and strength in the new digital era.',
  '[
    {"label": "3X BTC Diamond 2025 Certified", "qty": 3, "bundle_total": 399},
    {"label": "1", "qty": 1, "bundle_total": 399},
    {"label": "3 (+$200.00)", "qty": 3, "bundle_total": 599},
    {"label": "5 (+$500.00)", "qty": 5, "bundle_total": 899},
    {"label": "10 (+$1000.00)", "qty": 10, "bundle_total": 1399}
  ]'::jsonb
),

-- 3. D.O.G.E COIN
(
  'D.O.G.E COIN',
  'crypto', 199.00, 1999.99, TRUE, FALSE, 4, 112,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328752/5762183409.webp',
  'Crypto', TRUE,
  'The D.O.G.E Coin isn''t just a collectible; it''s a symbol of innovation, freedom, and the next chapter in modern history. A piece designed to inspire conversation, pride, and belief in the future.',
  '[
    {"label": "1", "qty": 1, "bundle_total": 199},
    {"label": "3 (+$100.00)", "qty": 3, "bundle_total": 299},
    {"label": "5 (+$200.00)", "qty": 5, "bundle_total": 399},
    {"label": "10 (+$400.00)", "qty": 10, "bundle_total": 599},
    {"label": "15 (+$600.00)", "qty": 15, "bundle_total": 799},
    {"label": "25 (+$1100.00)", "qty": 25, "bundle_total": 1299}
  ]'::jsonb
),

-- 4. Bitcoin Crypto Passport
(
  'Bitcoin Crypto Passport',
  'collectibles', 399.00, 999.00, TRUE, FALSE, 5, 47,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331761/5762178792.webp',
  'Collectibles', TRUE,
  'Sale Of This Item Is Only Open For The First 1000 Patriots. Christmas demand for the Bitcoin Crypto Passport is skyrocketing — secure yours before this limited Christmas pricing ends.',
  '[
    {"label": "1X Bitcoin Crypto Passport", "qty": 1, "bundle_total": 399},
    {"label": "3 (+$200.00)", "qty": 3, "bundle_total": 599},
    {"label": "5 (+$700.00)", "qty": 5, "bundle_total": 1099},
    {"label": "10 (+$1000.00)", "qty": 10, "bundle_total": 1399}
  ]'::jsonb
),

-- 5. Trump 1000 Bitcoins Gold Bar
(
  'Trump 1000 Bitcoins Gold Bar',
  'collectibles', 199.00, 1999.00, TRUE, FALSE, 5, 89,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328757/5762187026.webp',
  'Collectibles', TRUE,
  'The moment it''s in your hand, you know it''s different. The weight, the brilliance, the craftsmanship — it feels like victory itself. The Trump 1000 Bitcoins Gold Bar isn''t just gold; it''s a statement of power, legacy, and the future of American freedom.',
  '[
    {"label": "1X Trump 1000 Bitcoins Gold Bar", "qty": 1, "bundle_total": 199},
    {"label": "3 (+$200.00)", "qty": 3, "bundle_total": 399},
    {"label": "5 (+$400.00)", "qty": 5, "bundle_total": 599},
    {"label": "10 (+$600.00)", "qty": 10, "bundle_total": 799},
    {"label": "15 (+$800.00)", "qty": 15, "bundle_total": 999},
    {"label": "30 (+$1200.00)", "qty": 30, "bundle_total": 1399}
  ]'::jsonb
),

-- 6. Nesara Gesara QFS Gold Coin
(
  'Nesara Gesara QFS Gold Coin',
  'medallions', 299.00, NULL, FALSE, TRUE, 5, 33,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835401009/5762614918.webp',
  'Medallions', TRUE,
  'THIS IS IT, PATRIOTS. LIMITED STOCK. ONCE IT''S GONE, IT''S GONE FOR GOOD. With its radiant golden finish, precision-engraved details, and certified collector presentation, the QFS Gold Coin stands as a powerful emblem of America''s financial awakening. This is not merely a collectible — it is a symbol of sovereignty, faith, and the enduring belief in transparency, freedom, and a renewed economic future. Created for those who recognize meaning beyond material value, the QFS Gold Coin represents confidence in a brighter, more balanced financial era.',
  '[
    {"label": "2", "qty": 2, "bundle_total": 598},
    {"label": "5 (+$100.00)", "qty": 5, "bundle_total": 399},
    {"label": "8 (+$200.00)", "qty": 8, "bundle_total": 499},
    {"label": "13 (+$400.00)", "qty": 13, "bundle_total": 699},
    {"label": "20 (+$700.00)", "qty": 20, "bundle_total": 999},
    {"label": "35 (+$1100.00)", "qty": 35, "bundle_total": 1399}
  ]'::jsonb
),

-- 7. Trump Legacy One Milli BTC Block
(
  'Trump Legacy One Milli BTC Block',
  'collectibles', 199.00, NULL, FALSE, FALSE, 4, 21,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356299/5773174012.webp',
  'Collectibles', TRUE,
  'THIS IS IT, PATRIOTS. LIMITED STOCK. ONCE IT''S GONE, IT''S GONE FOR GOOD. The Trump Legacy One Milli BTC Block is a commemorative memorabilia collectible designed to symbolize the intersection of technology, independence, and modern innovation. Inspired by the cultural impact of Bitcoin and evolving digital systems, this piece reflects themes of transparency, resilience, and forward-thinking values. Designed solely for display and collectible purposes, it carries no monetary, cryptocurrency, investment, or negotiable value.',
  '[
    {"label": "1X + 1X FREE Trump Legacy One Milli BTC Block", "qty": 2, "bundle_total": 199},
    {"label": "3X + 2X FREE Trump Legacy One Milli BTC Block (+$100.00)", "qty": 5, "bundle_total": 299},
    {"label": "5X + 3X FREE Trump Legacy One Milli BTC Block (+$300.00)", "qty": 8, "bundle_total": 499},
    {"label": "10X + 3X FREE Trump Legacy One Milli BTC Block (+$500.00)", "qty": 13, "bundle_total": 699},
    {"label": "15X + 5X FREE Trump Legacy One Milli BTC Block (+$800.00)", "qty": 20, "bundle_total": 999},
    {"label": "25X + 10X FREE Trump Legacy One Milli BTC Block (+$1200.00)", "qty": 35, "bundle_total": 1399}
  ]'::jsonb
),

-- 8. TRUMP WLFI TOKEN
(
  'TRUMP WLFI TOKEN',
  'crypto', 299.00, NULL, FALSE, TRUE, 5, 15,
  'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356303/5773174048.webp',
  'Crypto', TRUE,
  'This product is a novelty collectible item only. It is not legal tender, not an investment, and cannot be redeemed or exchanged for monetary value. This product is not affiliated with or endorsed by Donald J. Trump or any official organization.',
  '[
    {"label": "1PCS - WLFI TOKEN", "qty": 1, "bundle_total": 299},
    {"label": "3PCS WLFI TOKEN (+$200.00)", "qty": 3, "bundle_total": 499},
    {"label": "5PCS - WLFI TOKEN (+$300.00)", "qty": 5, "bundle_total": 599},
    {"label": "10PCS WLFI TOKEN (+$500.00)", "qty": 10, "bundle_total": 799},
    {"label": "15PCS WLFI TOKEN (+$700.00)", "qty": 15, "bundle_total": 999},
    {"label": "25PCS - WLFI TOKEN (+$900.00)", "qty": 25, "bundle_total": 1199},
    {"label": "35PCS - WLFI TOKEN (+$1100.00)", "qty": 35, "bundle_total": 1399}
  ]'::jsonb
);
