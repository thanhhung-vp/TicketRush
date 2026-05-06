ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS news_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(180) NOT NULL,
  summary      VARCHAR(280),
  content      TEXT NOT NULL,
  image_url    VARCHAR(500),
  status       VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by   UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_posts_status_published
  ON news_posts(status, published_at DESC, created_at DESC);
