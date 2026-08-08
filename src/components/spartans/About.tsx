import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function About() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("page_images").select("type, url").in("type", ["who", "contact"]);
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      const { data: signed } = await supabase.storage.from("page-images").createSignedUrl(row.url, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) map[row.type] = signed.signedUrl;
    }
    setImages(map);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("about-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "page_images" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <main className="max-w-[900px] mx-auto px-4 py-7">
      <h1 className="font-serif text-3xl font-bold text-[var(--color-brand)] text-center">About Us</h1>
      <div className="mx-auto mt-2 h-[3px] w-[60px] bg-[var(--color-gold)] rounded-full mb-6" />
      <div className="grid md:grid-cols-2 gap-5">
        <Section title="Who We Are" emoji="🛡" borderColor="var(--color-gold)" img={images.who} onOpen={setPreview} />
        <Section title="Contact Us" emoji="📞" borderColor="var(--color-brown-soft)" img={images.contact} onOpen={setPreview} />
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={preview} alt="Preview" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </main>
  );
}

function Section({ title, emoji, borderColor, img, onOpen }: { title: string; emoji: string; borderColor: string; img?: string; onOpen: (u: string) => void }) {
  return (
    <section className="card-spartan p-6 border-t-4" style={{ borderTopColor: borderColor }}>
      <div className="text-4xl">{emoji}</div>
      <h2 className="font-serif font-bold mt-2 text-xl">{title}</h2>
      <div className="mt-3 rounded-[10px] overflow-hidden bg-[var(--color-warm)] h-[220px] flex items-center justify-center text-center text-sm text-[var(--color-brown-soft)] border border-dashed border-[var(--color-gold-soft)]">
        {img ? (
          <img
            src={img}
            alt={title}
            onClick={() => onOpen(img)}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        ) : (
          <span>Image will appear here after admin uploads</span>
        )}
      </div>
    </section>
  );
}
