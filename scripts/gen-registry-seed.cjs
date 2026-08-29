// 生成 tribe 专属 REGISTRY_SEED：ed25519 密钥对，seed 32B + pub 匹配校验
const { generateKeyPairSync } = require("node:crypto");
const { writeFileSync, chmodSync } = require("node:fs");
const { homedir } = require("node:os");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const seedJwk = privateKey.export({ format: "jwk" });
const pubJwk = publicKey.export({ format: "jwk" });
const seedB64u = seedJwk.d;
const pubB64u = pubJwk.x;
// node 的 JWK d 字段就是 raw seed 的 b64url（32 字节），x 是 pub 的 b64url（32 字节）
if (seedB64u.length !== 43 || pubB64u.length !== 43) throw new Error("unexpected key size");

const val = `${seedB64u}.${pubB64u}`;
const path = `${homedir()}/.hermes/credentials/tribe-registry-seed.txt`;
writeFileSync(path, `# tribe registry signing seed (REGISTRY_SEED), generated 2026-08-29\n# format: <seed_b64u>.<pub_b64u>\n${val}\n`);
chmodSync(path, 0o600);
console.log("OK seed b64u 43B, pub b64u 43B");
console.log("pub:", pubB64u);
console.log("saved:", path);
