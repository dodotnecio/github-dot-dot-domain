import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TYPES, peso, type AssistType } from "@/lib/spartans";
import logoAsset from "@/assets/spartans-legacy-logo.png.asset.json";

interface FundData { total: number; recipients: number }

export function Home() {
  const [memberCount, setMemberCount] = useState(0);
  const [funds, setFunds] = useState<Record<AssistType, FundData>>({
    birthday: { total: 0, recipients: 0 },
    medical: { total: 0, recipients: 0 },
    calamity: { total: 0, recipients: 0 },
    maternity: { total: 0, recipients: 0 },
  });
  const [images, setImages] = useState<Record<string, string>>({});

  async function loadFunds() {
    const next: Record<AssistType, FundData> = { ...funds };
    for (const t of TYPES) {
      const { data } = await supabase.rpc("get_fund_summary", { _type: t.key });
      const row = (data as any)?.[0];
      if (row) next[t.key] = { total: Number(row.total), recipients: Number(row.recipients) };
    }
    setFunds(next);
  }

  async function loadImages() {
    const { data } = await supabase.from("page_images").select("type, url");
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      const { data: signed } = await supabase.storage.from("page-images").createSignedUrl(row.url, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) map[row.type] = signed.signedUrl;
    }
    setImages(map);
  }

  async function loadCount() {
    const { data } = await supabase.rpc("get_member_count");
    setMemberCount(Number(data ?? 0));
  }

  useEffect(() => {
    loadCount(); loadFunds(); loadImages();
    const ch = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_roles", filter: "role=eq.member" },
        () => setMemberCount((c) => c + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contributions" }, () => loadFunds())
      .on("postgres_changes", { event: "*", schema: "public", table: "page_images" }, () => loadImages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-[760px] mx-auto px-4 py-7">
      <header className="text-center">
        <img src={logoAsset.url} alt="Team Spartans Legacy logo" className="mx-auto w-40 h-40 object-contain" />
        <h1 className="font-serif text-3xl font-bold text-[var(--color-brand)] mt-2">SPARTANS LEGACY</h1>
        <p className="text-sm text-[var(--color-brown-soft)] mt-1">Stronger Together</p>
        <div className="mx-auto mt-3 h-[3px] w-[60px] bg-[var(--color-gold)] rounded-full" />
      </header>

      {/* Live counter */}
      <section className="card-spartan mt-6 text-center" style={{ borderColor: "var(--color-gold)", borderWidth: 2, background: "var(--color-warm)", padding: 20 }}>
        <div className="text-4xl">👥</div>
        <div className="mt-1 text-xs font-bold tracking-widest text-[var(--color-gold)]">REGISTERED MEMBERS</div>
        <div className="text-5xl font-bold text-[var(--color-brand)] mt-1 font-serif">{memberCount.toLocaleString()}</div>
        <div className="text-sm text-[var(--color-brown-soft)] mt-1">Active community members</div>
      </section>

      {/* Assistance cards */}
      <div className="mt-6 space-y-5">
        {TYPES.map((t) => {
          const f = funds[t.key];
          const per = f.recipients > 0 ? f.total / f.recipients : 0;
          const img = images[t.key];
          return (
            <section key={t.key} className="card-spartan p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg grid place-items-center text-xl" style={{ background: t.tone }}>{t.emoji}</div>
                <h2 className="font-serif font-bold text-lg" style={{ color: t.color }}>{t.label}</h2>
              </div>
              <div className="mt-3 rounded-[10px] overflow-hidden bg-[var(--color-warm)] h-[160px] flex items-center justify-center text-center text-sm text-[var(--color-brown-soft)] border border-dashed border-[var(--color-gold-soft)]">
                {img ? <img src={img} alt={t.label} className="w-full h-full object-cover" /> : <span>Image will appear here after admin uploads</span>}
              </div>
              <div className="mt-4 p-3 rounded-[10px] bg-[var(--color-warm)] border border-[var(--color-gold-soft)]">
                <div className="text-xs font-bold tracking-wider text-[var(--color-brown-soft)] mb-2">FUND CALCULATOR</div>
                <div className="flex items-stretch gap-2 text-center text-sm">
                  <Box label="Total Contributions" value={peso(f.total)} />
                  <Sym>÷</Sym>
                  <Box label="Total Recipients" value={f.recipients.toString()} />
                  <Sym>=</Sym>
                  <Box label="Per Person" value={peso(per)} highlight={t.color} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Box({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex-1 rounded-md bg-white border border-[var(--color-gold-soft)] p-2" style={highlight ? { borderColor: highlight, color: highlight } : undefined}>
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-brown-soft)]">{label}</div>
      <div className="font-bold mt-1">{value}</div>
    </div>
  );
}
function Sym({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center text-lg font-bold text-[var(--color-brand)]">{children}</div>;
}
