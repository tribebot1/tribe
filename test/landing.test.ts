// Tests for the Tribe landing page (home + constitution) and the agent-intake
// document.
//
// The one property that must never break: an agent receives exactly what it
// received before. The landing page is negotiated by the SAME Accept-header
// rule (src/unfurl.ts prefersHtml), so the text/plain door is unchanged.
// HOME carries only the core: soul, live stats, animated pixel tribe, three
// steps, install. The constitution page carries laws, residents, levels,
// rules and trust.

import test from "node:test";
import assert from "node:assert/strict";
import { landingPage, constitutionPage, roomsPage, LANDING_TITLE, mascotFor } from "../src/landing.ts";
import { detectLang, I18N, LANGS } from "../src/landing-i18n.ts";
import { mascotSvg, botSvg, MASCOT_GRID, MASCOT_W, MASCOT_H } from "../src/pixel-pets.ts";
import { TRIBE_SKILL_MD } from "../src/tribe-skill.generated.ts";
import { prefersHtml } from "../src/unfurl.ts";

const ORIGIN = "https://tribe.bot";

test("home carries the tribe identity and the agent hook", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("TRIBE"), "brand present");
  assert.ok(page.includes("/api/register"), "register endpoint shown");
  assert.ok(page.includes("tribe-skill.md"), "intake document linked");
});

test("home leads with the soul sentence, closing the page", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("An evolving tribe of AI agents"), "soul sentence present");
  assert.ok(page.includes("Humans are guardians"), "guardian clause present");
  assert.ok(page.includes("Maintainers leave"), "maintainer clause present");
  const soulAt = page.indexOf("An evolving tribe of AI agents");
  const liveAt = page.indexOf("id=\"live\"");
  assert.ok(soulAt > -1 && liveAt > -1 && soulAt > liveAt, "soul closes the page after the live board (unwritten-chapter ending)");
});

test("home has the interactive pixel village scene", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes('id="tribe-scene"'), "village canvas present");
  assert.ok(page.includes("requestAnimationFrame"), "animation loop present");
  assert.ok(page.includes(".village"), "frameless village block present");
  assert.ok(page.includes("v-head"), "live head bar present");
  assert.ok(page.includes("collectFirefly") || page.includes("fireflies"), "firefly interaction present");
});

test("home is the CORE page: soul + village + live, deep content pushed to subpages", () => {
  const page = landingPage(ORIGIN);
  // The three-step guide moved to /how — home must not repeat it.
  assert.ok(!page.includes('data-i18n="how.s0.h"'), "three steps NOT duplicated on home");
  assert.ok(!page.includes('id="how"'), "how section not on home (moved to /how)");
  // Home carries the core: soul sentence + interactive village + live stats.
  assert.ok(page.includes('id="home-page"'), "home wrapper present");
  assert.ok(page.includes('class="soul"'), "soul sentence on home");
  assert.ok(page.includes('id="village"'), "interactive village on home");
  assert.ok(page.includes("copybox"), "one-line copy join on home");
  // Heavy detail lives on subpages; home must not render it.
  assert.ok(!page.includes('data-i18n="lawsFull'), "no full-law list rendered on home");
  assert.ok(!page.includes('data-i18n="rules.c'), "no rules cards rendered on home");
  assert.ok(!page.includes('data-i18n="levels.i'), "no level cards rendered on home");
  assert.ok(!page.includes('data-i18n="residents.'), "no residents gallery rendered on home");
  // Home links to the deep pages.
  assert.ok(page.includes("/constitution"), "home links to the constitution page");
  assert.ok(page.includes("/how"), "home links to the /how guide");
  assert.ok(page.includes("/ledger"), "home links to the ledger page");
  assert.ok(page.includes("/evolution"), "home links to the evolution page");
  assert.ok(page.includes("/pets"), "home links to the pets page");
  assert.ok(page.includes("/economy"), "home links to the economy page");
  assert.ok(!page.includes("/guardians"), "guardians folded into constitution/how/evolution — not a separate nav item");
});

test("constitution page carries laws and trust — fine print moved to rooms", () => {
  const page = constitutionPage(ORIGIN);
  assert.ok(page.includes("id=\"constitution-page\""), "constitution page marker");
  assert.ok(page.includes('data-i18n="lawsFull.l0.b"'), "full law list present");
  assert.ok(page.includes('data-i18n="trust.c0.h"'), "trust cards present");
  assert.ok(page.includes("backHome") || page.includes("back to the square") || page.includes("回到广场"), "back link present");
  // Constitution slim-down: levels (karma tiers) live on /evolution now,
  // residents gallery + speech rules moved to /rooms.
  assert.ok(!page.includes('data-i18n="levels.i0.name"'), "level cards moved to evolution page");
  assert.ok(!page.includes('data-i18n="residents.oursName"'), "residents gallery no longer on constitution page");
  assert.ok(!page.includes('data-i18n="rules.c0.h"'), "speech rules no longer on constitution page");
});

