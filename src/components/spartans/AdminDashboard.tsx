import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthState } from "@/lib/use-auth";
import { MONTHS, TYPES, genContributionCode, genRegistrationCode, peso, typeMeta, type AssistType } from "@/lib/spartans";
import { Wrap } from "./MemberDashboard";
import { Eye, EyeOff } from "lucide-react";

const inputCls = "w-full px-3 py-2 rounded-md border border-[var(--color-gold-soft)] bg-white focus:outline-none focus:border-[var(--color-gold)]";

export function AdminProfile({ auth }: { auth: AuthState }) {
  const [fullname, setFullname] = useState(auth.profile?.fullname ?? "");
  const [email, setEmail] = useState(auth.profile?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (!auth.user) return;
    setBusy(true); setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Your session expired. Please sign in again.");

      const p = await supabase.from("profiles").update({ fullname, email }).eq("id", auth.user.id);
      if (p.error) throw p.error;

      if (email !== auth.profile?.email) {
        const r = await supabase.auth.updateUser({ email });
        if (r.error) throw r.error;
      }
      if (pwd) {
        const r = await supabase.auth.updateUser({ password: pwd });
        if (r.error) throw r.error;
      }
      setMsg({ ok: true, text: "✅ Saved." });
      setPwd("");
      await auth.refresh();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrap title="👤 Admin Profile">
      <div className="grid md:grid-cols-2 gap-4">
        <F label="Full Name"><input className={inputCls} value={fullname} onChange={e => setFullname(e.target.value)} /></F>
        <F label="Email"><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} /></F>
        <F label="New Password"><PasswordInput className={inputCls} value={pwd} onChange={setPwd} placeholder="New Password" /></F>
      </div>
      <button onClick={save} disabled={busy} className="mt-5 px-5 py-2 rounded-md bg-[var(--color-brand)] text-[var(--color-gold)] font-bold disabled:opacity-60">{busy ? "Saving…" : "Save Changes"}</button>
      {msg && <div className={`mt-3 p-3 text-sm rounded border ${msg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg.text}</div>}
    </Wrap>
  );
}

function F({ label, children }: any) {
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

export function AdminCodeGen() {
  return (
    <Wrap title="🔑 Code Generator">
      <RegistrationCodeSection />
      <div className="my-8 border-t border-[var(--color-gold-soft)]" />
      <ContributionCodeSection />
      <div className="my-8 border-t border-[var(--color-gold-soft)]" />
      <RecipientSection />
    </Wrap>
  );
}

function CodeResult({ kind, code, lines }: { kind: string; code: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 p-5 rounded-lg bg-[var(--color-brand-dark)] text-white">
      <div className="text-xs uppercase tracking-wide text-[var(--color-gold)] mb-2">{kind} CODE — Send this to the recipient:</div>
      <div className="font-mono text-3xl text-center py-2" style={{ letterSpacing: "6px" }}>{code}</div>
      <ul className="text-sm mt-3 space-y-1">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="mt-3 px-3 py-1.5 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] text-sm font-bold">
        📋 {copied ? "Copied!" : "Copy Code"}
      </button>
      <div className="mt-2 text-xs opacity-80">This code can only be used ONCE.</div>
    </div>
  );
}

function RegistrationCodeSection() {
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<{ code: string; amount: number; ref: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function gen() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setMsg("Enter amount > 0");
    const code = genRegistrationCode();
    const { error } = await supabase.from("registration_codes").insert({ code, amount: amt });
    if (error) return setMsg(error.message);
    setResult({ code, amount: amt, ref });
    setMsg(null); setAmount(""); setRef("");
  }

  return (
    <section>
      <h3 className="font-serif text-xl font-bold">Registration Code Generator</h3>
      <p className="text-sm mt-1 p-3 bg-[var(--color-warm)] rounded">A new member contacts you to join. Convert their registration fee to points (1:1). Generate a code and send it to them. They must enter this code during signup.</p>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <F label="Amount / Points"><input type="number" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} /></F>
        <F label="Member Reference (optional)"><input className={inputCls} value={ref} onChange={e => setRef(e.target.value)} /></F>
      </div>
      <button onClick={gen} className="mt-3 px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-bold">⚡ Generate Registration Code</button>
      {msg && <div className="mt-2 text-sm text-red-700">{msg}</div>}
      {result && <CodeResult kind="REGISTRATION" code={result.code} lines={[`Amount: ${peso(result.amount)}`, result.ref ? `Member: ${result.ref}` : ""]} />}
    </section>
  );
}

function ContributionCodeSection() {
  const [type, setType] = useState<AssistType>("birthday");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<{ code: string; type: AssistType; amount: number; ref: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Deduct feature — per-type running totals + subtract mistaken amounts
  const [deductType, setDeductType] = useState<AssistType>("birthday");
  const [deductAmount, setDeductAmount] = useState("");
  const [totals, setTotals] = useState<Record<AssistType, number>>({ birthday: 0, medical: 0, calamity: 0, maternity: 0 });
  const [deductBusy, setDeductBusy] = useState(false);
  const [deductMsg, setDeductMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function gen() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setMsg("Enter amount > 0");
    const code = genContributionCode(type);
    const { error } = await supabase.from("contribution_codes").insert({ code, type, amount: amt });
    if (error) return setMsg(error.message);
    setResult({ code, type, amount: amt, ref });
    setMsg(null); setAmount(""); setRef("");
    loadTotals();
  }

  async function loadTotals() {
    const { data } = await supabase.from("contributions").select("type, amount");
    const t: Record<AssistType, number> = { birthday: 0, medical: 0, calamity: 0, maternity: 0 };
    for (const r of (data ?? []) as { type: AssistType; amount: number }[]) {
      if (t[r.type] !== undefined) t[r.type] += Number(r.amount);
    }
    setTotals(t);
  }

  useEffect(() => { loadTotals(); }, []);

  async function deduct() {
    const amt = Number(deductAmount);
    if (!amt || amt <= 0) return setDeductMsg({ ok: false, text: "Enter amount > 0" });
    if (amt > totals[deductType]) return setDeductMsg({ ok: false, text: `Cannot deduct more than current total (${peso(totals[deductType])}).` });
    if (!confirm(`Subtract ${peso(amt)} from ${typeMeta(deductType).label}?`)) return;
    setDeductBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setDeductBusy(false); return setDeductMsg({ ok: false, text: "Not authenticated." }); }
    const now = new Date();
    const { error } = await supabase.from("contributions").insert({
      member_id: u.user.id, type: deductType, amount: -amt,
      month: now.getMonth() + 1, year: now.getFullYear(),
    });
    setDeductBusy(false);
    if (error) return setDeductMsg({ ok: false, text: error.message });
    setDeductMsg({ ok: true, text: `✅ Deducted ${peso(amt)} from ${typeMeta(deductType).label}.` });
    setDeductAmount("");
    loadTotals();
  }

  return (
    <section>
      <h3 className="font-serif text-xl font-bold">Contribution Code Generator</h3>
      <p className="text-sm mt-1 p-3 bg-[var(--color-warm)] rounded">A member tells you their contribution amount. Convert to points (1:1). Select the fund type. Generate and send the code.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {TYPES.map(t => {
          const active = type === t.key;
          return (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`p-3 rounded border-2 font-bold text-sm transition ${active ? "" : "border-[var(--color-gold-soft)] bg-white text-[var(--color-brand)]"}`}
              style={active ? { borderColor: t.color, color: t.color, background: t.tone } : undefined}>
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <F label="Amount / Points"><input type="number" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} /></F>
        <F label="Member Reference (optional)"><input className={inputCls} value={ref} onChange={e => setRef(e.target.value)} /></F>
      </div>
      <button onClick={gen} className="mt-3 px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-bold">⚡ Generate Contribution Code</button>
      {msg && <div className="mt-2 text-sm text-red-700">{msg}</div>}
      {result && <CodeResult kind="CONTRIBUTION" code={result.code} lines={[`Type: ${typeMeta(result.type).label}`, `Amount: ${peso(result.amount)}`, result.ref ? `Member: ${result.ref}` : ""]} />}

      <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50/40">
        <h4 className="font-serif text-lg font-bold text-red-800">➖ Deduct Contribution Amount</h4>
        <p className="text-xs mt-1 text-[var(--color-brown-soft)]">Use this to subtract a mistaken amount from a fund total. Applied separately per fund type.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {TYPES.map(t => {
            const active = deductType === t.key;
            return (
              <button key={t.key} onClick={() => setDeductType(t.key)}
                className={`p-2 rounded border-2 text-sm font-bold text-left ${active ? "" : "border-[var(--color-gold-soft)] bg-white text-[var(--color-brand)]"}`}
                style={active ? { borderColor: t.color, color: t.color, background: t.tone } : undefined}>
                <div>{t.emoji} {t.label}</div>
                <div className="text-xs font-normal opacity-80 mt-0.5">Current: {peso(totals[t.key])}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input type="number" className={inputCls} placeholder="Amount to subtract" value={deductAmount} onChange={e => setDeductAmount(e.target.value)} />
          <button onClick={deduct} disabled={deductBusy} className="px-4 py-2 rounded bg-red-600 text-white font-bold whitespace-nowrap disabled:opacity-50">
            ➖ {deductBusy ? "Deducting…" : "Subtract"}
          </button>
        </div>
        {deductMsg && <div className={`mt-3 p-2 text-sm rounded border ${deductMsg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{deductMsg.text}</div>}
      </div>
    </section>
  );
}


function RecipientSection() {
  const [type, setType] = useState<AssistType>("birthday");
  const [name, setName] = useState("");
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadCount() {
    const { count: c, error } = await supabase
      .from("assistance_recipients")
      .select("*", { count: "exact", head: true })
      .eq("type", type);
    if (error) return;
    setCount(c ?? 0);
  }

  async function add() {
    if (!name.trim()) return setMsg({ ok: false, text: "Enter a name" });
    setBusy(true);
    const now = new Date();
    const { error } = await supabase.from("assistance_recipients").insert({
      type, name: name.trim(), month: now.getMonth() + 1, year: now.getFullYear(),
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: `✅ Added ${name} as ${typeMeta(type).label} recipient.` });
    setName("");
    await loadCount();
  }

  async function removeLast() {
    if (count <= 0) return;
    if (!confirm(`Remove the last ${typeMeta(type).label} recipient?`)) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("assistance_recipients")
      .select("id")
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) { setBusy(false); return setMsg({ ok: false, text: error.message }); }
    const { error: delError } = await supabase.from("assistance_recipients").delete().eq("id", data.id);
    setBusy(false);
    if (delError) return setMsg({ ok: false, text: delError.message });
    setMsg({ ok: true, text: `✅ Removed the last ${typeMeta(type).label} recipient.` });
    await loadCount();
  }

  useEffect(() => { loadCount(); }, [type]);

  return (
    <section>
      <h3 className="font-serif text-xl font-bold">➕ Add / ➖ Remove Assistance Recipient</h3>
      <p className="text-sm mt-1 text-[var(--color-brown-soft)]">Adding a recipient updates the ÷ denominator in the home page calculator. Use Remove Last to undo the most recent entry.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {TYPES.map(t => {
          const active = type === t.key;
          return (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`p-2 rounded border-2 font-bold text-sm ${active ? "" : "border-[var(--color-gold-soft)] bg-white text-[var(--color-brand)]"}`}
              style={active ? { borderColor: t.color, color: t.color, background: t.tone } : undefined}>
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input className={inputCls} placeholder="Recipient name" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={add} disabled={busy} className="px-4 py-2 rounded bg-[var(--color-brand)] text-[var(--color-gold)] font-bold whitespace-nowrap disabled:opacity-60">Add Recipient</button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={removeLast} disabled={busy || count === 0} className="px-4 py-2 rounded bg-red-600 text-white font-bold text-sm whitespace-nowrap disabled:opacity-50">
          ➖ Remove Last
        </button>
        <div className="text-sm text-[var(--color-brown-soft)]">
          Live count: <span className="font-bold text-[var(--color-brand)]">{count}</span>
        </div>
      </div>

      {msg && <div className={`mt-3 p-3 text-sm rounded border ${msg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{msg.text}</div>}
    </section>
  );
}


export function AdminUpdateImages() {
  const [imgs, setImgs] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("page_images").select("type, url");
    const map: Record<string, string> = {};
    for (const r of data ?? []) {
      const { data: signed } = await supabase.storage.from("page-images").createSignedUrl(r.url, 60 * 60);
      if (signed?.signedUrl) map[r.type] = signed.signedUrl;
    }
    setImgs(map);
  }

  useEffect(() => { load(); }, []);

  return (
    <Wrap title="🖼 Update Front Page Images">
      <div className="p-3 bg-[var(--color-warm)] rounded text-sm mb-4">Uploaded images appear live on the home page calculator cards.</div>
      <div className="grid md:grid-cols-2 gap-4">
        {TYPES.map(t => (
          <ImageUploader
            key={t.key}
            type={t.key}
            label={t.label}
            emoji={t.emoji}
            color={t.color}
            current={imgs[t.key]}
            onUploaded={load}
          />
        ))}
      </div>

      <h3 className="font-serif text-xl font-bold mt-8 mb-2">About Page Images</h3>
      <div className="p-3 bg-[var(--color-warm)] rounded text-sm mb-4">These images pop up on the About Us page for "Who We Are" and "Contact Us".</div>
      <div className="grid md:grid-cols-2 gap-4">
        <ImageUploader type="who" label="Who We Are" emoji="🛡" color="var(--color-brand)" current={imgs.who} onUploaded={load} />
        <ImageUploader type="contact" label="Contact Us" emoji="📞" color="var(--color-brown-soft)" current={imgs.contact} onUploaded={load} />
      </div>
    </Wrap>
  );
}

function ImageUploader({ type, label, emoji, color, current, onUploaded }: { type: string; label: string; emoji: string; color: string; current?: string; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg(null);
    const ext = f.name.split(".").pop();
    const path = `${type}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("page-images").upload(path, f, { upsert: true });
    if (upErr) { setBusy(false); return setMsg("❌ " + upErr.message); }
    const { error: dbErr } = await supabase.from("page_images").upsert({ type, url: path, updated_at: new Date().toISOString() }, { onConflict: "type" });
    setBusy(false);
    if (dbErr) return setMsg("❌ " + dbErr.message);
    setMsg("✅ Image uploaded and now live!");
    onUploaded();
  }

  return (
    <div className="card-spartan p-4">
      <div className="font-bold flex items-center gap-2 mb-2" style={{ color }}>{emoji} {label}</div>
      <div className="h-[130px] rounded bg-[var(--color-warm)] flex items-center justify-center overflow-hidden mb-3">
        {current ? <img src={current} className="w-full h-full object-cover" /> : <span className="text-xs text-[var(--color-brown-soft)]">No image yet</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handle} className="hidden" />
      <button disabled={busy} onClick={() => fileRef.current?.click()}
        className="w-full py-2 rounded font-bold text-white disabled:opacity-60" style={{ background: color }}>
        📤 {busy ? "Uploading…" : "Upload Image"}
      </button>
      {msg && <div className="text-xs mt-2">{msg}</div>}
    </div>
  );
}


interface ReportRow { id: string; member_id: string; type: AssistType; amount: number; month: number | null; year: number | null; created_at: string; profiles?: { fullname: string; email: string } | null }

export function AdminReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [type, setType] = useState<AssistType | "all">("all");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase.from("contributions")
      .select("id, member_id, type, amount, month, year, created_at, profiles(fullname, email)")
      .order("created_at", { ascending: false });
    if (year) q = q.eq("year", year);
    if (month !== "all") q = q.eq("month", month);
    if (type !== "all") q = q.eq("type", type);
    const { data } = await q;
    setRows((data ?? []) as any);
    setLoading(false);
  }

  function printPdf() {
    const totals = TYPES.map(t => ({ ...t, total: rows.filter(r => r.type === t.key).reduce((s, r) => s + Number(r.amount), 0), count: rows.filter(r => r.type === t.key).length }));
    const grand = rows.reduce((s, r) => s + Number(r.amount), 0);
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>Spartans Community Report</title>
      <style>
        body { font-family: Georgia, serif; padding: 20px; color: #222; }
        h1 { color: #6B3A1F; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #FBF6F0; }
        ul { font-size: 13px; }
        @media print { .noprint { display: none; } }
      </style></head><body>
      <h1>⚔ SPARTANS COMMUNITY — Contributions Report</h1>
      <div>Printed: ${new Date().toLocaleString()}</div>
      <div>Period: ${month === "all" ? "All months" : MONTHS[(month as number) - 1]} ${year} · Type: ${type === "all" ? "All" : typeMeta(type as AssistType).label}</div>
      <h3>Summary</h3>
      <ul>${totals.map(t => `<li><b>${t.label}:</b> ${peso(t.total)} (${t.count} records)</li>`).join("")}</ul>
      <h3>Records (${rows.length})</h3>
      <table><thead><tr><th>Member</th><th>Email</th><th>Type</th><th>Amount</th><th>Period</th><th>Date</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.profiles?.fullname ?? "—"}</td><td>${r.profiles?.email ?? ""}</td><td>${typeMeta(r.type).label}</td><td>${peso(r.amount)}</td><td>${r.month ? MONTHS[r.month - 1] : ""} ${r.year ?? ""}</td><td>${new Date(r.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>
      <p><b>Grand Total: ${peso(grand)}</b></p>
      <script>window.onload=()=>window.print();</script>
      </body></html>`);
    w.document.close();
  }

  const totals = TYPES.map(t => ({ ...t, total: rows.filter(r => r.type === t.key).reduce((s, r) => s + Number(r.amount), 0), count: rows.filter(r => r.type === t.key).length }));
  const grand = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <Wrap title="📊 Reports">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <F label="Year"><select className={inputCls} value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 31 }, (_, i) => 2026 + i).map(y => <option key={y}>{y}</option>)}</select></F>
        <F label="Month"><select className={inputCls} value={month} onChange={e => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select></F>
        <F label="Type"><select className={inputCls} value={type} onChange={e => setType(e.target.value as any)}>
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select></F>
        <button onClick={load} className="px-4 py-2 rounded bg-[var(--color-brand)] text-[var(--color-gold)] font-bold">🔄 Load</button>
        {rows.length > 0 && <button onClick={printPdf} className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-bold">🖨 Print PDF</button>}
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {totals.map(t => (
            <div key={t.key} className="p-3 rounded text-center" style={{ background: t.tone, color: t.color }}>
              <div className="text-2xl">{t.emoji}</div>
              <div className="text-xs font-bold">{t.label}</div>
              <div className="font-bold">{peso(t.total)}</div>
              <div className="text-xs opacity-80">{t.count} records</div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-warm)]"><tr>
            <th className="text-left px-3 py-2">Member</th><th className="text-left px-3 py-2">Email</th>
            <th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Period</th><th className="text-left px-3 py-2">Date</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-4 text-center text-[var(--color-brown-soft)]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-[var(--color-brown-soft)]">Click Load to fetch records.</td></tr>}
            {rows.map(r => {
              const m = typeMeta(r.type);
              return (
                <tr key={r.id} className="border-t border-[var(--color-gold-soft)]">
                  <td className="px-3 py-2">{r.profiles?.fullname ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.profiles?.email ?? ""}</td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: m.tone, color: m.color }}>{m.emoji} {m.label}</span></td>
                  <td className="px-3 py-2 font-bold">{peso(r.amount)}</td>
                  <td className="px-3 py-2">{r.month ? MONTHS[r.month - 1] : ""} {r.year ?? ""}</td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && <div className="mt-3 text-sm flex justify-between"><span>Records: <b>{rows.length}</b></span><span>Grand Total: <b>{peso(grand)}</b></span></div>}
    </Wrap>
  );
}
