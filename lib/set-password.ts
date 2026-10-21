// Usage: npm run set-password -- annastone@me.com
// Creates the user if missing, otherwise resets their password. Prompts for the password (hidden).
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import bcrypt from "bcryptjs";
import { Pool } from "pg";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolvePrompt) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let input = "";
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolvePrompt(input);
      } else if (ch === "\u0003") {
        process.exit(1);
      } else if (ch === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run set-password -- <email>");
    process.exit(1);
  }

  const password = await promptHidden(`New password for ${email}: `);
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if ((await promptHidden("Confirm password: ")) !== password) {
    console.error("Passwords don't match.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()`,
    [email, hash]
  );
  await pool.end();
  console.log(`Password set for ${email}.`);
}

main();
