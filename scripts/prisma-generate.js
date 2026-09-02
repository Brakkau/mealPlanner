const { spawnSync } = require("child_process");
const path = require("path");

const prismaCli = path.join(
  __dirname,
  "..",
  "node_modules",
  "prisma",
  "build",
  "index.js"
);

const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  stdio: "inherit",
  env: process.env
});

if (result.status === 0) {
  process.exit(0);
}

const locked =
  result.status === 1 ||
  result.error?.code === "EPERM" ||
  result.status === null;

if (locked) {
  console.warn(
    "prisma generate skipped: query engine is locked (usually because Next.js is running)."
  );
  console.warn("Stop yarn dev, then run: yarn prisma:generate");
  process.exit(0);
}

process.exit(result.status ?? 1);
