import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "member" | null;
export interface ProfileRow {
  id: string;
  fullname: string;
  email: string;
  birthday: string | null;
  reg_code_used: string | null;
}

export interface AuthState {
  user: User | null;
  role: Role;
  profile: ProfileRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadFor(u: User | null) {
    if (!u) { setRole(null); setProfile(null); return; }
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("id, fullname, email, birthday, reg_code_used").eq("id", u.id).maybeSingle(),
    ]);
    const r = (roles?.[0]?.role ?? null) as Role;
    setRole(r);
    setProfile(prof as ProfileRow | null);
  }

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    await loadFor(data.user);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // defer to avoid deadlock
      setTimeout(() => { loadFor(u); }, 0);
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      await loadFor(u);
      setLoading(false);
    })();
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  return { user, role, profile, loading, refresh };
}
