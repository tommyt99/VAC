import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete molecular dynamics lab", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Molecular Dynamics Lab · VAC<\/title>/i);
  assert.match(html, /<h1>Molecular dynamics<\/h1>/i);
  assert.match(html, /Set up the system/i);
  assert.match(html, /Live observables/i);
  assert.match(html, /Substance/i);
  assert.match(html, /Argon \(Ar\)/i);
  assert.match(html, /Neon \(Ne\)/i);
  assert.match(html, /Krypton \(Kr\)/i);
  assert.match(html, /Xenon \(Xe\)/i);
  assert.match(html, /Download XYZ/i);
  assert.match(html, /Science notes &amp; limitations/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("removes disposable starter assets and metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /MolecularDynamicsLab/);
  assert.match(layout, /Molecular Dynamics Lab · VAC/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
  await assert.rejects(access(new URL("public/favicon.svg", projectRoot)));
});
