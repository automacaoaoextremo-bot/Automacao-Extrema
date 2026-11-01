"use client";

import { useEffect, useState } from "react";
import { StudyAgentKnowledgeMap } from "@/components/education/studyagent-knowledge-map";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCESS = "/solucoes/studyagent/residencia-ia/acesso";

type LearnerProfile = {
  full_name: string | null;
  phone: string | null;
};

export function StudyAgentStudentArea() {
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!active) return;
      if (!data.user) {
        window.location.replace(ACCESS);
        return;
      }

      const { data: profile } = await supabaseBrowser
        .from("ae_study_learners")
        .select("full_name, phone")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!active) return;
      setUserId(data.user.id);
      const learnerProfile = profile as LearnerProfile | null;
      setDisplayName(learnerProfile?.full_name?.trim() || data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Estudante");
      setLoading(false);
    }

    load();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace(ACCESS);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = ACCESS;
  }

  if (loading) {
    return (
      <main className="min-h-[55vh] bg-[#f4fbfd] px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-bold text-[#00334E]">Carregando seu espaço de estudos...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="inicio" className="min-h-screen bg-[#f4fbfd] px-3 py-4 text-slate-900 sm:px-5 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <section className="mb-4 flex flex-col gap-3 rounded-3xl bg-[#00334E] p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#31C16B]">Meu StudyAgent</p>
            <h1 className="mt-1 text-2xl font-black">Olá, {displayName}.</h1>
            <p className="mt-1 text-sm text-white/70">Seu progresso e sua base pessoal ficam associados a este acesso.</p>
          </div>
          <button type="button" onClick={signOut} className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">Sair</button>
        </section>

        <StudyAgentKnowledgeMap userId={userId} displayName={displayName} />
      </div>
    </main>
  );
}
