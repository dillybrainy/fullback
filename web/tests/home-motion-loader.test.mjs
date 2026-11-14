import test from "node:test";
import assert from "node:assert/strict";
import { mountHomeMotion } from "../lib/home-motion-loader.mjs";

function preference(matches = false) {
  const listeners = new Set();
  return {
    matches, listeners,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    change(value) { this.matches = value; listeners.forEach(listener => listener()); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("reduced motion avoids downloading the engine and cleans up on a live preference change", async () => {
  const media = preference(true);
  let loads = 0, installs = 0, cleanups = 0;
  const dispose = mountHomeMotion({}, async () => {
    loads++;
    return { installHomeMotion: () => { installs++; return () => cleanups++; } };
  }, media);
  assert.equal(loads, 0);
  media.change(false);
  await flush();
  assert.equal(installs, 1);
  media.change(true);
  assert.equal(cleanups, 1);
  dispose();
  assert.equal(media.listeners.size, 0);
});

test("a chunk arriving after navigation cannot install motion", async () => {
  const media = preference();
  let resolve, installs = 0;
  const pending = new Promise(done => { resolve = done; });
  const dispose = mountHomeMotion({}, () => pending, media);
  dispose();
  resolve({ installHomeMotion: () => { installs++; } });
  await flush();
  assert.equal(installs, 0);
  assert.equal(media.listeners.size, 0);
});

test("rapid preference changes discard stale loads and dispose the one active controller", async () => {
  const media = preference();
  const pending = [];
  let installs = 0, cleanups = 0;
  const dispose = mountHomeMotion({}, () => new Promise(resolve => pending.push(resolve)), media);
  media.change(true);
  media.change(false);
  const motion = { installHomeMotion: () => { installs++; return () => cleanups++; } };
  pending[0](motion);
  pending[1](motion);
  await flush();
  assert.equal(installs, 1);
  dispose();
  assert.equal(cleanups, 1);
});

test("a failed chunk leaves the static page usable without an unhandled rejection", async () => {
  const media = preference();
  const dispose = mountHomeMotion({}, () => Promise.reject(new Error("offline")), media);
  await flush();
  dispose();
  assert.equal(media.listeners.size, 0);
});
