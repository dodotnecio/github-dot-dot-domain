import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthState } from "@/lib/use-auth";
import { MONTHS, TYPES, peso, typeMeta, type AssistType } from "@/lib/spartans";
import { Eye, EyeOff } from "lucide-react";

const inputCls = "w-full px-3 py-2 rounded-md border border-[var(--color-gold-soft)] bg-white focus:outline-none focus:border-[var(--color-gold)]";

export function MemberProfile({ auth }: { auth: AuthState }) {
  const [email, setEmail] = useState(auth.profile?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      if (!auth.user) throw new Error("Not signed in.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Your session expired. Please sign in again.");

      if (email !== auth.profile?.email) {
        const p = await supabase.from("profiles").update({ email }).eq("id", auth.user.id);
        if (p.error) throw p.error;
        const r = await supabase.auth.updateUser({ email });
        if (r.error) throw r.error;
      }
      if (pwd) {
        const r = await supabase.auth.updateUser({ password: pwd });
        if (r.error) throw r.error;
      }
      setMsg({ ok: true, text: "✅ Saved." });
      await auth.refresh();
      setPwd("");
    } catch (e: any) {
      setMsg({ ok: false, text: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrap title="👤 My Profile">
      <div className="grid md:grid-cols-2 gap-4">
        <RO label="Full Name" value={auth.profile?.fullname ?? ""} />
        <Editable label="Email"><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} /></Editable>
        <Editable label="New Password (blank = keep current)"><PasswordInput className={inputCls} value={pwd} onChange={setPwd} placeholder="New Password" /></Editable>
      </div>
      <button onClick={save} disabled={busy} className="mt-5 px-5 py-2 rounded-md bg-[var(--color-brand)] text-[var(--color-gold)] font-bold disabled:opacity-60">{busy ? "Saving…" : "Save Changes"}</button>
      {msg && <div className={`mt-3 p-3 text-sm rounded border ${msg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg.text}</div>}
    </Wrap>
  );
}

function RO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase font-bold text-[var(--color-brown-soft)] mb-1">{label}</div>
      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 border border-gray-200">{value || "—"}</div>
    </div>
  );
}
function Editable({ label, children }: any) {
  return (
    <div>
      <div className="text-xs uppercase font-bold text-[var(--color-brown-soft)] mb-1">{label}</div>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={`${className} pr-10`} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-brown-soft)] hover:text-[var(--color-brand)]" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function MemberCode({ auth }: { auth: AuthState }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("redeem_contribution_code", { _code: code.trim().toUpperCase() });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "❌ " + error.message });
    const row = (data as any)?.[0];
    if (row) {
      const meta = typeMeta(row.type as AssistType);
      setMsg({ ok: true, text: `✅ ${peso(Number(row.amount))} recorded for ${meta.label}.` });
      setCode("");
    }
    void auth;
  }

  return (
    <Wrap title="🔑 Enter Contribution Code">
      <div className="p-3 mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-md">
        Inform the admin of your contribution amount → Admin generates a code → Admin sends it to you → Enter it here to record your contribution.
      </div>
      <form onSubmit={submit}>
        <input className={inputCls + " text-center text-2xl font-mono uppercase tracking-[6px] py-3"}
          placeholder="BIR-AB12CD" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
        <button disabled={busy} className="mt-4 w-full py-3 rounded-md bg-[var(--color-brand)] text-[var(--color-gold)] font-bold disabled:opacity-60">{busy ? "Submitting…" : "Submit Code"}</button>
      </form>
      {msg && <div className={`mt-3 p-3 text-sm rounded border ${msg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg.text}</div>}
    </Wrap>
  );
}

interface Contrib { id: string; type: AssistType; amount: number; month: number | null; year: number | null; created_at: string }

export function MemberRecords({ auth }: { auth: AuthState }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [rows, setRows] = useState<Contrib[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!auth.user) return;
    setLoading(true);
    let q = supabase.from("contributions").select("*").eq("member_id", auth.user.id).order("created_at", { ascending: false });
    if (year) q = q.eq("year", year);
    if (month !== "all") q = q.eq("month", month);
    const { data } = await q;
    setRows((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month, auth.user?.id]);

  const totalsByType = TYPES.map(t => ({
    ...t,
    total: rows.filter(r => r.type === t.key).reduce((s, r) => s + Number(r.amount), 0),
  }));
  const grand = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <Wrap title="📋 My Records">
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <Filter label="Year">
          <select className={inputCls} value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => 2026 + i).map(y => <option key={y}>{y}</option>)}
          </select>
        </Filter>
        <Filter label="Month">
          <select className={inputCls} value={month} onChange={e => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All Months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Filter>
        <button onClick={load} className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-bold">🔄 Refresh</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {totalsByType.map(t => (
          <div key={t.key} className="p-3 rounded-md text-center" style={{ background: t.tone, color: t.color }}>
            <div className="text-2xl">{t.emoji}</div>
            <div className="text-xs font-bold mt-1">{t.label}</div>
            <div className="font-bold mt-1">{peso(t.total)}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-warm)] text-[var(--color-brand)]">
            <tr><Th>Type</Th><Th>Amount</Th><Th>Month</Th><Th>Year</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-4 text-center text-[var(--color-brown-soft)]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-[var(--color-brown-soft)]">No contributions in this period.</td></tr>}
            {rows.map(r => {
              const m = typeMeta(r.type);
              return (
                <tr key={r.id} className="border-t border-[var(--color-gold-soft)]">
                  <Td><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: m.tone, color: m.color }}>{m.emoji} {m.label}</span></Td>
                  <Td className="font-bold">{peso(r.amount)}</Td>
                  <Td>{r.month ? MONTHS[r.month - 1] : "—"}</Td>
                  <Td>{r.year ?? "—"}</Td>
                  <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-sm flex justify-between">
        <span>Records: <b>{rows.length}</b></span>
        <span>Grand Total: <b>{peso(grand)}</b></span>
      </div>
    </Wrap>
  );
}

function Filter({ label, children }: any) {
  return (
    <div>
      <div className="text-xs uppercase font-bold text-[var(--color-brown-soft)] mb-1">{label}</div>
      {children}
    </div>
  );
}
function Th({ children }: any) { return <th className="text-left px-3 py-2 font-bold text-xs uppercase tracking-wide">{children}</th>; }
function Td({ children, className }: any) { return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>; }

export function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="max-w-[1000px] mx-auto px-4 py-7">
      <div className="card-spartan p-6">
        <h1 className="font-serif text-2xl font-bold mb-4">{title}</h1>
        {children}
      </div>
    </main>
  );
}
