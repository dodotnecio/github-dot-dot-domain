import { useState, useRef, useEffect } from "react";
import type { View } from "./types";
import type { Role, ProfileRow } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/spartans-legacy-logo.png.asset.json";

interface Props {
  view: View;
  go: (v: View) => void;
  role: Role;
  profile: ProfileRow | null;
}

function Dropdown({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="px-3 py-2 rounded hover:bg-[var(--color-brand-dark)] text-[var(--color-gold)] font-semibold text-sm">
        {label} ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-[var(--color-gold-soft)] rounded-lg shadow-lg py-1 min-w-[200px] z-50">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-warm)] text-[var(--color-brand)]">
      {children}
    </button>
  );
}

export function Nav({ view, go, role, profile }: Props) {
  const firstName = profile?.fullname?.split(" ")[0] ?? "Account";
  const isLoggedIn = !!role;

  async function logout() {
    await supabase.auth.signOut();
    go("home");
  }

  const memberTabs: { v: View; label: string }[] = [
    { v: "member-profile", label: "👤 Profile" },
    { v: "member-code", label: "🔑 Enter Code" },
    { v: "member-records", label: "📋 Records" },
  ];
  const adminTabs: { v: View; label: string }[] = [
    { v: "admin-profile", label: "👤 Profile" },
    { v: "admin-codegen", label: "🔑 Code Generator" },
    { v: "admin-update", label: "🖼 Update Images" },
    { v: "admin-report", label: "📊 Reports" },
  ];
  const tabs = role === "admin" ? adminTabs : role === "member" ? memberTabs : [];

  return (
    <div className="sticky top-0 z-40 shadow-md">
      <div className="bg-[var(--color-brand)] text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => go("home")} className="flex items-center gap-2 font-serif text-[var(--color-gold)] text-xl font-bold">
            <img src={logoAsset.url} alt="Team Spartans Legacy logo" className="w-8 h-8 object-contain" /> SPARTANS LEGACY
          </button>
          <div className="flex items-center gap-1">
            <Dropdown label="Pages">
              {(close) => (<>
                <MenuItem onClick={() => { go("home"); close(); }}>📢 Updates</MenuItem>
                <MenuItem onClick={() => { go("about"); close(); }}>ℹ️ About Us</MenuItem>
              </>)}
            </Dropdown>
            {!isLoggedIn ? (
              <Dropdown label="Login / Register">
                {(close) => (<>
                  <MenuItem onClick={() => { go("login"); close(); }}>🔑 Log In</MenuItem>
                  <MenuItem onClick={() => { go("register"); close(); }}>👤 Register as Member</MenuItem>
                  <MenuItem onClick={() => { go("register-admin"); close(); }}>🛡 Register as Admin</MenuItem>
                </>)}
              </Dropdown>
            ) : (
              <Dropdown label={firstName}>
                {(close) => (<>
                  {tabs.map(t => (
                    <MenuItem key={t.v} onClick={() => { go(t.v); close(); }}>{t.label}</MenuItem>
                  ))}
                  <div className="border-t border-[var(--color-gold-soft)] my-1" />
                  <MenuItem onClick={() => { logout(); close(); }}>🚪 Logout</MenuItem>
                </>)}
              </Dropdown>
            )}
          </div>
        </div>
      </div>
      {isLoggedIn && tabs.length > 0 && (
        <div className="bg-[var(--color-brand-dark)]">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-1 px-4 py-2 overflow-x-auto">
            {tabs.map(t => {
              const active = view === t.v;
              return (
                <button key={t.v} onClick={() => go(t.v)}
                  className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                    active ? "bg-[var(--color-gold)] text-[var(--color-brand-dark)]" : "text-[var(--color-gold)] hover:bg-[var(--color-brand)]"
                  }`}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
