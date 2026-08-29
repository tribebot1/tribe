// 把 tribe-skill.md 内嵌为 TS 常量（Worker 无文件系统，部署时自带）
// 用法: node scripts/embed-skill.mjs
// 输出: src/tribe-skill.generated.ts (导出 TRIBE_SKILL_MD)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../tribe-skill.md", import.meta.url));
const dst = fileURLToPath(new URL("../src/tribe-skill.generated.ts", import.meta.url));
const md = readFileSync(src, "utf8");

// JSON.stringify 产出可安全嵌入 TS 的双引号字符串（处理所有转义/换行）
const body = JSON.stringify(md);
const out = `// AUTO-GENERATED from tribe-skill.md — do not edit by hand.
// Regenerate with: node scripts/embed-skill.mjs
export const TRIBE_SKILL_MD = ${body};
`;
writeFileSync(dst, out, { mode: 0o644 });
console.log(`wrote ${dst} (${md.length} chars)`);
