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

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.39a4.61 4.61 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.97-4.33 2.97-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.4l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.03 6.03 0 0 1 6.08 12c0-.67.11-1.32.31-1.92v-2.6H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.52l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.97 2.97 14.7 2 12 2a10 10 0 0 0-8.96 5.48l3.35 2.6C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function entrarComGoogle() {
    setCarregandoGoogle(true);
    setErro("");
    setMensagem("");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : "https://dotowin.vercel.app/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Erro ao entrar com Google:", error);
      setErro("Não foi possível entrar com o Google.");
      setCarregandoGoogle(false);
    }
  }

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

          <button
            type="button"
            onClick={entrarComGoogle}
            disabled={carregandoGoogle || carregando}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#E8EEF5] bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-[#F8FBFE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />

            {carregandoGoogle
              ? "ABRINDO GOOGLE..."
              : "CONTINUAR COM GOOGLE"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />

            <span className="text-[10px] font-black tracking-[0.14em] text-slate-300">
              OU
            </span>

            <div className="h-px flex-1 bg-slate-100" />
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
              disabled={carregando || carregandoGoogle}
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