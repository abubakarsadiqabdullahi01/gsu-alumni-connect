const { spawn } = require("node:child_process");
const dotenv = require("dotenv");

// Match Next.js env precedence used by prisma.config.ts.
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: false });

const args = process.argv.slice(2);
const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  console.error("[db:migrate] DIRECT_URL is missing. Set DIRECT_URL in .env.local or .env.");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const migrateArgs = ["prisma", "migrate", "dev", ...args];

const spawnEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key, value]) => {
    // Windows can expose pseudo env vars like "=C:" that break spawn().
    return key && !key.startsWith("=") && value != null;
  }),
);

let command = "pnpm";
let commandArgs = migrateArgs;
const spawnOptions = {
  stdio: "inherit",
  env: {
    ...spawnEnv,
    DATABASE_URL: directUrl,
  },
};

if (isWindows) {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath) {
    // Reuse the package manager entrypoint that launched this script.
    command = process.execPath;
    commandArgs = [npmExecPath, ...migrateArgs];
  } else {
    // Fallback for direct node execution outside pnpm scripts.
    command = "pnpm prisma migrate dev";
    commandArgs = args;
    spawnOptions.shell = true;
  }
}

const child = spawn(command, commandArgs, spawnOptions);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[db:migrate] Failed to start Prisma migration process.");
  console.error(`[db:migrate] Command: ${command} ${commandArgs.join(" ")}`);
  console.error(error.message);
  process.exit(1);
});
