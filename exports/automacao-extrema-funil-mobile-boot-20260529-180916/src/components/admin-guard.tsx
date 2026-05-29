"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { SiteHeader } from "@/components/site-header";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setLoading(false);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <SiteHeader logged />
        <main className="min-h-screen bg-slate-100 p-6">
          <section className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow">
            <p className="text-slate-600">Validando sessão...</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader logged />
      {children}
    </>
  );
}
