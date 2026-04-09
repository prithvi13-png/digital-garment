"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Role } from "@/types/api";

export function AuthGuard({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  useEffect(() => {
    if (isBootstrapping) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (roles?.length && user && !roles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isBootstrapping, roles, router, user]);

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-500">Preparing your workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (roles?.length && user && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
