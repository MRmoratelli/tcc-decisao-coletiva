-- Additive ledger only. Existing rooms, snapshots, votes and answers are untouched.
CREATE TABLE IF NOT EXISTS dc2_provider_budget (
 id SMALLINT PRIMARY KEY CHECK (id=1),
 state JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Recover known unique LIVE_PROVIDER Search usage, without copying text or identities.
WITH retrieved AS (
 SELECT DISTINCT ON (c->'retrieval'->>'requestId') c->'retrieval' AS r
 FROM dc2_snapshots s
 CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.state->'factualChecks','[]'::jsonb)) f
 CROSS JOIN LATERAL jsonb_array_elements(COALESCE(f->'claims','[]'::jsonb)) c
 WHERE f->>'retrievalProvider'='TAVILY' AND f->>'provenance'='LIVE_PROVIDER'
 AND c->'retrieval'->>'requestId' IS NOT NULL
 ORDER BY c->'retrieval'->>'requestId'
), totals AS (
 SELECT COALESCE(SUM(CASE WHEN LEFT(r->>'queriedAt',10)=TO_CHAR(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD') THEN GREATEST(1,COALESCE((r->>'creditsUsed')::numeric,1)) ELSE 0 END),0) AS daily,
 COALESCE(SUM(CASE WHEN LEFT(r->>'queriedAt',7)=TO_CHAR(NOW() AT TIME ZONE 'UTC','YYYY-MM') THEN GREATEST(1,COALESCE((r->>'creditsUsed')::numeric,1)) ELSE 0 END),0) AS monthly
 FROM retrieved
)
INSERT INTO dc2_provider_budget(id,state)
SELECT 1,jsonb_build_object(
 'search',jsonb_build_object('day',TO_CHAR(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD'),'month',TO_CHAR(NOW() AT TIME ZONE 'UTC','YYYY-MM'),'calls',CEIL(daily),'monthly',CEIL(monthly),'minute','[]'::jsonb),
 'gemini',jsonb_build_object('day','','month','','calls',0,'monthly',0,'minute','[]'::jsonb),
 'leases','[]'::jsonb) FROM totals
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dc2_app') THEN
  GRANT SELECT,UPDATE ON dc2_provider_budget TO dc2_app;
 END IF;
END $$;
