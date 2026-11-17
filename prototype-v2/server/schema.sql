-- Executar SOMENTE em uma base de desenvolvimento NOVA/ISOLADA.
-- O prefixo dc2_ preserva o esquema dc_* da versão Streamlit.
CREATE TABLE IF NOT EXISTS dc2_rooms (
  id UUID PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  proposal TEXT NOT NULL,
  proposal_review JSONB NOT NULL,
  moderator_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dc2_participants (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES dc2_rooms(id) ON DELETE CASCADE,
  alias VARCHAR(8) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, alias),
  UNIQUE(room_id, secret_hash)
);
CREATE TABLE IF NOT EXISTS dc2_contributions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES dc2_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES dc2_participants(id),
  text TEXT NOT NULL,
  review JSONB NOT NULL,
  user_choice VARCHAR(24) NOT NULL CHECK(user_choice IN ('ENVIAR','ENVIAR_COM_RESSALVA')),
  receipt_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dc2_contributions_room_time ON dc2_contributions(room_id, created_at);
