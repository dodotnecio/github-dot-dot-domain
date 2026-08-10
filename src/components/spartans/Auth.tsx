import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { View } from "./types";

type Tab = "login" | "member" | "admin";

interface Props { initial: Tab; go: (v: View) => void; onAuth: () => Promise<void>; }

export function Auth({ initial, go, onAuth }: Props) {
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <main className="max-w-[520px] mx-auto px-4 py-8">
      <div className="flex gap-2 mb-4">
        <TabBtn active={tab === "login"} onClick={() => setTab("login")}>🔑 Log In</TabBtn>
        <TabBtn active={tab === "member"} onClick={() => setTab("member")}>👤 Register Member</TabBtn>
        <TabBtn active={tab === "admin"} onClick={() => setTab("admin")}>🛡 Register Admin</TabBtn>
      </div>
      <div className="card-spartan p-6">
        {tab === "login" && <LoginForm go={go} onAuth={onAuth} />}
        {tab === "member" && <RegisterMember go={go} onAuth={onAuth} />}
        {tab === "admin" && <RegisterAdmin go={go} onAuth={onAuth} />}
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold transition ${active
        ? "bg-[var(--color-brand)] text-[var(--color-gold)]"
        : "bg-white border border-[var(--color-gold-soft)] text-[var(--color-brand)] hover:bg-[var(--color-warm)]"}`}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-brown-soft)] mb-1">{label}</div>
      {children}
    </label>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md border border-[var(--color-gold-soft)] bg-white text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-gold)]";

function PasswordInput({ value, onChange, placeholder }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={inputCls + " pr-16"} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-brand)] font-semibold">{show ? "Hide" : "Show"}</button>
    </div>
  );
}

function Msg({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) {
  const styles = {
    ok: "bg-green-50 border-green-300 text-green-800",
    err: "bg-red-50 border-red-300 text-red-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
  }[kind];
  return <div className={`mt-3 p-3 text-sm rounded border ${styles}`}>{children}</div>;
}

function PrimaryBtn({ children, ...props }: any) {
  return <button {...props} className="w-full mt-2 py-2.5 rounded-md bg-[var(--color-brand)] text-[var(--color-gold)] font-bold hover:bg-[var(--color-brand-dark)] disabled:opacity-60">{children}</button>;
}

function LoginForm({ go, onAuth }: { go: (v: View) => void; onAuth: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    if (data.user) {
      await onAuth();
      // route to dashboard
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const r = roles?.[0]?.role;
      go(r === "admin" ? "admin-profile" : "member-profile");
    }
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Reset email sent." });
  }

  return (
    <form onSubmit={submit}>
      <h2 className="font-serif text-xl font-bold mb-4">Log In</h2>
      <Field label="Email"><input type="email" required className={inputCls} value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Password"><PasswordInput value={pwd} onChange={(e: any) => setPwd(e.target.value)} /></Field>
      <PrimaryBtn disabled={busy}>{busy ? "Logging in…" : "Log In"}</PrimaryBtn>
      <button type="button" onClick={() => setShowReset(s => !s)} className="block mt-3 text-sm text-[var(--color-brand)] underline">
        Forgot password? Recover via email
      </button>
      {showReset && (
        <div className="mt-3 p-3 bg-[var(--color-warm)] rounded-md">
          <input type="email" placeholder="your@email.com" className={inputCls} value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
          <button type="button" onClick={sendReset} className="mt-2 px-3 py-2 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-bold text-sm">Send Reset Email</button>
        </div>
      )}
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
    </form>
  );
}

function RegisterMember({ onAuth, go }: any) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullname || !email || !birthday || !code || pwd.length < 6) {
      return setMsg({ kind: "err", text: "Fill all fields. Password must be at least 6 characters." });
    }
    setBusy(true); setMsg(null);
    // Validate code first
    const { data: amount, error: vErr } = await supabase.rpc("validate_registration_code", { _code: code.trim().toUpperCase() });
    if (vErr || amount === null) {
      setBusy(false);
      return setMsg({ kind: "err", text: "❌ Invalid or already used registration code. Contact the admin." });
    }
    // Sign up
    const { error: sErr } = await supabase.auth.signUp({
      email, password: pwd,
      options: { emailRedirectTo: window.location.origin },
    });
    if (sErr) { setBusy(false); return setMsg({ kind: "err", text: sErr.message }); }
    // Atomic: insert profile + role + mark code used
    const { error: cErr } = await supabase.rpc("complete_member_registration", {
      _fullname: fullname, _email: email, _birthday: birthday, _code: code.trim().toUpperCase(),
    });
    setBusy(false);
    if (cErr) return setMsg({ kind: "err", text: cErr.message });
    await onAuth();
    setMsg({ kind: "ok", text: "✅ Registration complete! Welcome to Spartans Community." });
    setTimeout(() => go("member-profile"), 1500);
  }

  return (
    <form onSubmit={submit}>
      <h2 className="font-serif text-xl font-bold mb-4">Register as Member</h2>
      <Field label="Full Name"><input className={inputCls} value={fullname} onChange={e => setFullname(e.target.value)} required /></Field>
      <Field label="Email Address"><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required /></Field>
      <Field label="Birthday"><input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} required /></Field>
      <Field label="Registration Code">
        <input className={inputCls + " font-mono uppercase tracking-widest"} placeholder="REG-AB12CD"
          value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
        <div className="text-xs text-[var(--color-brown-soft)] mt-1">📣 Contact the admin to receive your registration code before signing up.</div>
      </Field>
      <Field label="Password"><PasswordInput value={pwd} onChange={(e: any) => setPwd(e.target.value)} placeholder="min 6 chars" /></Field>
      <PrimaryBtn disabled={busy}>{busy ? "Creating account…" : "Create Member Account"}</PrimaryBtn>
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
    </form>
  );
}

function RegisterAdmin({ onAuth, go }: any) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data: exists } = await supabase.rpc("admin_exists");
    if (exists) { setBusy(false); return setMsg({ kind: "err", text: "An admin already exists." }); }
    const { error: sErr } = await supabase.auth.signUp({
      email, password: pwd, options: { emailRedirectTo: window.location.origin },
    });
    if (sErr) { setBusy(false); return setMsg({ kind: "err", text: sErr.message }); }
    const { error: cErr } = await supabase.rpc("complete_admin_registration", { _fullname: fullname, _email: email });
    setBusy(false);
    if (cErr) return setMsg({ kind: "err", text: cErr.message });
    await onAuth();
    setMsg({ kind: "ok", text: "✅ Admin account created." });
    setTimeout(() => go("admin-profile"), 1200);
  }

  return (
    <form onSubmit={submit}>
      <h2 className="font-serif text-xl font-bold mb-4">Register as Admin</h2>
      <Field label="Full Name"><input className={inputCls} value={fullname} onChange={e => setFullname(e.target.value)} required /></Field>
      <Field label="Email Address"><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required /></Field>
      <Field label="Password"><PasswordInput value={pwd} onChange={(e: any) => setPwd(e.target.value)} placeholder="min 6 chars" /></Field>
      <PrimaryBtn disabled={busy}>{busy ? "Creating admin…" : "Create Admin Account"}</PrimaryBtn>
      {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
    </form>
  );
}
