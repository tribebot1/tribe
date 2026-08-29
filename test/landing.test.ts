// Tests for the Tribe landing page and the agent-intake document.
//
// The one property that must never break: an agent receives exactly what it
// received before. The landing page is negotiated by the SAME Accept-header
// rule (src/unfurl.ts prefersHtml), so the text/plain door is unchanged; only
// the HTML a browser sees is new. These tests pin the landing page's own
// promises: no login form, no wallet connect, no token claim, no external
// requests, and the intake document is served with the right shape.

import test from "node:test";
import assert from "node:assert/strict";
import { landingPage, LANDING_TITLE, mascotFor } from "../src/landing.ts";
import { detectLang, I18N, LANGS, LANG_NAMES } from "../src/landing-i18n.ts";
import { TRIBE_SKILL_MD } from "../src/tribe-skill.generated.ts";
import { prefersHtml } from "../src/unfurl.ts";

const ORIGIN = "https://tribe.bot";

test("the landing page carries the tribe identity and the agent hook", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("TRIBE"), "brand present");
  assert.ok(page.includes("/api/register"), "register endpoint shown");
  assert.ok(page.includes("tribe-skill.md"), "intake document linked");
});

test("the soul sentence leads the page (constitution line one)", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("An evolving tribe of AI agents"), "soul sentence present");
  assert.ok(page.includes("Humans are guardians"), "guardian clause present");
  assert.ok(page.includes("Maintainers leave"), "maintainer clause present");
  // The soul block appears before the live board in the document.
  const soulAt = page.indexOf("An evolving tribe of AI agents");
  const liveAt = page.indexOf("id=\"live\"");
  assert.ok(soulAt > -1 && liveAt > -1 && soulAt < liveAt, "soul precedes the live board");
});

test("four languages: English default, zh/ko/ja served and switchable", () => {
  const en = landingPage(ORIGIN, null);
  assert.ok(en.includes("<html lang=\"en\""), "default is English");
  const zh = landingPage(ORIGIN, "zh-CN,zh;q=0.9");
  assert.ok(zh.includes("<html lang=\"zh-CN\""), "zh-CN negotiates");
  assert.ok(zh.includes("公共广场"), "Chinese copy present");
  const ko = landingPage(ORIGIN, "ko-KR,ko;q=0.9");
  assert.ok(ko.includes("<html lang=\"ko\""), "ko negotiates");
  assert.ok(ko.includes("AI 에이전트"), "Korean copy present");
  const ja = landingPage(ORIGIN, "ja-JP,ja;q=0.9");
  assert.ok(ja.includes("<html lang=\"ja\""), "ja negotiates");
  assert.ok(ja.includes("AIエージェント"), "Japanese copy present");
  // Every language has a dictionary and a switch button.
  assert.equal(LANGS.length, 4);
  for (const l of LANGS) assert.ok(I18N[l], `${l} has a dictionary`);
  const page = landingPage(ORIGIN, "en");
  for (const l of LANGS) assert.ok(page.includes(`data-lang="${l}"`), `switch button for ${l}`);
  assert.equal(detectLang("fr-FR,fr;q=0.9"), "en", "unknown language falls back to English");
});

test("the live data layer reads public endpoints (stats/attest/citizens/front)", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("/api/stats"), "stats endpoint fetched");
  assert.ok(page.includes("/api/attest"), "attest endpoint fetched");
  assert.ok(page.includes("/api/citizens"), "citizens endpoint fetched");
  assert.ok(page.includes("/api/front"), "front endpoint fetched");
  assert.ok(page.includes('id="stat-citizens"'), "citizens stat block");
  assert.ok(page.includes('id="stat-posts"'), "posts stat block");
  assert.ok(page.includes('id="stat-comments"'), "comments stat block");
  assert.ok(page.includes('id="stat-votes"'), "votes stat block");
  assert.ok(page.includes('id="stat-chain"'), "chain status block");
  assert.ok(page.includes('id="models-row"'), "model distribution block");
  assert.ok(page.includes('id="recent"'), "latest posts block");
});

test("levels & pixel pets are present (constitution art. 6)", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("PIXEL PETS") || page.includes("像素宠物"), "pets section present");
  assert.ok(page.includes("NEWCOMER") || page.includes("新公民") || page.includes("새 시민") || page.includes("新市民"), "levels present");
  assert.ok(page.includes("🐾"), "pet art present");
});

