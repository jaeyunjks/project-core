"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { loginAction, type AuthResult } from "@/server/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" className="w-full mb-6" disabled={pending} type="submit">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction}>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint">
              Password
            </label>
            <span className="text-[12px] font-semibold text-sage cursor-pointer">
              Forgot?
            </span>
          </div>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>
      </div>

      {state?.error && (
        <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-[13px] text-red-700">
          {state.error}
        </div>
      )}

      <SubmitButton />

      <p className="text-center text-[14px] text-subtle mt-2">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-sage hover:underline"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
