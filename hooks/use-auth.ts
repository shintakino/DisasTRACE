"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClientBrowser } from "@/lib/supabase";
import { UserRole } from "@/types/users";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClientBrowser(), []);

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUser(user);
      setRole(user?.app_metadata?.role || null);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setRole(session?.user?.app_metadata?.role || null);
        setLoading(false);
      }
    );

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void supabase.auth.getSession();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [supabase]);

  return { user, role, loading };
}
