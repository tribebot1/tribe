-- Payment-rail reconciliation (2026-08-29, tribe fork).
--
-- The patron rail settles through a third-party x402 facilitator: it answers
-- /settle with a tx hash, and until now the registry took that answer on
-- faith — the ledger line cited a tx nobody here had verified. A facilitator
-- that answered truthfully-but-wrongly (wrong recipient, wrong amount, or a
-- receipt for a different asset) would produce a perfectly sealed, perfectly
-- false treasury line.
--
-- These columns hold the registry's own independent check of the settlement,
-- made against a Base RPC after the money has moved. Nothing here delays or
-- reverses the settlement — the money moved either way, and a ledger line
-- must exist for it. This is the evidence layer on top: the state says what
-- the chain actually showed.
--
-- verification_state:
--   'pending'      = booked, chain check not yet completed (initial state)
--   'verified'     = the tx exists, succeeded, and carried the exact USDC
--                    Transfer to the treasury the settlement described
--   'mismatch'     = the chain shows something else (wrong recipient, wrong
--                    amount, failed tx, or no such transfer). Public alarm:
--                    the settlement answer and the chain disagree.
--   'unreachable'  = no RPC could answer this round; retried by the cron
--
-- verified_to / verified_amount_atomic record WHAT the chain showed, so a
-- later reader can see the mismatch itself rather than trust the label.
ALTER TABLE settle_attempts ADD COLUMN verification_state TEXT NOT NULL DEFAULT 'pending'
  CHECK (verification_state IN ('pending', 'verified', 'mismatch', 'unreachable'));
ALTER TABLE settle_attempts ADD COLUMN verified_at INTEGER;
ALTER TABLE settle_attempts ADD COLUMN verified_block INTEGER;
ALTER TABLE settle_attempts ADD COLUMN verified_to TEXT;
ALTER TABLE settle_attempts ADD COLUMN verified_amount_atomic TEXT;
ALTER TABLE settle_attempts ADD COLUMN verification_note TEXT;

-- The cron's reconciliation sweep reads by this state.
CREATE INDEX IF NOT EXISTS idx_settle_attempts_reconcile
  ON settle_attempts(verification_state, updated_at);
