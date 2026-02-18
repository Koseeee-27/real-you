-- Users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY,
  self_mbti VARCHAR(10),
  baseline_caution INT NOT NULL,
  baseline_calmness INT NOT NULL,
  baseline_logic INT NOT NULL,
  baseline_coop INT NOT NULL,
  baseline_positive INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GameLogs テーブル
CREATE TABLE game_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_type INT NOT NULL CHECK (game_type IN (1, 2, 3)),
  raw_data JSONB NOT NULL,
  played_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- インデックス
CREATE INDEX idx_game_logs_user_id ON game_logs(user_id);
CREATE INDEX idx_game_logs_game_type ON game_logs(game_type);
