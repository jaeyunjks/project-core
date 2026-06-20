import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Sign in — Project Core" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="w-11 h-11 rounded-[14px] bg-sage flex items-center justify-center shadow-[0_6px_16px_rgba(62,91,77,0.25)] mb-8">
          <div className="w-4 h-4 border-[2.4px] border-white rounded-[5px]" />
        </div>

        <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-2">
          Welcome back
        </h1>
        <p className="text-[15px] leading-relaxed text-subtle mb-8">
          Your tools are right where you left them.
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Email
            </label>
            <input
              type="email"
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
              type="password"
              placeholder="••••••••"
              className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
        </div>

        <Button size="lg" className="w-full mb-6">
          Sign in
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <span className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-[#a39a8b]">or</span>
          <span className="flex-1 h-px bg-border" />
        </div>

        <Button variant="secondary" size="lg" className="w-full gap-2.5">
          <span className="w-[18px] h-[18px] rounded-[5px] bg-sand-tint inline-block" />
          Continue with Passkey
        </Button>

        <p className="text-center text-[14px] text-subtle mt-8">
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-sage hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
