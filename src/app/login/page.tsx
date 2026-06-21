import { LoginForm } from "./LoginForm";

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

        <LoginForm />
      </div>
    </div>
  );
}
