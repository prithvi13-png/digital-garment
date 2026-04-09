"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Account information and access role.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Name</p>
            <p className="font-medium text-slate-800">
              {user.first_name} {user.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Username</p>
            <p className="font-medium text-slate-800">{user.username}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="font-medium text-slate-800">{user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Role</p>
            <p className="font-medium text-slate-800">{ROLE_LABELS[user.role]}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Active</p>
            <p className="font-medium text-slate-800">{user.is_active ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Member Since</p>
            <p className="font-medium text-slate-800">{formatDate(user.created_at)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Session</h3>
        <p className="mt-1 text-sm text-slate-500">Logout if you are on a shared device.</p>
        <Button className="mt-4" variant="secondary" onClick={signOut}>
          Logout
        </Button>
      </Card>
    </div>
  );
}
