-- SOMENTE no projeto novo V2, banco decisao_v2; executar como dc2_owner.
-- dc2_app deve ter sido criada como função read_only, sem neon_superuser.
-- Não aplicar em banco histórico. Não contém senhas.
GRANT INSERT ON dc2_rooms, dc2_participants, dc2_snapshots TO dc2_app;
GRANT UPDATE(id) ON dc2_rooms TO dc2_app;
-- UPDATE(id) em rooms permite SELECT ... FOR UPDATE do repositório.
-- Não conceder UPDATE/DELETE em dc2_snapshots.
