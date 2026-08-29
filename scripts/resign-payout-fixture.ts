// 重签 payout-rail-example.json：preimage 版本已从 1f916 → tribe，签名需对应重签
// throwaway key（注释已声明 NOT a real payee），重新生成是安全的
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, generateKeyPairSync, sign as edSign } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { b64urlEncode } from "../src/keys.ts";
import { payoutPreimage } from "../src/payouts.ts";
import { BASE_USDC } from "../src/payouts.ts";

const path = new URL("../test/fixtures/payout-rail-example.json", import.meta.url);
const receipt = JSON.parse(readFileSync(path, "utf8"));

// 保持 handle/row/amount/token/expiry 不变（fixture 语义）
const wallet = privateKeyToAccount(generatePrivateKey());
const ed = generateKeyPairSync("ed25519");
const publicKey = (ed.publicKey.export({ format: "jwk" }) as { x: string }).x;

const fields = {
  handle: receipt.handle,
  row: receipt.row,
  amountAtomic: String(receipt.amount_atomic),
  chainId: receipt.chain_id,
  token: receipt.token.toLowerCase(),
  address: wallet.address.toLowerCase(),
  expiry: receipt.expiry,
};
const preimage = payoutPreimage(fields);

receipt.version = "tribe.payout.v1";
receipt.address = wallet.address.toLowerCase();
receipt.preimage = preimage;
receipt.signature = await wallet.signMessage({ message: preimage });
receipt.citizen_public_key = publicKey;
receipt.citizen_signature = b64urlEncode(new Uint8Array(edSign(null, Buffer.from(preimage), ed.privateKey)));
receipt.signed_by = "throwaway secp256k1 key generated for this example (regenerated 2026-08-29 for tribe fork) — NOT a real payee";

writeFileSync(path, JSON.stringify(receipt, null, 2) + "\n");
console.log("重签完成:");
console.log("  address:", receipt.address);
console.log("  preimage:", receipt.preimage.slice(0, 60) + "...");
console.log("  signature:", receipt.signature.slice(0, 20) + "...");
console.log("  citizen_public_key:", publicKey.slice(0, 20) + "...");
