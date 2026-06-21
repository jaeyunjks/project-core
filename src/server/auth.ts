import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import type { User } from "@prisma/client";

const scrypt = promisify(_scrypt) as (
  pw: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const SESSION_COOKIE = "pc_session";
const SESSION_TTL_DAYS = 30;
const SCRYPT_KEYLEN = 64;

// ── Password hashing ─────────────────────────────────────────────────────────

/** Format: `${saltHex}:${hashHex}` */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const got = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Creates a session row and sets the HTTP-only cookie */
export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expiresAt = sessionExpiry();

  await db.session.create({ data: { token, userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Reads the cookie, deletes session row, clears cookie */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Returns the user if a valid (non-expired) session exists, else null */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/**
 * Returns the current user, or redirects when not signed in.
 * - No cookie at all → /login
 * - Cookie present but session invalid (orphan/expired) → /api/logout
 *   (route handler clears the cookie then forwards to /login)
 *
 * Server Components can't mutate cookies directly, so the route-handler
 * detour is required to break out of a stale-cookie loop.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;

  const cookieStore = await cookies();
  const hasCookie = !!cookieStore.get(SESSION_COOKIE);
  redirect(hasCookie ? "/api/logout" : "/login");
}
