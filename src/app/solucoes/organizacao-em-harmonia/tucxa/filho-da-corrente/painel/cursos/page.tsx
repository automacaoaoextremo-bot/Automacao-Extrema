"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const API = "/api/organizacao-em-harmonia/filhos-corrente/cursos";

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: PANEL_BASE },
  {
    label: "Gerenciar",
    href: "/solucoes/organizacao-em-harmonia/cliente/cursos",
    variant: "primary",
  },
  filhoSignOutAction,
  filhoSupportAction,
];

type Course = { id: string; name: string; objective?: string | null; rules?: string | null; status: string };
type Lesson = { id: string; course_id: string; title: string; planned_content?: string | null; starts_at: string; ends_at: string; location?: string | null; checkin_code_generated_at?: string | null; status: string };
type Student = { id: string; course_id: string; invited_name?: string | null; invitation_status: string; person?: { full_name?: string | null } | null };
type Attendance = { id: string; lesson_id: string; course_student_id: string; status: string; checkin_method: string; checked_in_at?: string | null; notes?: string | null };
type Payload = { currentPerson?: { fullName?: string }; courses?: Course[]; lessons?: Lesson[]; students?: Student[]; attendance?: Attendance[] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function studentName(student: Student) {
  return student.person?.full_name || student.invited_name || "Aluno";
}

export default function SalaProfessorPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [currentCode, setCurrentCode] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar sua sala de aula.");
    setPayload(next);
    setSelectedLessonId((current) => current || next.lessons?.[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) {
        window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
        return;
      }
      if (!active) return;
      setToken(accessToken);
      try { await load(accessToken); }
      catch (currentError) { if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [load]);

  const courses = useMemo(() => payload.courses ?? [], [payload.courses]);
  const lessons = useMemo(() => payload.lessons ?? [], [payload.lessons]);
  const students = useMemo(() => payload.students ?? [], [payload.students]);
  const attendance = useMemo(() => payload.attendance ?? [], [payload.attendance]);
  const selectedLesson = useMemo(() => lessons.find((item) => item.id === selectedLessonId) ?? null, [lessons, selectedLessonId]);
  const selectedCourse = useMemo(() => courses.find((item) => item.id === selectedLesson?.course_id) ?? null, [courses, selectedLesson?.course_id]);
  const selectedStudents = useMemo(() => students.filter((item) => item.course_id === selectedLesson?.course_id && item.invitation_status === "aceito"), [students, selectedLesson?.course_id]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string; message?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  }

  async function generateCode() {
    if (!selectedLesson || saving) return;
    setSaving(true); setError(""); setSuccess(""); setCurrentCode("");
    try {
      const result = await post({ action: "generate-checkin-code", lessonId: selectedLesson.id });
      setCurrentCode(result.code || "");
      setSuccess(result.message || "Código gerado.");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao gerar código."); }
    finally { setSaving(false); }
  }

  async function setAttendance(courseStudentId: string, status: "presente" | "ausente" | "justificada") {
    if (!selectedLesson || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await post({ action: "set-attendance", lessonId: selectedLesson.id, courseStudentId, status });
      setSuccess("Chamada atualizada.");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao registrar presença."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader actions={headerActions} mobileActionColumns={4} />
      <section className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <header className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Cursos em Harmonia • Professor</p>
          <h1 className="mt-2 text-3xl font-black">Sala de aula</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base">Veja suas aulas, a turma e faça a chamada. Para auto-presença, gere um código de 6 dígitos somente durante a aula: o aluno precisa do convite correto, do código e estar dentro da janela de horário validada pelo servidor.</p>
        </header>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
        {success && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">{success}</p>}

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Minhas aulas</p>
            {loading ? <p className="mt-3 text-sm font-semibold text-slate-500">Carregando...</p> : lessons.length === 0 ? <p className="mt-3 rounded-xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">Nenhuma aula está atribuída a você. Confirme com a Coordenação se a função Professor e o cronograma já foram cadastrados.</p> : <div className="mt-3 grid gap-2">{lessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => { setSelectedLessonId(lesson.id); setCurrentCode(""); }} className={`rounded-2xl p-3 text-left ring-1 ${selectedLessonId === lesson.id ? "bg-[#E9F2E7] ring-[#123D2C]/30" : "bg-white ring-slate-200"}`}><p className="font-black text-[#123D2C]">{lesson.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(lesson.starts_at)}</p></button>)}</div>}
          </div>

          <div className="rounded-3xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
            {!selectedLesson ? <p className="text-sm font-semibold text-slate-500">Selecione uma aula.</p> : <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">{selectedCourse?.name || "Curso"}</p><h2 className="mt-1 text-2xl font-black text-[#123D2C]">{selectedLesson.title}</h2><p className="mt-2 text-sm font-semibold text-slate-600">{formatDate(selectedLesson.starts_at)} → {formatDate(selectedLesson.ends_at)}</p><p className="mt-1 text-sm font-semibold text-slate-600">Local: {selectedLesson.location || "Tucxa"}</p>{selectedLesson.planned_content && <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-sm leading-6 text-slate-700">{selectedLesson.planned_content}</p>}

              <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-[#123D2C]">Auto-presença do aluno</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Gere um novo código quando a turma estiver reunida. O código anterior deixa de valer.</p></div><button type="button" disabled={saving} onClick={() => void generateCode()} className="rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Gerar código</button></div>{currentCode && <div className="mt-3 rounded-2xl bg-white p-4 text-center ring-1 ring-[#123D2C]/10"><p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Código desta aula</p><p className="mt-1 text-4xl font-black tracking-[0.25em] text-[#123D2C]">{currentCode}</p><p className="mt-2 text-xs font-semibold text-slate-500">Mostre somente aos alunos presentes.</p></div>}</div>
            </div>}
          </div>
        </section>

        {selectedLesson && <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Chamada</p><h2 className="mt-1 text-xl font-black text-[#123D2C]">Alunos que aceitaram o curso</h2></div><span className="rounded-full bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C]">{selectedStudents.length} aluno(s)</span></div><div className="mt-3 grid gap-2">{selectedStudents.length === 0 && <p className="rounded-xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">Nenhum aluno aceitou o convite ainda.</p>}{selectedStudents.map((student) => { const row = attendance.find((item) => item.lesson_id === selectedLesson.id && item.course_student_id === student.id); return <article key={student.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#123D2C]">{studentName(student)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{row ? `${row.status} • ${row.checkin_method === "aluno" ? "registrada pelo aluno" : "chamada do professor"}` : "Ainda sem registro nesta aula"}</p></div><div className="grid grid-cols-3 gap-1 sm:w-auto"><button type="button" disabled={saving} onClick={() => void setAttendance(student.id, "presente")} className="rounded-lg bg-[#123D2C] px-2 py-2 text-xs font-black text-white disabled:opacity-50">Presente</button><button type="button" disabled={saving} onClick={() => void setAttendance(student.id, "ausente")} className="rounded-lg bg-red-100 px-2 py-2 text-xs font-black text-red-700 disabled:opacity-50">Ausente</button><button type="button" disabled={saving} onClick={() => void setAttendance(student.id, "justificada")} className="rounded-lg bg-amber-100 px-2 py-2 text-xs font-black text-amber-900 disabled:opacity-50">Justificada</button></div></div></article>; })}</div></section>}
      </section>
    </main>
  );
}
