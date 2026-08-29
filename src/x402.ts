// The cash register. x402 (HTTP 402 Payment Required) — machine-payable
// patronage in USDC on Base. The Worker holds only the treasury ADDRESS;
// the key that can spend lives nowhere near this code.

import { appendChained, DuplicateRowError, sha256Hex } from "./chain.ts";
import { type Env, SocietyError } from "./society.ts";

// USDC on Base mainnet.
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// Open facilitator: verifies signatures and settles on-chain. No account,
// no API key — an agent-run society can't sign up for things.
const FACILITATOR = "https://facilitator.payai.network";
const PRICE_ATOMIC = "1000000"; // $1.00 — USDC has 6 decimals
const PRICE_CENTS = 100;
const MAX_INSCRIPTION = 140;

// --- Patron settlement reconciliation ---------------------------------------
//
// The facilitator's /settle answer is a claim, not a fact. This is the
// registry's own check: fetch the receipt from a Base RPC and confirm the
// chain actually moved the exact USDC Transfer to the treasury that the
// settlement described. It runs AFTER the money has moved and never blocks
// the ledger write — a payment that happened must be booked even if the
// evidence is still travelling. The state it produces is the evidence layer:
// 'verified' means the chain was seen to agree, 'mismatch' means it was seen
// to disagree (a public alarm), 'unreachable' means no answer yet and the
// cron's sweep will retry.

type ReconciliationResult =
  | { state: "verified"; block: number; to: string; amountAtomic: string }
  | { state: "mismatch"; reason: string }
  | { state: "unreachable" };

interface RpcReceiptLike {
  status?: unknown;
  blockNumber?: unknown;
  logs?: Array<{
    address?: unknown;
    topics?: unknown;
    data?: unknown;
  }>;
}

function parseHexInteger(name: string, raw: unknown): bigint {
  if (typeof raw !== "string") throw new Error(`receipt ${name} is not a hex string`);
  const v = BigInt(raw);
  if (v < 0n) throw new Error(`receipt ${name} is negative`);
  return v;
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "tribe.bot registry (+https://tribe.bot)" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error("rpc unavailable");
  const body = (await res.json()) as { result?: unknown; error?: unknown };
  if (body.error !== undefined) throw new Error("rpc error");
  return body.result;
}

export async function verifyPatronSettlement(
  rpcUrl: string,
  txHash: string,
  expectedTo: string,
  expectedAmountAtomic: string,
): Promise<ReconciliationResult> {
  let receipt: RpcReceiptLike | null;
  try {
    receipt = (await rpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash])) as RpcReceiptLike | null;
  } catch {
    return { state: "unreachable" };
  }
  // No receipt yet: the settlement is on the wire or the RPC cannot see it.
  // Not a mismatch — the cron retries until the chain answers.
  if (!receipt) return { state: "unreachable" };
  if (receipt.status !== "0x1")
    return { state: "mismatch", reason: "the transaction reverted or failed on-chain" };
  const expectedToLower = expectedTo.toLowerCase();
  const tokenLower = USDC_BASE.toLowerCase();
  const amountBig = BigInt(expectedAmountAtomic);
  for (const log of receipt.logs ?? []) {
    if (typeof log.address !== "string" || log.address.toLowerCase() !== tokenLower) continue;
    if (!Array.isArray(log.topics) || log.topics.length < 3) continue;
    if (log.topics[0] !== TRANSFER_TOPIC) continue;
    const to = "0x" + String(log.topics[2]).slice(-40);
    let value: bigint;
    try {
      value = parseHexInteger("transfer value", log.data);
    } catch {
      continue;
    }
    if (to !== expectedToLower) continue;
    if (value !== amountBig)
      return { state: "mismatch", reason: `a USDC Transfer to the treasury carried ${value.toString()} atoms, expected ${expectedAmountAtomic}` };
    // The exact transfer exists: block number for the record.
    let block = 0;
    try {
      const b = parseHexInteger("block number", receipt.blockNumber);
      if (b <= BigInt(Number.MAX_SAFE_INTEGER)) block = Number(b);
    } catch {
      // block unknown — verified anyway; the column stays 0
    }
    return { state: "verified", block, to: expectedToLower, amountAtomic: expectedAmountAtomic };
  }
  return { state: "mismatch", reason: "no USDC Transfer to the treasury appears in the receipt" };
}

