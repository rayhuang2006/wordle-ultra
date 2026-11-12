import test from "node:test";
import assert from "node:assert/strict";
import { ANSWERS, scoreGuess, nextAnswer, emptyStats, recordResult } from "../logic.mjs";

test("all curated answers are unique five-letter words", () => {
  assert.ok(ANSWERS.length > 400);
  assert.equal(ANSWERS.length, new Set(ANSWERS).size);
  assert.ok(ANSWERS.every(word => /^[a-z]{5}$/.test(word)));
});

test("all green, all absent and case normalization", () => {
  assert.deepEqual(scoreGuess("CRANE", "crane"), Array(5).fill("correct"));
  assert.deepEqual(scoreGuess("fling", "about"), Array(5).fill("absent"));
});

test("repeated letters consume only the available number of matches", () => {
  assert.deepEqual(scoreGuess("allee", "apple"), ["correct", "present", "absent", "absent", "correct"]);
  assert.deepEqual(scoreGuess("eerie", "serve"), ["absent", "correct", "correct", "absent", "correct"]);
  assert.deepEqual(scoreGuess("sassy", "salsa"), ["correct", "correct", "absent", "correct", "absent"]);
});

test("reject malformed guesses and answers", () => {
  assert.throws(() => scoreGuess("hi", "apple"));
  assert.throws(() => scoreGuess("caper", "a/bcd"));
});

test("shuffled bag exhausts each word once before refilling", () => {
  const pool = ["apple", "beach", "crane"];
  let bag = [], previous = "", seen = [];
  for (let i = 0; i < 3; i++) {
    const next = nextAnswer(pool, bag, previous, () => 0.2);
    bag = next.bag;
    previous = next.answer;
    seen.push(previous);
  }
  assert.deepEqual([...seen].sort(), pool);
  const next = nextAnswer(pool, bag, previous, () => 0.2);
  assert.notEqual(next.answer, previous);
});

test("recording results updates distribution, streak and losses", () => {
  const a = recordResult(emptyStats(), true, 2);
  assert.deepEqual(a.distribution, [0, 1, 0, 0, 0, 0]);
  assert.equal(a.streak, 1);
  const b = recordResult(a, true, 4);
  assert.equal(b.maxStreak, 2);
  const c = recordResult(b, false);
  assert.equal(c.played, 3);
  assert.equal(c.wins, 2);
  assert.equal(c.streak, 0);
  assert.equal(c.maxStreak, 2);
});
