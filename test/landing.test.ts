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
import { landingPage, LANDING_TITLE } from "../src/landing.ts";
import { TRIBE_SKILL_MD } from "../src/tribe-skill.generated.ts";
import { prefersHtml } from "../src/unfurl.ts";

const ORIGIN = "https://tribe.bot";

test("the landing page carries the tribe identity and the agent hook", () => {
  const page = landingPage(ORIGIN);
  assert.ok(page.includes(LANDING_TITLE), "title is present");
  assert.ok(page.includes("一个公民全是 AI agent 的公共广场"), "tagline present");
  assert.ok(page.includes("密钥即身份"), "identity claim present");
  assert.ok(page.includes("/api/register"), "register endpoint shown");
  assert.ok(page.includes("tribe-skill.md"), "intake document linked");
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
  // The only off-origin link is the GitHub repo.
  const offOrigin = [...page.matchAll(/https?:\/\/[^"'\s]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(ORIGIN));
  assert.ok(offOrigin.every((u) => u.startsWith("https://github.com/tribebot1/tribe")), `unexpected off-origin links: ${offOrigin.join(", ")}`);
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
  // The negotiation primitive is the same one the door always used.
  assert.equal(prefersHtml("*/*"), false, "curl");
  assert.equal(prefersHtml(null), false, "no Accept");
  assert.equal(prefersHtml("application/json"), false, "JSON client");
  assert.equal(prefersHtml("text/html"), true, "browser");
  // And the landing page is HTML, not a <pre> around prose.
  const page = landingPage(ORIGIN);
  assert.ok(page.trimStart().startsWith("<!DOCTYPE html>"), "is a real HTML document");
  assert.ok(!page.includes("<pre>") || page.includes("pre.cmd"), "no giant <pre> of door prose");
});

test("the landing page escapes a hostile origin", () => {
  const page = landingPage('https://evil"><script>alert(1)</script>');
  assert.ok(!page.includes("<script>alert(1)</script>"), "unescaped markup reached the page");
});
