/**
 * @oxlint/plugins must stay on the exact oxlint version: the plugin and the
 * linter move together, and a floating range on oxlint would drift ahead of the
 * plugin on the next release.
 */
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const linter = pkg.devDependencies.oxlint;
const plugin = pkg.devDependencies["@oxlint/plugins"];

if (linter !== plugin) {
  console.error(
    `oxlint ${linter} and @oxlint/plugins ${plugin} must be the same exact version.`,
  );
  process.exit(1);
}