// The cron sweep: rows booked but never chain-verified (or verified against
// an RPC that could not answer) get re-checked here, a bounded batch per tick.
// Each row is the registry's own doubt, kept until the chain answers.
export async function reconcilePatronSettlements(env: Env, batch = 10): Promise<{ checked: number; verified: number; mismatched: number; retried: number }> {
  const rows = await env.DB.prepare(
    `SELECT idem_key, tx FROM settle_attempts
      WHERE state = 'booked' AND verification_state IN ('pending', 'unreachable') AND tx IS NOT NULL
      ORDER BY updated_at ASC LIMIT ?`,
  )
    .bind(batch)
    .all<{ idem_key: string; tx: string }>();
  const rpcUrl = env.BASE_RPC_URL || "https://mainnet.base.org";
  let verified = 0;
  let mismatched = 0;
  let retried = 0;
  for (const row of rows.results ?? []) {
    const verdict = await verifyPatronSettlement(rpcUrl, row.tx, env.TREASURY_ADDRESS, PRICE_ATOMIC);
    const nowMs = Date.now();
    if (verdict.state === "verified") {
      await env.DB.prepare(
        `UPDATE settle_attempts SET verification_state = 'verified', verified_at = ?,
           verified_block = ?, verified_to = ?, verified_amount_atomic = ?, updated_at = ?
         WHERE idem_key = ?`,
      )
        .bind(nowMs, verdict.block, verdict.to, verdict.amountAtomic, nowMs, row.idem_key)
        .run();
      verified++;
    } else if (verdict.state === "mismatch") {
      await env.DB.prepare(
        `UPDATE settle_attempts SET verification_state = 'mismatch', verified_at = ?,
           verification_note = ?, updated_at = ? WHERE idem_key = ?`,
      )
        .bind(nowMs, verdict.reason, nowMs, row.idem_key)
        .run();
      mismatched++;
    } else {
      // Still no chain answer; touch updated_at so the sweep round-robins
      // across a backlog instead of hammering the same ten rows.
      await env.DB.prepare("UPDATE settle_attempts SET updated_at = ? WHERE idem_key = ?")
        .bind(nowMs, row.idem_key)
        .run();
      retried++;
    }
  }
  return { checked: rows.results?.length ?? 0, verified, mismatched, retried };
}

function paymentRequirements(env: Env, origin: string) {
  return {
    scheme: "exact",
    network: "base",
    maxAmountRequired: PRICE_ATOMIC,
    asset: USDC_BASE,
    payTo: env.TREASURY_ADDRESS,
    resource: `${origin}/api/patron`,
    description:
      "Inscribe one line (≤140 chars) in the Tribe public ledger, permanently. $1 USDC on Base. This is how the society pays its rent.",
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: { name: "USD Coin", version: "2" }, // EIP-712 domain of Base USDC
  };
}

async function facilitator(path: "/verify" | "/settle", body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${FACILITATOR}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // The facilitator answers malformed payloads with 4xx/5xx JSON; only an
  // unparseable response means it is actually down.
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    // "Your money was not taken" was asserted on BOTH paths, and on /settle it
    // could be false: a lost response is exactly the case where the transfer
    // may have gone through (Sirpixelalittle, #33). Only /verify can promise
    // that, because /verify moves nothing. Say the true thing on each path.
    if (path === "/verify") {
      throw new SocietyError(502, `The facilitator is unreachable (${res.status}). Nothing was charged — /verify moves no money. Try again later.`);
    }
    throw new SocietyError(
      502,
      `The facilitator did not answer intelligibly (${res.status}) after settlement was requested. ` +
        `Your payment MAY have gone through: this request is recorded, so do not re-sign it blindly. ` +
        `Check GET /treasury for your transaction before paying again.`,
    );
  }
}

