import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { Nav } from "@/components/spartans/Nav";
import { Home } from "@/components/spartans/Home";
import { About } from "@/components/spartans/About";
import { Auth } from "@/components/spartans/Auth";
import { MemberProfile, MemberCode, MemberRecords } from "@/components/spartans/MemberDashboard";
import { AdminProfile, AdminCodeGen, AdminUpdateImages, AdminReports } from "@/components/spartans/AdminDashboard";
import type { View } from "@/components/spartans/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spartans Community — Mutual Aid Brotherhood" },
      { name: "description", content: "Spartans Community is a mutual aid brotherhood managing four shared funds: birthday gifts, medical, calamity, and maternity assistance." },
      { property: "og:title", content: "Spartans Community" },
      { property: "og:description", content: "Mutual Aid · Brotherhood · Solidarity" },
    ],
  }),
  component: App,
});

function App() {
  const [view, setView] = useState<View>("home");
  const auth = useAuth();

  function go(v: View) {
    // Block dashboard views if not authenticated / wrong role
    if ((v.startsWith("admin-") && auth.role !== "admin") ||
        (v.startsWith("member-") && auth.role !== "member")) {
      setView("login");
      return;
    }
    setView(v);
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <Nav view={view} go={go} role={auth.role} profile={auth.profile} />
      {view === "home" && <Home />}
      {view === "about" && <About />}
      {view === "login" && <Auth initial="login" go={go} onAuth={auth.refresh} />}
      {view === "register" && <Auth initial="member" go={go} onAuth={auth.refresh} />}
      {view === "register-admin" && <Auth initial="admin" go={go} onAuth={auth.refresh} />}
      {view === "member-profile" && auth.role === "member" && <MemberProfile auth={auth} />}
      {view === "member-code" && auth.role === "member" && <MemberCode auth={auth} />}
      {view === "member-records" && auth.role === "member" && <MemberRecords auth={auth} />}
      {view === "admin-profile" && auth.role === "admin" && <AdminProfile auth={auth} />}
      {view === "admin-codegen" && auth.role === "admin" && <AdminCodeGen />}
      {view === "admin-update" && auth.role === "admin" && <AdminUpdateImages />}
      {view === "admin-report" && auth.role === "admin" && <AdminReports />}
    </div>
  );
}
