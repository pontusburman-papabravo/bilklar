import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { closePool } from "../db/pool.js";
import { applyMigrations } from "../db/migrate.js";
import { createAdminUser } from "../services/admin-users.js";

function argValue(name: string): string | undefined {
  const prefix = `--${name}`;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === prefix) return argv[i + 1];
    if (argv[i].startsWith(`${prefix}=`)) return argv[i].slice(prefix.length + 1);
  }
  return undefined;
}

async function prompt(question: string, hidden = false): Promise<string> {
  if (!hidden || !stdin.isTTY || !stdin.setRawMode) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(question);
    rl.close();
    return answer;
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let value = "";
  return new Promise((resolve, reject) => {
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Avbruten"));
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };
    const cleanup = () => {
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const email = argValue("email")?.trim();
  if (!email) {
    console.error("Användning: npm run admin:create -- --email you@korpasset.se");
    process.exitCode = 1;
    return;
  }

  await applyMigrations();
  const password = (await prompt("Lösenord: ", true)).trim();
  const repeat = (await prompt("Upprepa lösenord: ", true)).trim();
  if (password !== repeat) {
    throw new Error("Lösenorden matchar inte");
  }
  const admin = await createAdminUser(email, password);
  console.log(`Skapade admin ${admin.emailNormalized}`);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
