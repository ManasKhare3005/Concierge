const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(repoRoot, "backend");
const rootEnvPath = path.resolve(repoRoot, ".env");
const backendEnvPath = path.resolve(backendRoot, ".env");
const prismaBinPath = path.resolve(backendRoot, "node_modules", "prisma", "build", "index.js");
const dotenv = require(path.resolve(backendRoot, "node_modules", "dotenv"));

dotenv.config({ path: backendEnvPath });
dotenv.config({ path: rootEnvPath, override: true });

const receivedArgs = process.argv.slice(2);
const finalArgs = receivedArgs.includes("--schema")
  ? receivedArgs
  : [...receivedArgs, "--schema", path.resolve(backendRoot, "prisma", "schema.prisma")];

const child = spawn(process.execPath, [prismaBinPath, ...finalArgs], {
  cwd: backendRoot,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
