"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();

  useEffect(() => {
    if (isBootstrapping) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, isBootstrapping, router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <p className="text-sm text-slate-500">Loading workspace...</p>
    </main>
  );
}
