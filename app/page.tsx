"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Partida = {
  id: number;
  nome: string;
  codigo: string;
  status: string;
  totalCasas: number;
  posicao: number;
  cor: string;
};

export default function HomeLobby() {
  const router = useRouter();

  const [nomeUsuario, setNomeUsuario] = useState("Jogador");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    carregarHome();
  }, []);

  async function carregarHome() {
    setCarregando(true);
    setMensagemErro("");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.push("/login");
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    setNomeUsuario(perfil?.name || "Jogador");

    const {
      data: participacoes,
      error: erroParticipacoes,
    } = await supabase
      .from("players")
      .select("game_id, position, color")
      .eq("profile_id", user.id);

    if (erroParticipacoes) {
      console.error(erroParticipacoes);

      setMensagemErro(
        "Não foi possível carregar suas partidas."
      );

      setCarregando(false);
      return;
    }

    if (
      !participacoes ||
      participacoes.length === 0
    ) {
      setPartidas([]);
      setCarregando(false);
      return;
    }

    const idsPartidas = participacoes
      .map((item) => item.game_id)
      .filter(
        (id): id is number =>
          id !== null
      );

    if (idsPartidas.length === 0) {
      setPartidas([]);
      setCarregando(false);
      return;
    }

    const {
      data: jogos,
      error: erroJogos,
    } = await supabase
      .from("games")
      .select(
        "id, name, code, status, total_spaces"
      )
      .in("id", idsPartidas);

    if (erroJogos) {
      console.error(erroJogos);

      setMensagemErro(
        "Não foi possível carregar os dados das partidas."
      );

      setCarregando(false);
      return;
    }

    const lista: Partida[] =
      (jogos || []).map((jogo) => {
        const participacao =
          participacoes.find(
            (item) =>
              item.game_id ===
              jogo.id
          );

        return {
          id: jogo.id,
          nome: jogo.name,
          codigo: jogo.code,
          status: jogo.status,
          totalCasas:
            jogo.total_spaces ||
            60,
          posicao:
            participacao?.position ??
            0,
          cor:
            participacao?.color ||
            "#3B82F6",
        };
      });

    setPartidas(lista);
    setCarregando(false);
  }

  const partidaSelecionada =
    useMemo(() => {
      const idSalvo =
        typeof window !==
        "undefined"
          ? Number(
              localStorage.getItem(
                "dotowin_game_id"
              )
            )
          : null;

      if (idSalvo) {
        const encontrada =
          partidas.find(
            (partida) =>
              partida.id ===
              idSalvo
          );

        if (encontrada) {
          return encontrada;
        }
      }

      return partidas[0] || null;
    }, [partidas]);

  function abrirPartida(
    partidaId: number
  ) {
    localStorage.setItem(
      "dotowin_game_id",
      String(partidaId)
    );

    router.push("/jogo");
  }

  async function sair() {
    await supabase.auth.signOut();

    localStorage.removeItem(
      "dotowin_game_id"
    );

    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#1F2937]">
      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <img
            src="/dotowin-logo.png"
            alt="DoToWin"
            className="h-[64px] w-auto max-w-[240px] object-contain mix-blend-multiply sm:h-[72px] sm:max-w-[270px]"
          />

          <button
            onClick={sair}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-800"
          >
            SAIR
          </button>
        </header>

        {mensagemErro && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        <section className="mb-8">
          <p className="text-xs font-black tracking-[0.22em] text-[#22C7D9]">
            OLÁ,{" "}
            {nomeUsuario.toUpperCase()}
          </p>

          <h1 className="mt-2 max-w-2xl text-4xl font-black tracking-[-0.04em] text-[#1F2937] sm:text-5xl">
            Qual é o próximo movimento?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            Continue uma corrida, entre em uma nova partida ou crie seu próprio desafio.
          </p>
        </section>

        {carregando ? (
          <div className="rounded-[32px] bg-white p-10 text-center shadow-[0_12px_40px_rgba(15,23,42,.06)]">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

            <p className="mt-4 text-sm font-bold text-slate-400">
              Preparando seu lobby...
            </p>
          </div>
        ) : (
          <>
            {partidaSelecionada && (
              <section className="mb-6 overflow-hidden rounded-[34px] bg-[#22C7D9] p-6 text-white shadow-[0_18px_50px_rgba(34,199,217,.18)] sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.22em] text-white/70">
                      CONTINUAR JOGANDO
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
                      {
                        partidaSelecionada.nome
                      }
                    </h2>

                    <p className="mt-2 text-sm font-bold text-white/80">
                      Código{" "}
                      {
                        partidaSelecionada.codigo
                      }
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="rounded-2xl bg-white/15 px-4 py-3">
                        <p className="text-[9px] font-black tracking-wider text-white/70">
                          SUA POSIÇÃO
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {
                            partidaSelecionada.posicao
                          }

                          <span className="text-sm text-white/70">
                            {" "}
                            /{" "}
                            {
                              partidaSelecionada.totalCasas
                            }
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/15 px-4 py-3">
                        <p className="text-[9px] font-black tracking-wider text-white/70">
                          LINHA DE CHEGADA
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {
                            partidaSelecionada.totalCasas
                          }{" "}
                          casas
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        abrirPartida(
                          partidaSelecionada.id
                        )
                      }
                      className="mt-6 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#1594A3] shadow-[0_8px_20px_rgba(0,0,0,.08)] transition hover:-translate-y-0.5"
                    >
                      CONTINUAR CORRIDA →
                    </button>
                  </div>

                  <div className="relative min-h-[180px]">
                    <div className="absolute right-2 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/15" />

                    <div className="absolute right-14 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/15" />

                    <div
                      className="absolute right-[66px] top-1/2 flex h-20 w-20 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white text-2xl font-black"
                      style={{
                        color:
                          partidaSelecionada.cor,
                        boxShadow:
                          "0 10px 25px rgba(0,0,0,.08)",
                      }}
                    >
                      {
                        partidaSelecionada.posicao
                      }
                    </div>

                    <div
                      className="absolute right-[93px] top-[22px] h-8 w-8 rounded-full border-4 border-white"
                      style={{
                        backgroundColor:
                          partidaSelecionada.cor,
                      }}
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <Link
                href="/partidas"
                className="group rounded-[30px] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] transition hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF8FB] text-2xl text-[#22C7D9]">
                  +
                </div>

                <p className="mt-5 text-[10px] font-black tracking-[0.2em] text-[#22C7D9]">
                  NOVA CORRIDA
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Criar partida
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Defina o tamanho da trilha, monte as tarefas e convide quem vai jogar.
                </p>

                <p className="mt-5 text-sm font-black text-[#22C7D9] transition group-hover:translate-x-1">
                  Criar →
                </p>
              </Link>

              <Link
                href="/partidas"
                className="group rounded-[30px] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] transition hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2ECFF] text-xl font-black text-[#8B5CF6]">
                  #
                </div>

                <p className="mt-5 text-[10px] font-black tracking-[0.2em] text-[#8B5CF6]">
                  TEM UM CÓDIGO?
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Entrar em uma partida
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Use o código de quem criou a corrida e entre no jogo.
                </p>

                <p className="mt-5 text-sm font-black text-[#8B5CF6] transition group-hover:translate-x-1">
                  Entrar →
                </p>
              </Link>

              <Link
                href="/partidas"
                className="group rounded-[30px] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] transition hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEFCE7] text-xl text-[#58CC02]">
                  ★
                </div>

                <p className="mt-5 text-[10px] font-black tracking-[0.2em] text-[#58CC02]">
                  SUAS CORRIDAS
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Minhas partidas
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Veja todas as partidas em que você já está jogando.
                </p>

                <p className="mt-5 text-sm font-black text-[#58CC02] transition group-hover:translate-x-1">
                  Ver partidas →
                </p>
              </Link>
            </section>

            {partidas.length === 0 && (
              <section className="mt-6 rounded-[32px] bg-white p-8 text-center shadow-[0_12px_35px_rgba(15,23,42,.05)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7D6] text-2xl">
                  🎯
                </div>

                <h2 className="mt-4 text-2xl font-black">
                  Sua primeira corrida começa aqui
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Crie uma partida ou entre com um código para começar a jogar.
                </p>

                <Link
                  href="/partidas"
                  className="mt-5 inline-flex rounded-2xl bg-[#3B82F6] px-6 py-3 text-sm font-black text-white"
                >
                  COMEÇAR
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}