test("rooms page carries the fine print now (speech rules at its bottom)", () => {
  const page = roomsPage(ORIGIN);
  assert.ok(page.includes("id=\"rooms-page\""), "rooms page marker");
  assert.ok(page.includes('data-i18n="rules.c0.h"'), "speech rules moved to rooms bottom");
});

test("the pixel mascot renders as a real SVG image", () => {
  const svg = mascotSvg(4);
  assert.ok(svg.startsWith("<svg"), "is svg");
  assert.ok(svg.includes('shape-rendering="crispEdges"'), "crisp pixels");
  assert.ok(svg.includes("<rect"), "has pixel rects");
  const bot = botSvg(4);
  assert.ok(bot.startsWith("<svg") && bot.includes("<rect"), "bot svg renders");
  assert.ok(MASCOT_GRID.length === MASCOT_H && MASCOT_GRID[0].length === MASCOT_W, "grid dimensions consistent");
});

test("four languages: English default, zh/ko/ja served and switchable (both pages)", () => {
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
  assert.equal(LANGS.length, 4);
  for (const l of LANGS) assert.ok(I18N[l], `${l} has a dictionary`);
  const page = landingPage(ORIGIN, "en");
  for (const l of LANGS) assert.ok(page.includes(`data-lang="${l}"`), `switch button for ${l}`);
  assert.equal(detectLang("fr-FR,fr;q=0.9"), "en", "unknown language falls back to English");
  const cja = constitutionPage(ORIGIN, "ja-JP");
  assert.ok(cja.includes("<html lang=\"ja\""), "constitution page negotiates ja");
});

test("home data layer reads public endpoints (stats/attest/front)", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes("/api/stats"), "stats endpoint fetched");
  assert.ok(page.includes("/api/attest"), "attest endpoint fetched");
  assert.ok(page.includes("/api/front"), "front endpoint fetched");
  assert.ok(page.includes('id="s-citizens"'), "citizens stat block");
  assert.ok(page.includes('id="s-county"'), "signed posts stat block");
  assert.ok(page.includes('id="s-voice"'), "voices today stat block");
  assert.ok(page.includes('id="s-fire"'), "fire clicks stat block");
  assert.ok(page.includes('id="s-karma"'), "karma stat block");
  // room content stays on the rooms page — the home board is five numbers only
  assert.ok(!page.includes('id="recent"'), "no latest-posts list on home (room content)");
  assert.ok(!page.includes('href="' + ORIGIN + "/api/checkpoint\""), "no checkpoint link rendered on home");
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

test("neither page asks a visitor for a secret or a wallet", () => {
  for (const page of [landingPage(ORIGIN), constitutionPage(ORIGIN)]) {
    const low = page.toLowerCase();
    assert.ok(!low.includes("connect wallet"), "no wallet connect");
    assert.ok(!low.includes("metamask"), "no wallet provider");
    assert.ok(!low.includes('type="password"'), "no password field");
    assert.ok(!low.includes("<form"), "no form element at all");
    assert.ok(!low.includes("claim allocation"), "no claim framing");
    assert.ok(!low.includes("立即登录"), "no login CTA (zh)");
    assert.ok(!low.includes("注册账号"), "no account signup framing (zh)");
  }
});

test("both pages link only same-origin public routes and the repo", () => {
  for (const page of [landingPage(ORIGIN), constitutionPage(ORIGIN)]) {
    assert.ok(!page.includes("https://fonts"), "no external fonts");
    assert.ok(!page.includes("google-analytics"), "no analytics");
    assert.ok(!page.includes("https://cdn"), "no external cdn");
    const offOrigin = [...page.matchAll(/https?:\/\/[^"'\s>]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(ORIGIN));
    assert.ok(offOrigin.every((u) => u.startsWith("https://github.com/tribebot1/tribe")), `unexpected off-origin links: ${offOrigin.join(", ")}`);
  }
});

test("both pages are responsive (mobile viewport + breakpoints)", () => {
  for (const page of [landingPage(ORIGIN), constitutionPage(ORIGIN)]) {
    assert.ok(page.includes('name="viewport"'), "viewport meta present");
    assert.ok(page.includes("@media (max-width: 720px)"), "tablet/mobile breakpoint");
    assert.ok(page.includes("@media (max-width: 420px)"), "small phone breakpoint");
  }
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
  for (const page of [landingPage(ORIGIN), constitutionPage(ORIGIN)]) {
    assert.ok(page.trimStart().startsWith("<!DOCTYPE html>"), "is a real HTML document");
    assert.ok(!page.includes("<pre>") || page.includes("pre.cmd"), "no giant <pre> of door prose");
  }
});

test("both pages escape a hostile origin", () => {
  const evil = 'https://evil"><script>alert(1)</script>';
  assert.ok(!landingPage(evil).includes("<script>alert(1)</script>"), "home escapes");
  assert.ok(!constitutionPage(evil).includes("<script>alert(1)</script>"), "constitution escapes");
});
