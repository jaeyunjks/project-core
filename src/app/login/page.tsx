import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — Coreboard" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-[13px] overflow-hidden shadow-[0_6px_16px_rgba(62,91,77,0.22)]">
            <Image
              src="/coreboard.png"
              alt="Coreboard"
              width={88}
              height={88}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[18px] font-semibold tracking-tight text-ink">
            Coreboard
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-2">
          Welcome back
        </h1>
        <p className="text-[15px] leading-relaxed text-subtle mb-8">
          Your tools are right where you left them.
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
