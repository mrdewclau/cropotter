import { build } from "esbuild";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
const root = new URL("../", import.meta.url);
await mkdir(new URL("dist/server/", root), { recursive: true });
await build({
  entryPoints: [new URL("server/index.ts", root).pathname],
  outfile: new URL("dist/server/server.mjs", root).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  minify: false,
});
async function compress(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), folder);
    if (entry.isDirectory()) await compress(file);
    else if (/\.(js|mjs|css|wasm|svg|json|bcmap|ttf|pfb)$/.test(entry.name)) {
      const bytes = await readFile(file);
      if (bytes.length < 1024) continue;
      await writeFile(new URL(file.href + ".br"), brotliCompressSync(bytes));
      await writeFile(new URL(file.href + ".gz"), gzipSync(bytes));
    }
  }
}
await compress(new URL("dist/client/", root));
console.log("Standalone server and compressed assets ready.");
