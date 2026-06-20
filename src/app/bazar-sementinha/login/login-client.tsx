"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("bazardosementinha@gmail.com");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("");
    const res = await fetch("/api/bazar-sementinha/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Não foi possível entrar.");
      return;
    }

    if (data.sessionToken) {
      window.localStorage.setItem("bazar_sementinha_session", data.sessionToken);
    }

    router.push("/bazar-sementinha/gestao");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-10 text-[#214527]">
      <section className="mx-auto max-w-md rounded-3xl border border-[#dfe8df] bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Acesso cliente</p>
        <h1 className="mt-2 text-3xl font-black">Gestão do Bazar</h1>
        <label className="mt-6 block">
          <span className="text-sm font-bold">E-mail</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-bold">Senha</span>
          <div className="mt-1 flex rounded-2xl border border-[#dfe8df] bg-white">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 rounded-2xl px-4 py-3 outline-none" />
            <button type="button" onClick={() => setShow((v) => !v)} className="px-4 text-sm font-black text-[#2f7d45]">{show ? "Ocultar" : "Mostrar"}</button>
          </div>
        </label>
        <button onClick={login} className="mt-5 w-full rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white">Entrar</button>
        <button type="button" onClick={() => setMessage("Para recuperar a senha, fale com a Automação Extrema. Nesta primeira versão o envio automático ainda não está ativo.")} className="mt-3 w-full text-sm font-black text-[#2f7d45]">Esqueci minha senha</button>
        {message && <p className="mt-4 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold">{message}</p>}
      </section>
    </main>
  );
}
