import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getDataDir } from "@/lib/server/persistence";
import { UuidSchema } from "@/lib/shared/schemas";

const AuthAccountSchema = z.object({
  learnerId: UuidSchema,
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  image: z.string().url().optional(),
  updatedAt: z.string().min(1),
});

const AuthAccountsFileSchema = z.record(z.string(), AuthAccountSchema);

export type AuthAccount = z.infer<typeof AuthAccountSchema>;

function accountsPath(): string {
  return path.join(getDataDir(), "auth", "accounts.json");
}

async function readAccounts(): Promise<Record<string, AuthAccount>> {
  try {
    const raw = await readFile(accountsPath(), "utf8");
    return AuthAccountsFileSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function writeAccounts(accounts: Record<string, AuthAccount>): Promise<void> {
  const filePath = accountsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(accounts, null, 2)}\n`, "utf8");
}

export function googleAccountKey(providerAccountId: string): string {
  return `google:${providerAccountId}`;
}

export async function getAuthAccount(
  providerAccountId: string,
): Promise<AuthAccount | null> {
  const accounts = await readAccounts();
  return accounts[googleAccountKey(providerAccountId)] ?? null;
}

export async function saveAuthAccount(
  providerAccountId: string,
  account: AuthAccount,
): Promise<AuthAccount> {
  const parsed = AuthAccountSchema.parse(account);
  const accounts = await readAccounts();
  accounts[googleAccountKey(providerAccountId)] = parsed;
  await writeAccounts(accounts);
  return parsed;
}
