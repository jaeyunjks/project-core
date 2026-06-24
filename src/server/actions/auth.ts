"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
} from "@/server/auth";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Signup ────────────────────────────────────────────────────────────────────

export async function signupAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Please enter a valid email." };
  if (password.length < 8)
    return { ok: false, error: "Password must be at least 8 characters." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    return { ok: false, error: "An account with this email already exists." };

  const passwordHash = await hashPassword(password);

  // Create user + a starter employer + default money categories so both
  // HoursBoard and MoneyBoard work on first login.
  const { DEFAULT_CATEGORIES } = await import("@/domain/moneyboard");
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      employers: {
        create: {
          name: "My Job",
          hourlyRate: 0,
          payCycle: "fortnightly",
          payPeriodStartDate: new Date().toISOString().slice(0, 10),
          paydayOffsetDays: 4,
          defaultBreakMinutes: 30,
        },
      },
      moneyCategories: {
        create: DEFAULT_CATEGORIES.map((c) => ({
          key: c.key,
          label: c.label,
          kind: c.kind,
          color: c.color,
          icon: c.icon,
          sortOrder: c.sortOrder,
        })),
      },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password)
    return { ok: false, error: "Email and password are required." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Incorrect email or password." };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Incorrect email or password." };

  await createSession(user.id);
  redirect("/dashboard");
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
