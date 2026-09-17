import { Algorithm, hash, verify } from "@node-rs/argon2";
import { AppError } from "../errors.js";

export const ARGON2_ALGORITHM = "argon2id";
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function assertPasswordStrength(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken`,
      400,
      "weak_password",
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new AppError("Lösenordet är för långt", 400, "weak_password");
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordStrength(password);
  return hash(password, HASH_OPTIONS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash || password.length > MAX_PASSWORD_LENGTH) return false;
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
