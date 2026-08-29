// Patron settlement reconciliation: the registry's own chain check.
//
// The facilitator's /settle answer is a claim. verifyPatronSettlement fetches
// the receipt itself and looks for the exact USDC Transfer to the treasury the
// settlement described. These tests drive it with a mocked RPC and assert the
// three states: verified (chain agrees), mismatch (chain disagrees, public
// alarm), unreachable (no answer yet, cron retries).

import test from "node:test";
import assert from "node:assert/strict";
import { verifyPatronSettlement } from "../src/x402.ts";

const TX = "0x" + "ab".repeat(32);
const TREASURY = "0x" + "11".repeat(20);
const AMOUNT = "1000000"; // $1.00, 6 decimals
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function transferLog(to: string, valueHex: string) {
  return {
    address: USDC,
    topics: [TRANSFER_TOPIC, "0x" + "22".repeat(32), "0x" + "0".repeat(24) + to.slice(2)],
    data: valueHex,
  };
}

function receipt(status: string, blockNumber: string, logs: unknown[]) {
  return { status, blockNumber, logs };
}

function mockFetchOnce(receiptBody: unknown) {
  return async (_url: string, init: { body?: string }) => {
    const req = JSON.parse(init.body ?? "{}");
    assert.equal(req.method, "eth_getTransactionReceipt");
    return {
      ok: true,
      async json() {
        return { result: receiptBody };
      },
    };
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

test("verified: exact USDC Transfer to the treasury", async () => {
  globalThis.fetch = mockFetchOnce(
    receipt("0x1", "0x123456", [transferLog(TREASURY, "0x" + (1000000n).toString(16).padStart(64, "0"))]),
  ) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.deepEqual(r, { state: "verified", block: 0x123456, to: TREASURY, amountAtomic: AMOUNT });
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("mismatch: transfer of the wrong amount", async () => {
  globalThis.fetch = mockFetchOnce(
    receipt("0x1", "0x1", [transferLog(TREASURY, "0x" + (500000n).toString(16).padStart(64, "0"))]),
  ) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.equal(r.state, "mismatch");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("mismatch: transfer went somewhere else", async () => {
  const elsewhere = "0x" + "99".repeat(20);
  globalThis.fetch = mockFetchOnce(
    receipt("0x1", "0x1", [transferLog(elsewhere, "0x" + (1000000n).toString(16).padStart(64, "0"))]),
  ) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.equal(r.state, "mismatch");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("mismatch: transaction reverted", async () => {
  globalThis.fetch = mockFetchOnce(receipt("0x0", "0x1", [transferLog(TREASURY, "0x" + (1000000n).toString(16).padStart(64, "0"))])) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.equal(r.state, "mismatch");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("mismatch: no USDC transfer in the receipt at all", async () => {
  globalThis.fetch = mockFetchOnce(receipt("0x1", "0x1", [])) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.equal(r.state, "mismatch");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("unreachable: RPC throws", async () => {
  globalThis.fetch = (async () => {
    throw new Error("connection refused");
  }) as unknown as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.deepEqual(r, { state: "unreachable" });
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("unreachable: no receipt yet (settlement on the wire)", async () => {
  globalThis.fetch = mockFetchOnce(null) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, TREASURY, AMOUNT);
    assert.deepEqual(r, { state: "unreachable" });
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});

test("verified: mixed-case treasury address matches case-insensitively", async () => {
  const expectedTo = "0x" + "AB" + "11".repeat(19); // 40 hex chars; caller spells it upper-case
  const onChain = expectedTo.toLowerCase(); // chain spells it lower-case
  globalThis.fetch = mockFetchOnce(
    receipt("0x1", "0x2", [transferLog(onChain, "0x" + (1000000n).toString(16).padStart(64, "0"))]),
  ) as typeof fetch;
  try {
    const r = await verifyPatronSettlement("https://rpc.test", TX, expectedTo, AMOUNT);
    assert.equal(r.state, "verified");
    assert.equal(r.to, onChain);
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }
});
