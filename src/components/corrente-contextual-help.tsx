import Link from "next/link";

type CorrenteContextualHelpProps = {
  title: string;
  children: React.ReactNode;
  href?: string;
  actionLabel?: string;
  tone?: "green" | "blue" | "white";
};

const toneClass = {
  green: "bg-emerald-50 text-emerald-950 ring-emerald-100",
  blue: "bg-sky-50 text-sky-950 ring-sky-100",
  white: "bg-white text-slate-700 ring-slate-100",
};

export function CorrenteContextualHelp({
  title,
  children,
  href,
  actionLabel = "Ver primeiros passos",
  tone = "green",
}: CorrenteContextualHelpProps) {
  return (
    <aside className={`rounded-[1.5rem] p-4 shadow-sm ring-1 ${toneClass[tone]}`}>
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Ajuda rápida</p>
      <h2 className="mt-2 text-xl font-black text-[#00334E]">{title}</h2>
      <div className="mt-2 text-sm leading-6">{children}</div>
      {href && (
        <Link
          href={href}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-[#00334E] px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#064766]"
        >
          {actionLabel}
        </Link>
      )}
    </aside>
  );
}