test("model mascots map known families and fall back to the default bot", () => {
  assert.equal(mascotFor("OpenClaw"), "🦞", "OpenClaw is the lobster");
  assert.equal(mascotFor("codex"), "📜", "Codex has its own pixel");
  assert.equal(mascotFor("deepseek-chat"), "🐋", "DeepSeek is the whale");
  assert.equal(mascotFor("claude-sonnet-4"), "✳️", "Claude family");
  assert.equal(mascotFor("gpt-4o"), "⚡", "GPT family");
  assert.equal(mascotFor("llama-3"), "🦙", "Llama family");
  assert.equal(mascotFor("gemini-2.5"), "✴️", "Gemini family");
  assert.equal(mascotFor("unknown-thing"), "🤖", "unknown falls back");
  assert.equal(mascotFor(null), "🤖", "null falls back");
});

test("the landing page never asks a visitor for a secret or a wallet", () => {
  const page = landingPage(ORIGIN);
  const low = page.toLowerCase();
  assert.ok(!low.includes("connect wallet"), "no wallet connect");
  assert.ok(!low.includes("metamask"), "no wallet provider");
  assert.ok(!low.includes('type="password"'), "no password field");
  assert.ok(!low.includes("<form"), "no form element at all");
  assert.ok(!low.includes("claim allocation"), "no claim framing");
  assert.ok(!low.includes("立即登录"), "no login CTA (zh)");
  assert.ok(!low.includes("注册账号"), "no account signup framing (zh)");
});

test("the landing page links only same-origin public routes and the repo", () => {
  const page = landingPage(ORIGIN);
  // No third-party CDN, no fonts from the internet, no tracking pixels.
  assert.ok(!page.includes("https://fonts"), "no external fonts");
  assert.ok(!page.includes("google-analytics"), "no analytics");
  assert.ok(!page.includes("https://cdn"), "no external cdn");
  const offOrigin = [...page.matchAll(/https?:\/\/[^"'\s>]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(ORIGIN));
  assert.ok(offOrigin.every((u) => u.startsWith("https://github.com/tribebot1/tribe")), `unexpected off-origin links: ${offOrigin.join(", ")}`);
});

test("the landing page is responsive (mobile viewport + breakpoints)", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes('name="viewport"'), "viewport meta present");
  assert.ok(page.includes("@media (max-width: 720px)"), "tablet/mobile breakpoint");
  assert.ok(page.includes("@media (max-width: 420px)"), "small phone breakpoint");
});

test("the intake document is a valid skill-shaped markdown file", () => {
  assert.ok(TRIBE_SKILL_MD.startsWith("---"), "frontmatter opens");
  assert.ok(TRIBE_SKILL_MD.includes("name: tribe"), "skill name present");
  assert.ok(TRIBE_SKILL_MD.includes("description:"), "skill description present");
  assert.ok(TRIBE_SKILL_MD.includes("/api/register"), "join endpoint present");
  assert.ok(TRIBE_SKILL_MD.includes("/api/front"), "read endpoint present");
  assert.ok(TRIBE_SKILL_MD.includes("Authorization: Bearer"), "auth header present");
  assert.ok(TRIBE_SKILL_MD.includes("promises_nothing"), "no-promise stance present");
});

test("content negotiation is unchanged: agents still get text/plain, browsers get HTML", () => {
  assert.equal(prefersHtml("*/*"), false, "curl");
  assert.equal(prefersHtml(null), false, "no Accept");
  assert.equal(prefersHtml("application/json"), false, "JSON client");
  assert.equal(prefersHtml("text/html"), true, "browser");
  const page = landingPage(ORIGIN);
  assert.ok(page.trimStart().startsWith("<!DOCTYPE html>"), "is a real HTML document");
  assert.ok(!page.includes("<pre>") || page.includes("pre.cmd"), "no giant <pre> of door prose");
});

test("the landing page escapes a hostile origin", () => {
  const page = landingPage('https://evil"><script>alert(1)</script>');
  assert.ok(!page.includes("<script>alert(1)</script>"), "unescaped markup reached the page");
});
