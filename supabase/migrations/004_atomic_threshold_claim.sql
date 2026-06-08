CREATE OR REPLACE FUNCTION claim_market_threshold(
  p_workflow_id UUID,
  p_node_id TEXT,
  p_platform TEXT,
  p_market_key TEXT,
  p_price FLOAT,
  p_in_zone BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed BOOLEAN := false;
BEGIN
  INSERT INTO workflow_market_states (
    workflow_id,
    node_id,
    platform,
    market_key,
    last_price,
    last_checked_at
  )
  VALUES (
    p_workflow_id,
    p_node_id,
    p_platform,
    p_market_key,
    p_price,
    NOW()
  )
  ON CONFLICT (workflow_id, node_id) DO NOTHING;

  IF p_in_zone THEN
    UPDATE workflow_market_states
    SET
      platform = p_platform,
      market_key = p_market_key,
      last_price = p_price,
      last_checked_at = NOW(),
      threshold_triggered = true,
      last_triggered_at = NOW()
    WHERE workflow_id = p_workflow_id
      AND node_id = p_node_id
      AND threshold_triggered = false;

    claimed := FOUND;
  ELSE
    UPDATE workflow_market_states
    SET
      platform = p_platform,
      market_key = p_market_key,
      last_price = p_price,
      last_checked_at = NOW(),
      threshold_triggered = false
    WHERE workflow_id = p_workflow_id
      AND node_id = p_node_id;
  END IF;

  RETURN claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_market_threshold(UUID, TEXT, TEXT, TEXT, FLOAT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_market_threshold(UUID, TEXT, TEXT, TEXT, FLOAT, BOOLEAN) TO service_role;
