/**
 * lint-staged config for oxlint + oxfmt.
 *
 * Two details are load-bearing and both were found by testing rather than
 * reading docs:
 *
 * 1. `components/ui` and `drizzle/meta` are vendored from other tools
 *    (`shadcn add`, `drizzle-kit generate`) and are ignored in .oxlintrc.json
 *    and .oxfmtrc.json. Neither tool exits 0 when handed only ignored paths,
 *    so they are filtered out here. lint-staged v17 passes absolute paths, so
 *    the pattern matches the vendored segment anywhere in the path.
 *
 * 2. A returned "cmd1 && cmd2" string only ever runs the first command while
 *    still reporting success. Returning an array makes lint-staged run the
 *    tasks sequentially, which is what we need: oxlint --fix can rewrite code
 *    that oxfmt then formats.
 */

/** Absolute paths, so match the segment anywhere rather than anchoring. */
const VENDORED = /(^|[\\/])(components[\\/]ui|drizzle[\\/]meta)[\\/]/;

const shellQuote = (path) => `'${path.replaceAll("'", "'\\''")}'`;

/** Empty result is the documented way to say "nothing to do". */
const tasksFor = (commands) => (files) => {
  const targets = files.filter((file) => !VENDORED.test(file));
  if (targets.length === 0) return [];

  const paths = targets.map(shellQuote).join(" ");
  return commands.map((command) => `${command} ${paths}`);
};

export default {
  // oxlint only understands code, so it never runs on the data/doc glob below.
  "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}": tasksFor(["oxlint --fix", "oxfmt"]),
  "*.{json,jsonc,css,md,mdx,yaml,yml,toml}": tasksFor(["oxfmt"]),
};
