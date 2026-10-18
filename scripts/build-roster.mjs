import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "src/roster.mjs")],
  outfile: resolve(root, "public/roster-reader.js"),
  bundle: true,
  format: "iife",
  globalName: "RosterReader",
  target: "es2022",
  minify: true
});
