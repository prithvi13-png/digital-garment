"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isBootstrapping } = useAuth();

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
      await signIn(values.username, values.password);
      toast.success("Welcome back!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials";
      toast.error(message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Digital Factory Login</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage orders and production in one place.</p>
        </div>
{/* test */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username or Email</label>
            <Input placeholder="admin or admin@factory.com" {...register("username")} />
            {errors.username ? <p className="mt-1 text-xs text-red-600">{errors.username.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <Input type="password" placeholder="••••••••" {...register("password")} />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-xl bg-blue-50 p-3 text-xs text-slate-600">
          <p>Seed login: admin / Admin@123</p>
        </div>
      </div>
    </main>
  );
}
