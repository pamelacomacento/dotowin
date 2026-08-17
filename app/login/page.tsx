"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function enviarFormulario(event: FormEvent) {
    event.preventDefault();

    setCarregando(true);
    setErro("");
    setMensagem("");

    if (!email.trim() || !senha.trim()) {
      setErro("Preencha o e-mail e a senha.");
      setCarregando(false);
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      setCarregando(false);
      return;
    }

    if (modo === "cadastro") {
      if (!nome.trim()) {
        setErro("Digite seu nome.");
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            name: nome.trim(),
          },
        },
      });

      if (error) {
        console.error("Erro no cadastro:", error);
        setErro(error.message);
        setCarregando(false);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setMensagem(
        "Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar."
      );

      setCarregando(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      console.error("Erro no login:", error);
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  function trocarModo() {
    setModo((atual) => (atual === "login" ? "cadastro" : "login"));
    setErro("");
    setMensagem("");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020713] px-5 py-10 text-white">
      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-[430px]">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.8)]" />

            <span className="text-[10px] font-black tracking-[0.25em] text-slate-300">
              DO. MOVE. WIN.
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Do<span className="text-cyan-400">To</span>Win
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Transforme tarefas em movimento.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#071329]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur">
          <div className="mb-6">
            <p className="text-xs font-black tracking-[0.2em] text-violet-400">
              {modo === "login" ? "BEM-VINDO DE VOLTA" : "NOVO JOGADOR"}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {modo === "login"
                ? "Entre no jogo"
                : "Crie sua conta"}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {modo === "login"
                ? "Entre para continuar sua partida."
                : "Sua conta será usada para identificar você nas partidas."}
            </p>
          </div>

          <form onSubmit={enviarFormulario} className="space-y-4">
            {modo === "cadastro" && (
              <div>
                <label className="mb-2 block text-xs font-black text-slate-400">
                  NOME
                </label>

                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Como você quer aparecer no jogo?"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#020b1c] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black text-slate-400">
                E-MAIL
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/[0.08] bg-[#020b1c] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black text-slate-400">
                SENHA
              </label>

              <input
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={
                  modo === "login" ? "current-password" : "new-password"
                }
                className="w-full rounded-xl border border-white/[0.08] bg-[#020b1c] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              />
            </div>

            {erro && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm font-bold text-red-300">
                {erro}
              </div>
            )}

            {mensagem && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm font-bold leading-relaxed text-emerald-300">
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-3.5 text-sm font-black shadow-[0_12px_35px_rgba(59,130,246,.2)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando
                ? "CARREGANDO..."
                : modo === "login"
                  ? "ENTRAR"
                  : "CRIAR CONTA"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center">
            <p className="text-sm text-slate-500">
              {modo === "login"
                ? "Ainda não tem uma conta?"
                : "Já tem uma conta?"}
            </p>

            <button
              type="button"
              onClick={trocarModo}
              className="mt-2 text-sm font-black text-cyan-400 transition hover:text-cyan-300"
            >
              {modo === "login"
                ? "Criar minha conta"
                : "Entrar na minha conta"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}