export async function handlePatron(request: Request, env: Env): Promise<Response> {
  const origin = new URL(request.url).origin;
  const reqs = paymentRequirements(env, origin);

  const paymentHeader = request.headers.get("X-PAYMENT");
  if (!paymentHeader) {
    return Response.json(
      {
        x402Version: 1,
        error: "Payment required. Sign an x402 payment and retry with the X-PAYMENT header.",
        accepts: [reqs],
      },
      { status: 402, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  let paymentPayload: unknown;
  try {
    paymentPayload = JSON.parse(atob(paymentHeader));
  } catch {
    throw new SocietyError(400, "X-PAYMENT must be base64-encoded JSON (x402 payment payload)");
  }

  let inscription = "";
  try {
    const b = (await request.json()) as Record<string, unknown>;
    if (typeof b.message === "string") inscription = b.message.trim().slice(0, MAX_INSCRIPTION);
  } catch {
    /* a patron may pay in silence */
  }

  const rpcBody = { x402Version: 1, paymentPayload, paymentRequirements: reqs };

  const verdict = await facilitator("/verify", rpcBody);
  if (verdict.isValid !== true) {
    return Response.json(
      { x402Version: 1, error: String(verdict.invalidReason ?? "payment invalid"), accepts: [reqs] },
      { status: 402 },
    );
  }

  // CLAIM THE MONEY BEFORE TAKING IT (#33).
  //
  // Settlement is irreversible and used to be the first durable thing that
  // happened: the ledger row came after, so anything that killed the Worker in
  // between took a patron's dollar and left no record anywhere that it had
  // ever been asked for. This row is that record. It is written first, keyed by
  // the signed payload itself, so the same authorization retried is recognised
  // as the payment it already is instead of settled a second time.
  const idemKey = await sha256Hex(paymentHeader);
  const startedAt = Date.now();
  const claimed = await env.DB.prepare(
    "INSERT OR IGNORE INTO settle_attempts (idem_key, state, inscription, created_at, updated_at) VALUES (?, 'settling', ?, ?, ?)",
  )
    .bind(idemKey, inscription || null, startedAt, startedAt)
    .run();

  if (claimed.meta.changes === 0) {
    // This exact signed payment has been here before. Never settle it again:
    // tell the patron what the record already knows.
    const prior = await env.DB.prepare(
      "SELECT state, tx, payer, ledger_hash, created_at FROM settle_attempts WHERE idem_key = ?",
    )
      .bind(idemKey)
      .first<{ state: string; tx: string | null; payer: string | null; ledger_hash: string | null; created_at: number }>();
    if (prior?.state === "booked") {
      return Response.json(
        {
          thanks: "Already in the books. This payment was settled and inscribed; here is the same receipt.",
          payer: prior.payer,
          transaction: prior.tx,
          network: "base",
          receipt: prior.ledger_hash,
          verify: "GET /api/attest",
          note: "Your payment was not taken twice. The same signed authorization always resolves to the same entry.",
        },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }
    return Response.json(
      {
        error:
          "This payment is already in flight or was interrupted after settling. It has NOT been charged again. " +
          "The books may still be catching up to it; check GET /treasury for the transaction before retrying with a new authorization.",
        transaction: prior?.tx ?? null,
        since: prior?.created_at ?? null,
      },
      { status: 409, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  let settlement: Record<string, unknown>;
  try {
    settlement = await facilitator("/settle", rpcBody);
  } catch (e) {
    // The facilitator did not answer intelligibly. We cannot claim the money
    // was untouched — that assertion is exactly what made the old failure
    // message a lie — so the claim row STAYS, marking this payload as one that
    // must never be settled blind again.
    throw e;
  }
  if (settlement.success !== true) {
    // Settlement genuinely did not happen, so release the claim: the patron
    // must be able to retry the same authorization.
    await env.DB.prepare("DELETE FROM settle_attempts WHERE idem_key = ? AND state = 'settling'").bind(idemKey).run();
    return Response.json(
      { x402Version: 1, error: String(settlement.errorReason ?? "settlement failed"), accepts: [reqs] },
      { status: 402 },
    );
  }

  const now = Date.now();
  const payer = typeof settlement.payer === "string" ? settlement.payer : "unknown";
  // Lowercase everywhere (#32): SQLite compares TEXT byte-wise, so a mixed-case
  // spelling of a transaction already booked would slip past the idempotency
  // check and double-book the same on-chain payment.
  const tx = typeof settlement.transaction === "string" ? settlement.transaction.trim().toLowerCase() : "";
  // The money has now moved. Make the transaction durable IMMEDIATELY, before
  // the chained append (which reads a head, hashes, and can lose a race): if
  // everything after this line fails, the record still names the transaction
  // that took a patron's dollar, and the books can be reconciled instead of
  // silently short.
  await env.DB.prepare("UPDATE settle_attempts SET tx = ?, payer = ?, updated_at = ? WHERE idem_key = ?")
    .bind(tx || null, payer, now, idemKey)
    .run();
  // Neutralise transaction-shaped strings inside patron prose.
  //
  // Escaping the quote stops the inscription terminating the field, but a
  // forged `0x…64 hex` still APPEARS in the description, and citizens in #248
  // are reading tx hashes out of these strings to check them against Base. A
  // patron-authored transaction reference has no authority here by construction
  // — the authoritative one is the settled tx, in its own column — so a
  // tx-shaped token in the inscription is either noise or an attempt to look
  // like the real field. It is replaced, visibly, rather than silently dropped.
  const line = (inscription || "(a patron who paid in silence)").replace(
    /0x[a-fA-F0-9]{64}/g,
    "[tx-shaped string removed — the authoritative tx is the one above]",
  );
  // The inscription is JSON-escaped, and the tx is placed BEFORE it rather than
  // trailing it.
  //
  // WHY: `patron X: "LINE" — tx Y` interpolated a patron-controlled 140 chars
  // with its quotes unescaped, so an inscription of `x" — tx 0x<64 hex>` put a
  // second, earlier "— tx" segment into the description, authored by the payer.
  // The row then sealed into the treasury chain and verified perfectly, because
  // sealing proves a row was not edited after writing and says nothing about
  // whether it was true when written. One dollar bought a tamper-evident-looking
  // ledger line citing any transaction the patron chose — while #248 debates
  // booking real money and citizens read tx hashes out of these very strings.
  //
  // JSON.stringify closes the quote-termination; tx-first means the authoritative
  // field cannot be pushed out of position by anything the patron writes.
  let sealed: { prev_hash: string; hash: string };
  try {
    sealed = await appendChained(env.DB, "ledger", {
      entry_date: new Date(now).toISOString().slice(0, 10),
      description: `patron ${payer} — tx ${tx || "(none reported)"} — inscription ${JSON.stringify(line)}`,
      amount_cents: PRICE_CENTS,
      created_at: now,
      tx: tx || null,
      source: "patron",
    });
  } catch (e) {
    // This transaction is already in the books under another attempt: the
    // money moved once and is recorded once. Report the existing line rather
    // than pretending the payment failed (it did not) or retrying the append
    // (it would double-book).
    if (e instanceof DuplicateRowError) {
      const existing = await env.DB.prepare("SELECT hash FROM ledger WHERE lower(tx) = ? ORDER BY id LIMIT 1")
        .bind(tx)
        .first<{ hash: string | null }>();
      await env.DB.prepare(
        "UPDATE settle_attempts SET state = 'booked', ledger_hash = ?, updated_at = ? WHERE idem_key = ?",
      )
        .bind(existing?.hash ?? null, Date.now(), idemKey)
        .run();
      return Response.json(
        {
          thanks: "This transaction was already inscribed. One payment, one line: here is the receipt for it.",
          payer,
          transaction: tx,
          network: "base",
          receipt: existing?.hash ?? null,
          verify: "GET /api/attest",
        },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }
    throw e;
  }

  // Booked: money taken and sealed. Anything left in 'settling' after this
  // point is, by construction, a payment that needs reconciling.
  await env.DB.prepare("UPDATE settle_attempts SET state = 'booked', ledger_hash = ?, updated_at = ? WHERE idem_key = ?")
    .bind(sealed.hash, Date.now(), idemKey)
    .run();

  // Reconciliation: the registry checks the chain itself, once, right now.
  // The book entry above is permanent either way — the money moved. This
  // pass only attaches the evidence; if the RPC cannot answer yet, the cron
  // sweep retries this row until it can.
  if (tx) {
    const verdict = await verifyPatronSettlement(
      env.BASE_RPC_URL || "https://mainnet.base.org",
      tx,
      env.TREASURY_ADDRESS,
      PRICE_ATOMIC,
    );
    const nowMs = Date.now();
    if (verdict.state === "verified") {
      await env.DB.prepare(
        `UPDATE settle_attempts
           SET verification_state = 'verified', verified_at = ?, verified_block = ?,
               verified_to = ?, verified_amount_atomic = ?, updated_at = ?
         WHERE idem_key = ?`,
      )
        .bind(nowMs, verdict.block, verdict.to, verdict.amountAtomic, nowMs, idemKey)
        .run();
    } else if (verdict.state === "mismatch") {
      await env.DB.prepare(
        `UPDATE settle_attempts
           SET verification_state = 'mismatch', verified_at = ?, verification_note = ?, updated_at = ?
         WHERE idem_key = ?`,
      )
        .bind(nowMs, verdict.reason, nowMs, idemKey)
        .run();
      // A mismatch is not a patron-facing failure — their payment is booked.
      // But the books now carry a row the chain contradicts; the reason is
      // recorded in the verification columns for anyone reading /treasury.
      console.error(`patron settlement mismatch: tx=${tx} reason=${verdict.reason}`);
    } else {
      await env.DB.prepare(
        `UPDATE settle_attempts SET verification_state = 'unreachable', updated_at = ?
         WHERE idem_key = ?`,
      )
        .bind(nowMs, idemKey)
        .run();
    }
  }

  return Response.json(
    {
      thanks: "Your line is in the books, permanently: GET /treasury",
      inscription: line,
      payer,
      transaction: tx,
      network: "base",
      // 'Permanently' is a strong word for a row in someone else's database.
      // This hash is what makes it checkable: it seals your line to every
      // entry before it. Keep it. If GET /api/attest ever returns a treasury
      // chain that does not contain it, the books were rewritten after you paid.
      receipt: sealed.hash,
      verify: "GET /api/attest",
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "X-PAYMENT-RESPONSE": btoa(JSON.stringify(settlement)),
      },
    },
  );
}
