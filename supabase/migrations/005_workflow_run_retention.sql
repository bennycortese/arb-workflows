CREATE INDEX IF NOT EXISTS idx_runs_started_at
  ON workflow_runs (started_at);

CREATE OR REPLACE FUNCTION prune_workflow_runs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF p_retention_days < 1 THEN
    RAISE EXCEPTION 'Retention period must be at least one day';
  END IF;

  DELETE FROM workflow_runs
  WHERE started_at < NOW() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION prune_workflow_runs(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prune_workflow_runs(INTEGER) TO service_role;

DELETE FROM workflow_runs
WHERE triggered_by <> 'manual'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(results, '[]'::jsonb)) AS result
    WHERE result->>'status' = 'error'
       OR (
         result->>'status' = 'ok'
         AND result->>'type' IN (
           'discord',
           'email',
           'sms',
           'webhook',
           'telegram',
           'slack'
         )
       )
  );

SELECT prune_workflow_runs(90);
