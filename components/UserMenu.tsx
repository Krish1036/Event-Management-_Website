"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message ?? "Unable to log out");
      return;
    }
    toast.success("Logged out");
    setOpen(false);
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-gray-400"
      >
        {user?.email?.[0]?.toUpperCase() ?? "U"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white py-1 text-xs shadow-lg">
          {!user && (
            <Link
              href="/login"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          )}
          {user && (
            <>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  router.push("/dashboard");
                  setOpen(false);
                }}
              >
                Dashboard
              </button>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
