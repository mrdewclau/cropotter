import { build } from "esbuild";
import { mkdir, chmod, copyFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
await mkdir(new URL("dist/", root), { recursive: true });
for (const entry of ["cli", "mcp", "service"]) {
  await build({
    entryPoints: [new URL(`src/${entry}.ts`, root).pathname],
    outfile: new URL(`dist/${entry}.mjs`, root).pathname,
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    packages: "external",
    sourcemap: false,
    logLevel: "warning",
  });
  if (entry !== "service")
    await chmod(new URL(`dist/${entry}.mjs`, root), 0o755);
}
await copyFile(
  new URL("../../../LICENSE", import.meta.url),
  new URL("dist/LICENSE", root),
);
