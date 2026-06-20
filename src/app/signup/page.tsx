import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Create account — Project Core" };

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        {/* Back */}
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[11px] border border-border bg-white text-sage mb-8"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>

        <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-2">
          Make it yours
        </h1>
        <p className="text-[15px] leading-relaxed text-subtle mb-7">
          A private space for your personal tools.
        </p>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Name
            </label>
            <input
              type="text"
              placeholder="Alex Mercer"
              className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a strong password"
              className="w-full h-[50px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 mb-6">
          <span className="w-5 h-5 rounded-[6px] bg-sage flex items-center justify-center shrink-0 mt-0.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <span className="text-[13px] leading-relaxed text-subtle">
            I agree to keep this calm and only add tools I'll actually use.
          </span>
        </div>

        <Button size="lg" className="w-full mb-5">
          Create account
        </Button>

        <p className="text-center text-[14px] text-subtle">
          Already have one?{" "}
          <Link
            href="/login"
            className="font-semibold text-sage hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
