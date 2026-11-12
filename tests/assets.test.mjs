import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { ANSWERS } from "../logic.mjs";

test("dictionary is bundled and contains common answers", () => {
  const words = readFileSync(new URL("../words.txt", import.meta.url), "utf8")
    .trim().split(/\s+/);
  assert.equal(words.length, 14855);
  const allowed = new Set(words);
  assert.ok(ANSWERS.filter(w => allowed.has(w)).length > 400);
});

function inspectPng(relative, expected) {
  const bytes = readFileSync(new URL(relative, import.meta.url));
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  let at = 8, width, height, bitDepth, colorType;
  const compressed = [];
  while (at < bytes.length) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.subarray(at + 4, at + 8).toString("ascii");
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") compressed.push(data);
    at += 12 + length;
    if (type === "IEND") break;
  }
  assert.equal(width, expected);
  assert.equal(height, expected);
  assert.equal(bitDepth, 2);
  assert.equal(colorType, 3);
  const uncompressed = inflateSync(Buffer.concat(compressed));
  assert.equal(uncompressed.length, expected * (1 + Math.ceil(expected / 4)));
}

test("PWA icons are valid decodable 192px and 512px indexed PNGs", () => {
  inspectPng("../icons/icon-192.png", 192);
  inspectPng("../icons/icon-512.png", 512);
});

test("manifest uses project-relative paths and standalone display", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.icons.some(x => x.sizes === "192x192"));
  assert.ok(manifest.icons.some(x => x.sizes === "512x512"));
});
