"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { signupAction, type AuthResult } from "@/server/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" className="w-full mb-5" disabled={pending} type="submit">
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(
    signupAction,
    null
  );

  return (
    <form action={formAction}>
      <div className="flex flex-col gap-4 mb-5">
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Name
          </label>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Alex Mercer"
            className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>
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
            className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>
      </div>

      {state?.error && (
        <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-[13px] text-red-700">
          {state.error}
        </div>
      )}

      <SubmitButton />

      <p className="text-center text-[14px] text-subtle">
        Already have one?{" "}
        <Link
          href="/login"
          className="font-semibold text-sage hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
