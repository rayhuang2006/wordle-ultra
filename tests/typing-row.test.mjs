import test from "node:test";
import assert from "node:assert/strict";
import { updateTypingRow } from "../typing-row.mjs";

function boardFixture() {
  return { children: Array.from({ length: 6 }, () => ({
    children: Array.from({ length: 5 }, () => ({
      textContent: "", dataset: { state: "empty" }
    })),
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; }
  })) };
}

test("typing modifies only the active row, not the rest of the board", () => {
  const board = boardFixture();
  const otherRows = board.children.filter((_, i) => i !== 2);
  const originalTiles = board.children[2].children.slice();
  assert.equal(updateTypingRow(board, 2, "ste"), true);
  assert.deepEqual(board.children[2].children.map(t => t.textContent), ["S", "T", "E", "", ""]);
  assert.deepEqual(board.children[2].children.map(t => t.dataset.state), [
    "filled", "filled", "filled", "empty", "empty"
  ]);
  assert.equal(board.children[2].attributes["aria-label"], "第 3 次猜測：ste");
  assert.ok(originalTiles.every((tile, i) => tile === board.children[2].children[i]));
  assert.ok(otherRows.every(row => row.children.every(tile => tile.textContent === "")));
});

test("rapid entry and deletion reuse tile nodes without repainting unrelated cells", () => {
  const board = boardFixture();
  const target = board.children[0].children;
  const existing = target.slice();
  for (const typed of ["s", "st", "sta", "star", "stare", "star", "sta", "st", "s", ""]) {
    assert.equal(updateTypingRow(board, 0, typed), true);
    assert.ok(existing.every((tile, i) => tile === target[i]));
    assert.equal(target.map(t => t.textContent).join(""), typed.toUpperCase());
  }
  assert.equal(board.children[0].attributes["aria-label"], "第 1 次猜測：尚未輸入");
});

test("rejects invalid row and invalid text without touching the DOM", () => {
  const board = boardFixture();
  assert.equal(updateTypingRow(board, 6, "abc"), false);
  assert.equal(updateTypingRow(board, -1, "abc"), false);
  assert.equal(updateTypingRow(board, 0, "TOOLONG"), false);
  assert.equal(updateTypingRow(board, 0, "ab3"), false);
  assert.ok(board.children.every(row => !Object.keys(row.attributes).length));
});

test("the active-row module is included in the offline PWA shell", async () => {
  const { readFileSync } = await import("node:fs");
  const worker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(worker, /"wordle-ultra-shell-v3"/);
  assert.match(worker, /"\.\/typing-row\.mjs"/);
});
