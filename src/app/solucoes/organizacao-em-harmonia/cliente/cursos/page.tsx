"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/cliente/cursos";

type Course = {
  id: string;
  name: string;
  slug: string;
  objective?: string | null;
  rules?: string | null;
  planned_content?: string | null;
  status: string;
  active: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  planned_content?: string | null;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  agenda_event_id?: string | null;
  status: string;
};

type Person = { id: string; full_name?: string | null; email?: string | null; whatsapp?: string | null };
type TeacherLink = { id: string; lesson_id: string; teacher_person_id: string; teacher?: Person | null };
type Student = {
  id: string;
  course_id: string;
  person_id?: string | null;
  invited_name?: string | null;
  invited_email?: string | null;
  invited_whatsapp?: string | null;
  invitation_status: string;
  invitationUrl: string;
  person?: Person | null;
};
type Attendance = { id: string; lesson_id: string; course_student_id: string; status: string; checkin_method: string; checked_in_at?: string | null };
type AgendaEvent = { id: string; title: string; event_type?: string | null; starts_at?: string | null; ends_at?: string | null; location?: string | null; responsible_person_id?: string | null };
type Conflict = { teacherId: string; source: string; title: string; startsAt: string; endsAt: string };

type Payload = {
  courses?: Course[];
  lessons?: Lesson[];
  teachers?: TeacherLink[];
  students?: Student[];
  attendance?: Attendance[];
  people?: Person[];
  teacherCandidates?: Person[];
  agendaEvents?: AgendaEvent[];
};

function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function studentName(student: Student) {
  return student.person?.full_name || student.invited_name || "Aluno";
}

export default function CursosEmHarmoniaGestaoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseObjective, setCourseObjective] = useState("");
  const [courseRules, setCourseRules] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [courseStatus, setCourseStatus] = useState("planejamento");

  const [lessonId, setLessonId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonStart, setLessonStart] = useState("");
  const [lessonEnd, setLessonEnd] = useState("");
  const [lessonLocation, setLessonLocation] = useState("Tucxa");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [pendingLesson, setPendingLesson] = useState<Record<string, unknown> | null>(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentPersonId, setStudentPersonId] = useState("");
  const [studentNameInput, setStudentNameInput] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentWhatsapp, setStudentWhatsapp] = useState("");
  const [lastInvite, setLastInvite] = useState<{ invitationUrl?: string; whatsappUrl?: string; email?: { sent?: boolean; reason?: string }; needsRegistration?: boolean } | null>(null);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar os cursos.");
    setPayload(next);
    setSelectedCourseId((current) => current || next.courses?.[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) return;
      if (!active) return;
      setToken(accessToken);
      try { await load(accessToken); }
      catch (currentError) { if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [load]);

  const courses = useMemo(() => payload.courses ?? [], [payload.courses]);
  const lessons = useMemo(() => (payload.lessons ?? []).filter((item) => item.course_id === selectedCourseId), [payload.lessons, selectedCourseId]);
  const teachers = useMemo(() => payload.teachers ?? [], [payload.teachers]);
  const students = useMemo(() => (payload.students ?? []).filter((item) => item.course_id === selectedCourseId), [payload.students, selectedCourseId]);
  const teacherCandidates = useMemo(() => payload.teacherCandidates ?? [], [payload.teacherCandidates]);
  const attendance = useMemo(() => payload.attendance ?? [], [payload.attendance]);
  const agendaEvents = useMemo(() => payload.agendaEvents ?? [], [payload.agendaEvents]);

  const studentSuggestions = useMemo(() => {
    const needle = normalize(studentSearch.trim());
    if (needle.length < 2) return [];
    return (payload.people ?? []).filter((person) => normalize([person.full_name, person.email, person.whatsapp].filter(Boolean).join(" ")).includes(needle)).slice(0, 8);
  }, [payload.people, studentSearch]);

  const nearbyAgenda = useMemo(() => {
    const datedEvents = agendaEvents.filter((event) => event.starts_at);

    if (!lessonStart) {
      return [...datedEvents]
        .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
        .slice(0, 8);
    }

    const start = new Date(`${lessonStart}:00-03:00`).getTime();
    return datedEvents
      .map((event) => ({ event, distance: Math.abs(new Date(event.starts_at!).getTime() - start) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map((item) => item.event);
  }, [agendaEvents, lessonStart]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; conflicts?: Conflict[] };
    if (!response.ok) {
      const current = new Error(result.error || "Não foi possível concluir a operação.") as Error & { result?: typeof result; status?: number };
      current.result = result;
      current.status = response.status;
      throw current;
    }
    return result;
  }

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return null;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post(body);
      setSuccess(message);
      await load(token);
      return result;
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao salvar.");
      return null;
    } finally { setSaving(false); }
  }

  function newCourse() {
    setCourseId(""); setCourseName(""); setCourseObjective(""); setCourseRules(""); setCourseContent(""); setCourseStatus("planejamento");
  }

  function editCourse(course: Course) {
    setCourseId(course.id); setCourseName(course.name); setCourseObjective(course.objective || ""); setCourseRules(course.rules || ""); setCourseContent(course.planned_content || ""); setCourseStatus(course.status);
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    const result = await run({ action: "save-course", courseId, name: courseName, objective: courseObjective, rules: courseRules, plannedContent: courseContent, status: courseStatus, active: true }, courseId ? "Curso atualizado." : "Curso criado.");
    const savedId = typeof result?.courseId === "string" ? result.courseId : courseId;
    if (savedId) setSelectedCourseId(savedId);
    if (!courseId && result) newCourse();
  }

  function resetLesson() {
    setLessonId(""); setLessonTitle(""); setLessonContent(""); setLessonStart(""); setLessonEnd(""); setLessonLocation("Tucxa"); setTeacherIds([]); setConflicts([]); setPendingLesson(null);
  }

  function editLesson(lesson: Lesson) {
    setLessonId(lesson.id); setLessonTitle(lesson.title); setLessonContent(lesson.planned_content || ""); setLessonStart(localInput(lesson.starts_at)); setLessonEnd(localInput(lesson.ends_at)); setLessonLocation(lesson.location || "Tucxa");
    setTeacherIds(teachers.filter((item) => item.lesson_id === lesson.id).map((item) => item.teacher_person_id));
    setConflicts([]); setPendingLesson(null);
  }

  async function saveLessonBody(body: Record<string, unknown>) {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await post(body);
      setSuccess("Aula salva e sincronizada com a Agenda Viva.");
      resetLesson();
      await load(token);
    } catch (currentError) {
      const typed = currentError as Error & { result?: { conflicts?: Conflict[] }; status?: number };
      if (typed.status === 409 && typed.result?.conflicts?.length) {
        setConflicts(typed.result.conflicts);
        setPendingLesson(body);
        setError("Conflito de agenda encontrado. Revise os compromissos abaixo; se for uma exceção consciente, use Salvar mesmo assim.");
      } else setError(typed.message || "Erro ao salvar aula.");
    } finally { setSaving(false); }
  }

  async function saveLesson(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourseId) { setError("Crie ou selecione um curso antes de cadastrar a aula."); return; }
    await saveLessonBody({ action: "save-lesson", lessonId, courseId: selectedCourseId, title: lessonTitle, plannedContent: lessonContent, startsAt: lessonStart, endsAt: lessonEnd, location: lessonLocation, teacherIds });
  }

  function chooseStudent(person: Person) {
    setStudentPersonId(person.id); setStudentNameInput(person.full_name || ""); setStudentEmail(person.email || ""); setStudentWhatsapp(person.whatsapp || ""); setStudentSearch(person.full_name || "");
  }

  async function inviteStudent(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourseId) { setError("Selecione o curso."); return; }
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess(""); setLastInvite(null);
    try {
      const result = await post({ action: "invite-student", courseId: selectedCourseId, personId: studentPersonId, name: studentNameInput, email: studentEmail, whatsapp: studentWhatsapp });
      setLastInvite({
        invitationUrl: typeof result.invitationUrl === "string" ? result.invitationUrl : undefined,
        whatsappUrl: typeof result.whatsappUrl === "string" ? result.whatsappUrl : undefined,
        needsRegistration: result.needsRegistration === true,
        email: result.email && typeof result.email === "object" ? (result.email as { sent?: boolean; reason?: string }) : undefined,
      });
      setSuccess(result.needsRegistration === true ? "Convite criado. O aluno deverá fazer o cadastro antes de confirmar." : "Convite criado para aluno já localizado na Base Única.");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao convidar aluno."); }
    finally { setSaving(false); }
  }

  return (
    <OrganizacaoClientShell
      title="Cursos em Harmonia"
      description="Sala de aula conectada à Base Única e à Agenda Viva: professores, alunos, datas, conflitos, convites e presença em um mesmo fluxo, sem criar um cadastro paralelo."
    >
      <section className="rounded-[2rem] bg-[#00334E] p-5 text-white shadow sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#BDEFD1]">Diferencial do processo</p>
        <h2 className="mt-2 text-2xl font-black">O curso não é uma planilha isolada.</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#E8FFF0]">Cada aula entra na Agenda Viva; Professor vem da Base Única; o sistema alerta conflitos; o aluno já cadastrado é reaproveitado; e a presença pode ser chamada pelo Professor ou validada pelo próprio aluno com convite + código temporário + horário da aula.</p>
      </section>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
      {success && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">{success}</p>}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-black text-[#00334E]">Cursos</h2><button type="button" onClick={newCourse} className="rounded-xl bg-[#E8F6ED] px-3 py-2 text-xs font-black text-[#2F6B43]">Novo curso</button></div>
          <div className="mt-3 grid gap-2">
            {loading && <p className="text-sm font-semibold text-slate-500">Carregando...</p>}
            {courses.map((course) => (
              <div key={course.id} className={`rounded-2xl p-3 ring-1 ${selectedCourseId === course.id ? "bg-[#F4FBF7] ring-[#2F6B43]/30" : "bg-white ring-slate-200"}`}>
                <button type="button" onClick={() => setSelectedCourseId(course.id)} className="w-full text-left"><p className="font-black text-[#00334E]">{course.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{course.status.replaceAll("_", " ")} • {(payload.lessons ?? []).filter((item) => item.course_id === course.id).length} aula(s)</p></button>
                <button type="button" onClick={() => editCourse(course)} className="mt-2 text-xs font-black text-[#2F6B43]">Editar cadastro</button>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={saveCourse} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Cadastro pedagógico</p>
          <h2 className="mt-1 text-xl font-black text-[#00334E]">{courseId ? "Editar curso" : "Novo curso"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Nome<input value={courseName} onChange={(event) => setCourseName(event.target.value)} required minLength={3} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E]">Situação<select value={courseStatus} onChange={(event) => setCourseStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold"><option value="planejamento">Planejamento</option><option value="inscricoes">Inscrições</option><option value="em_andamento">Em andamento</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Objetivo<textarea value={courseObjective} onChange={(event) => setCourseObjective(event.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Regras<textarea value={courseRules} onChange={(event) => setCourseRules(event.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" placeholder="Pré-requisitos, frequência mínima, critérios do curso..." /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Conteúdo previsto<textarea value={courseContent} onChange={(event) => setCourseContent(event.target.value)} rows={4} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
          </div>
          <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">{courseId ? "Salvar alterações" : "Criar curso"}</button>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={saveLesson} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Agenda integrada</p><h2 className="mt-1 text-xl font-black text-[#00334E]">{lessonId ? "Editar aula" : "Nova aula"}</h2></div>{lessonId && <button type="button" onClick={resetLesson} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Cancelar edição</button>}</div>
          {!selectedCourseId && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Selecione um curso.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Aula<input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} required className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" placeholder="Ex.: Aula 1 — Fundamentos" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E]">Início<input type="datetime-local" value={lessonStart} onChange={(event) => setLessonStart(event.target.value)} required className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E]">Término<input type="datetime-local" value={lessonEnd} onChange={(event) => setLessonEnd(event.target.value)} required className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Local<input value={lessonLocation} onChange={(event) => setLessonLocation(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
            <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">Conteúdo da aula<textarea value={lessonContent} onChange={(event) => setLessonContent(event.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" /></label>
          </div>
          <div className="mt-3">
            <p className="text-sm font-black text-[#00334E]">Professores</p>
            {teacherCandidates.length === 0 ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Nenhum Filho da Corrente possui a função Professor. Inclua a função na Base Única antes de montar a aula.</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{teacherCandidates.map((person) => <label key={person.id} className="flex items-center gap-2 rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold ring-1 ring-[#2F6B43]/10"><input type="checkbox" checked={teacherIds.includes(person.id)} onChange={(event) => setTeacherIds((current) => event.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} />{person.full_name || "Professor"}</label>)}</div>}
          </div>

          {conflicts.length > 0 && <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200"><p className="font-black">Conflitos encontrados</p>{conflicts.map((item, index) => <p key={`${item.teacherId}-${index}`} className="mt-1 text-sm font-semibold">• {item.title} — {formatDate(item.startsAt)} a {formatDate(item.endsAt)} ({item.source})</p>)}{pendingLesson && <button type="button" disabled={saving} onClick={() => void saveLessonBody({ ...pendingLesson, force: true })} className="mt-3 rounded-xl bg-amber-900 px-4 py-2 text-sm font-black text-white">Salvar mesmo assim</button>}</div>}

          <button disabled={saving || !selectedCourseId} className="mt-4 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50">Salvar aula e incluir na Agenda Viva</button>
        </form>

        <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Calendário do Tucxa</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Compromissos próximos da data escolhida</h2><p className="mt-1 text-sm leading-6 text-slate-600">A lista reúne eventos da Agenda Viva independentemente da origem, ajudando a escolher datas sem olhar calendários separados.</p>
          <div className="mt-3 grid gap-2">{nearbyAgenda.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum evento encontrado.</p>}{nearbyAgenda.map((event) => <article key={event.id} className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#2F6B43]/10"><p className="font-black text-[#00334E]">{event.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(event.starts_at)}{event.ends_at ? ` → ${formatDate(event.ends_at)}` : ""}{event.location ? ` • ${event.location}` : ""}</p></article>)}</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Aulas previstas</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Cronograma do curso selecionado</h2></div><span className="rounded-full bg-[#F4FBF7] px-3 py-2 text-xs font-black text-[#2F6B43]">{lessons.length} aula(s)</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{lessons.map((lesson) => <article key={lesson.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#2F6B43]/10"><p className="font-black text-[#00334E]">{lesson.title}</p><p className="mt-1 text-sm font-semibold text-slate-600">{formatDate(lesson.starts_at)} → {formatDate(lesson.ends_at)}</p><p className="mt-1 text-xs font-semibold text-slate-500">Professor(es): {teachers.filter((item) => item.lesson_id === lesson.id).map((item) => item.teacher?.full_name || "Professor").join(", ") || "—"}</p><button type="button" onClick={() => editLesson(lesson)} className="mt-2 text-xs font-black text-[#2F6B43]">Editar aula</button></article>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={inviteStudent} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Alunos</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Localizar e convidar</h2><p className="mt-1 text-sm leading-6 text-slate-600">Pesquise primeiro na Base Única por nome, telefone ou e-mail. Se não encontrar, informe os dados disponíveis: o convite orientará o cadastro antes da confirmação.</p>
          <label className="mt-3 grid gap-1 text-sm font-black text-[#00334E]">Pesquisar na Base Única<input value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setStudentPersonId(""); }} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold" placeholder="Nome, WhatsApp ou e-mail" /></label>
          {studentSuggestions.length > 0 && <div className="mt-2 grid gap-1">{studentSuggestions.map((person) => <button type="button" key={person.id} onClick={() => chooseStudent(person)} className="rounded-xl bg-[#F7FAF2] p-3 text-left text-sm ring-1 ring-[#2F6B43]/10"><strong className="text-[#00334E]">{person.full_name}</strong><span className="mt-1 block text-xs text-slate-500">{[person.whatsapp, person.email].filter(Boolean).join(" • ")}</span></button>)}</div>}
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-black text-[#00334E] sm:col-span-2">Nome<input value={studentNameInput} onChange={(event) => setStudentNameInput(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-black text-[#00334E]">WhatsApp<input value={studentWhatsapp} onChange={(event) => setStudentWhatsapp(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-black text-[#00334E]">E-mail<input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label></div>
          <button disabled={saving || !selectedCourseId} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Gerar e enviar convite</button>
          {lastInvite && <div className="mt-3 rounded-xl bg-[#F4FBF7] p-3 text-sm font-semibold text-slate-700 ring-1 ring-[#2F6B43]/10"><p>{lastInvite.needsRegistration ? "Cadastro não localizado: o convite orienta o aluno a se cadastrar." : "Aluno localizado na Base Única."}</p>{lastInvite.invitationUrl && <a href={lastInvite.invitationUrl} target="_blank" rel="noreferrer" className="mt-2 block font-black text-[#2F6B43] underline">Abrir convite</a>}{lastInvite.whatsappUrl && <a href={lastInvite.whatsappUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg bg-[#2F6B43] px-3 py-2 text-center font-black text-white">Enviar pelo WhatsApp</a>}{lastInvite.email && <p className="mt-2 text-xs">E-mail: {lastInvite.email.sent ? "enviado" : lastInvite.email.reason || "não enviado"}</p>}</div>}
        </form>

        <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">Turma</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Alunos convidados</h2><div className="mt-3 grid gap-2">{students.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum aluno convidado neste curso.</p>}{students.map((student) => { const presences = attendance.filter((item) => item.course_student_id === student.id && item.status === "presente").length; return <article key={student.id} className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#2F6B43]/10"><div className="flex flex-wrap justify-between gap-2"><strong className="text-[#00334E]">{studentName(student)}</strong><span className="text-xs font-black text-[#2F6B43]">{student.invitation_status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{[student.person?.whatsapp || student.invited_whatsapp, student.person?.email || student.invited_email].filter(Boolean).join(" • ") || "Contato não informado"}</p><p className="mt-1 text-xs font-semibold text-slate-500">Presenças registradas: {presences}</p><a href={student.invitationUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-[#2F6B43] underline">Abrir convite</a></article>; })}</div></div>
      </section>
    </OrganizacaoClientShell>
  );
}
