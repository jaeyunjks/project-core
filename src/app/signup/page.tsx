import Link from "next/link";
import { SignupForm } from "./SignupForm";

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>

        <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-2">
          Make it yours
        </h1>
        <p className="text-[15px] leading-relaxed text-subtle mb-7">
          A private space for your personal tools.
        </p>

        <SignupForm />
      </div>
    </div>
  );
}
