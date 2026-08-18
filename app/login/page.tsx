"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function Logo() {
  return (
    <img
      src="/dotowin-logo.png"
      alt="DoToWin"
      className="mx-auto h-[82px] w-auto max-w-[280px] object-contain mix-blend-multiply sm:h-[92px] sm:max-w-[320px]"
    />
  );
}

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F8FC] px-4 py-8 text-[#1F2937] sm:px-6">
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#DFF7FA] blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-[#EAE2FF] blur-3xl" />

      <div className="relative z-10 w-full max-w-[460px]">
        <header className="mb-7 text-center">
          <Logo />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Transforme tarefas em movimento.
          </p>
        </header>

        <section className="rounded-[30px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-7">
          <div className="mb-6">
            <p
              className={`text-[10px] font-black tracking-[0.22em] ${
                modo === "login"
                  ? "text-[#22C7D9]"
                  : "text-[#8B5CF6]"
              }`}
            >
              {modo === "login" ? "BEM-VINDO DE VOLTA" : "NOVO JOGADOR"}
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
              {modo === "login"
                ? "Entre no jogo"
                : "Crie sua conta"}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {modo === "login"
                ? "Entre para continuar suas partidas."
                : "Sua conta identifica você nas partidas e mantém seu progresso."}
            </p>
          </div>

          <form onSubmit={enviarFormulario} className="space-y-4">
            {modo === "cadastro" && (
              <div>
                <label className="mb-2 block text-[10px] font-black tracking-[0.16em] text-slate-400">
                  NOME
                </label>

                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Como você quer aparecer no jogo?"
                  autoComplete="name"
                  className="w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 text-sm font-bold text-[#1F2937] outline-none transition placeholder:text-slate-300 focus:border-[#8B5CF6]"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-[10px] font-black tracking-[0.16em] text-slate-400">
                E-MAIL
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                className="w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 text-sm font-bold text-[#1F2937] outline-none transition placeholder:text-slate-300 focus:border-[#22C7D9]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black tracking-[0.16em] text-slate-400">
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
                className="w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 text-sm font-bold text-[#1F2937] outline-none transition placeholder:text-slate-300 focus:border-[#22C7D9]"
              />
            </div>

            {erro && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {erro}
              </div>
            )}

            {mensagem && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold leading-relaxed text-green-700">
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className={`w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(15,23,42,.1)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                modo === "login"
                  ? "bg-[#22C7D9]"
                  : "bg-[#8B5CF6]"
              }`}
            >
              {carregando
                ? "CARREGANDO..."
                : modo === "login"
                  ? "ENTRAR"
                  : "CRIAR CONTA"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-400">
              {modo === "login"
                ? "Ainda não tem uma conta?"
                : "Já tem uma conta?"}
            </p>

            <button
              type="button"
              onClick={trocarModo}
              className={`mt-2 text-sm font-black transition ${
                modo === "login"
                  ? "text-[#8B5CF6] hover:text-[#7445e8]"
                  : "text-[#22C7D9] hover:text-[#1594A3]"
              }`}
            >
              {modo === "login"
                ? "Criar minha conta"
                : "Entrar na minha conta"}
            </button>
          </div>
        </section>

        <p className="mt-5 text-center text-[10px] font-bold tracking-[0.16em] text-slate-300">
          DO. MOVE. WIN.
        </p>
      </div>
    </main>
  );
}