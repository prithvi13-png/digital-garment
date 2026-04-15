"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  Gauge,
  Loader2,
  MoonStar,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import logoImage from "@/components/layout/lg.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

const schema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const highlights = [
  {
    icon: Factory,
    title: "Unified Operations",
    description: "Production, inventory, quality, and planning in one workspace.",
  },
  {
    icon: Gauge,
    title: "Executive Visibility",
    description: "Track line efficiency, fulfillment pace, and risk signals instantly.",
  },
  {
    icon: CheckCircle2,
    title: "Faster Decisions",
    description: "Role-based dashboards and reports that cut response time.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isBootstrapping } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  const onSubmit = async (values: FormValues) => {
    try {
      setTheme("dark");
      await signIn(values.username, values.password);
      toast.success("Welcome back!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials";
      toast.error(message);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-2 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/20 bg-white/10 shadow-[0_28px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className={cn(
            "relative overflow-hidden border-b p-6 sm:p-10 lg:border-b-0 lg:border-r",
            isDark ? "border-white/10 bg-[#0a1730]/70" : "border-[#d8e4f6] bg-white/70",
          )}
        >
          <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-blue-500/25 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className={cn("rounded-2xl p-1.5", isDark ? "border border-white/20 bg-white/10" : "border border-[#d9e5f7] bg-white/90") }>
              <Image src={logoImage} alt="Digital Factory Logo" width={56} height={56} priority />
            </div>
            <div>
              <p className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>Digital Factory</p>
              <p className={cn("text-[11px] uppercase tracking-[0.14em]", isDark ? "text-blue-100/75" : "text-slate-500")}>Premium Operations Suite</p>
            </div>
          </div>

          <div className="relative z-10 mt-10">
            <p
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                isDark ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" : "border-blue-200 bg-blue-50 text-blue-700",
              )}
            >
              Your tasks simplified
            </p>
            <h1 className={cn("mt-4 text-4xl font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Run the factory with confidence.</h1>
            <p className={cn("mt-3 max-w-lg text-sm", isDark ? "text-blue-100/80" : "text-slate-600")}>
              A premium command center for production, quality, inventory, and planning teams.
            </p>
          </div>

          <div className="relative z-10 mt-8 grid gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-2xl border p-4 backdrop-blur",
                    isDark ? "border-white/15 bg-white/8" : "border-[#d9e5f7] bg-white/90",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", isDark ? "text-cyan-200" : "text-blue-600")} />
                    <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{item.title}</p>
                  </div>
                  <p className={cn("text-xs", isDark ? "text-blue-100/75" : "text-slate-600")}>{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="premium-panel relative flex min-h-[620px] flex-col justify-center px-6 py-8 sm:px-10">
          <div className="absolute right-6 top-6">
            <Button
              variant="secondary"
              onClick={toggleTheme}
              className="min-w-10 px-3"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">Secure Access</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue your factory operations.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Username or Email</label>
              <Input
                placeholder="admin or admin@factory.com"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                {...register("username")}
              />
              {errors.username ? <p className="mt-1 text-xs text-red-600">{errors.username.message}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
                spellCheck={false}
                {...register("password")}
              />
              {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 text-xs text-slate-600">
            <p>Seed login: admin / Admin@123</p>
          </div>
        </section>
      </div>
    </main>
  );
}
