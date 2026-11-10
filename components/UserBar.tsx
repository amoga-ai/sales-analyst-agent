"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { name: string; email: string; role: string[] };

export default function UserBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
      <span>
        Signed in as <strong>{user.name}</strong> ({user.role.join(", ")})
      </span>
      <button
        onClick={logout}
        className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-500 dark:border-zinc-700"
      >
        Log out
      </button>
    </div>
  );
}