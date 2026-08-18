"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  gameId: number;
};

type Partida = {
  id: number;
  nome: string;
};

const CORES = [
  {
    nome: "Céu",
    valor: "#38BDF8",
  },
  {
    nome: "Violeta",
    valor: "#8B5CF6",
  },
  {
    nome: "Laranja",
    valor: "#F97316",
  },
  {
    nome: "Verde",
    valor: "#22C55E",
  },
  {
    nome: "Rosa",
    valor: "#EC4899",
  },
  {
    nome: "Amarelo",
    valor: "#EAB308",
  },
  {
    nome: "Turquesa",
    valor: "#14B8A6",
  },
  {
    nome: "Vermelho",
    valor: "#EF4444",
  },
];

function Logo() {
  return (
    <img
      src="/dotowin-logo.png"
      alt="DoToWin"
      className="h-[54px] w-auto max-w-[205px] object-contain mix-blend-multiply sm:h-[60px] sm:max-w-[225px]"
    />
  );
}

function Peao({
  cor,
}: {
  cor: string;
}) {
  return (
    <div className="relative h-[118px] w-[92px]">
      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          backgroundColor: cor,
          opacity: 0.2,
        }}
      />

      <div
        className="absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 rounded-full border-[5px] border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 8px 18px rgba(15,23,42,.12)",
        }}
      />

      <div
        className="absolute bottom-[18px] left-1/2 h-14 w-[68px] -translate-x-1/2 rounded-t-full border-x-[5px] border-white"
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className="absolute bottom-0 left-1/2 h-7 w-[88px] -translate-x-1/2 rounded-full border-[5px] border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 8px 18px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

export default function PersonalizarPage() {
  const router = useRouter();

  const [
    jogador,
    setJogador,
  ] = useState<Jogador | null>(
    null
  );

  const [
    partida,
    setPartida,
  ] = useState<Partida | null>(
    null
  );

  const [
    corSelecionada,
    setCorSelecionada,
  ] = useState("#38BDF8");

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setMensagemErro("");

    const {
      data: { user },
      error: erroUsuario,
    } =
      await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.push("/login");
      return;
    }

    const gameIdSalvo =
      localStorage.getItem(
        "dotowin_game_id"
      );

    if (!gameIdSalvo) {
      router.push("/partidas");
      return;
    }

    const gameId =
      Number(gameIdSalvo);

    if (!Number.isFinite(gameId)) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      router.push("/partidas");
      return;
    }

    const [
      {
        data: jogadorData,
        error: erroJogador,
      },
      {
        data: partidaData,
        error: erroPartida,
      },
    ] = await Promise.all([
      supabase
        .from("players")
        .select(
          "id, name, color, game_id"
        )
        .eq(
          "profile_id",
          user.id
        )
        .eq(
          "game_id",
          gameId
        )
        .maybeSingle(),

      supabase
        .from("games")
        .select(
          "id, name"
        )
        .eq(
          "id",
          gameId
        )
        .maybeSingle(),
    ]);

    if (
      erroJogador ||
      !jogadorData
    ) {
      console.error(
        "Erro ao carregar jogador:",
        erroJogador
      );

      setMensagemErro(
        "Não foi possível identificar seu jogador nesta partida."
      );

      setCarregando(false);
      return;
    }

    if (
      erroPartida ||
      !partidaData
    ) {
      console.error(
        "Erro ao carregar partida:",
        erroPartida
      );

      setMensagemErro(
        "Não foi possível carregar a partida."
      );

      setCarregando(false);
      return;
    }

    const jogadorFormatado: Jogador =
      {
        id:
          jogadorData.id,

        nome:
          jogadorData.name ||
          "Jogador",

        cor:
          jogadorData.color ||
          "#38BDF8",

        gameId:
          jogadorData.game_id,
      };

    setJogador(
      jogadorFormatado
    );

    setPartida({
      id:
        partidaData.id,

      nome:
        partidaData.name,
    });

    setCorSelecionada(
      jogadorFormatado.cor
    );

    setCarregando(false);
  }

  async function salvarCor() {
    if (!jogador) {
      return;
    }

    setSalvando(true);
    setMensagemErro("");

    const {
      error,
    } = await supabase.rpc(
      "update_my_player_style",
      {
        p_game_id:
          jogador.gameId,

        p_color:
          corSelecionada,

        p_avatar:
          "🐱",
      }
    );

    if (error) {
      console.error(
        "Erro ao salvar cor:",
        error
      );

      setMensagemErro(
        "Não foi possível salvar sua cor."
      );

      setSalvando(false);
      return;
    }

    setSalvando(false);

    router.push("/jogo");
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#1F2937]">
      <div className="mx-auto max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:px-5">
          <div className="flex items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-slate-200 sm:block" />

            <Link
              href="/jogo"
              className="hidden rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-[#F5F8FC] hover:text-slate-600 sm:block"
            >
              ← Jogo
            </Link>
          </div>

          {partida && (
            <div className="hidden rounded-2xl bg-[#F5F8FC] px-4 py-2.5 text-right sm:block">
              <p className="text-[8px] font-black tracking-[0.18em] text-slate-400">
                PARTIDA
              </p>

              <p className="mt-0.5 max-w-[180px] truncate text-xs font-black">
                {partida.nome}
              </p>
            </div>
          )}
        </header>

        {carregando ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] bg-white shadow-[0_12px_35px_rgba(15,23,42,.05)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Preparando suas cores...
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-7">
              <p className="text-[10px] font-black tracking-[0.24em] text-[#8B5CF6]">
                SEU JOGADOR
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Escolha sua cor
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
                Essa será a cor do seu peão durante a corrida. Você pode trocar depois.
              </p>
            </section>

            {mensagemErro && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {mensagemErro}
              </div>
            )}

            <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-[30px] bg-white p-8 text-center shadow-[0_12px_35px_rgba(15,23,42,.05)]">
                <p className="text-[9px] font-black tracking-[0.2em] text-slate-400">
                  SUA PEÇA
                </p>

                <div className="mt-8 flex min-h-[155px] items-center justify-center">
                  <Peao
                    cor={
                      corSelecionada
                    }
                  />
                </div>

                <h2 className="mt-5 text-xl font-black">
                  {jogador?.nome ||
                    "Jogador"}
                </h2>

                <div className="mt-3 flex items-center gap-2 rounded-full bg-[#F5F8FC] px-4 py-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        corSelecionada,
                    }}
                  />

                  <span className="text-xs font-black text-slate-500">
                    {
                      CORES.find(
                        (cor) =>
                          cor.valor ===
                          corSelecionada
                      )?.nome ||
                      "Sua cor"
                    }
                  </span>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
                <p className="text-[10px] font-black tracking-[0.18em] text-slate-400">
                  CORES DISPONÍVEIS
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CORES.map(
                    (cor) => {
                      const selecionada =
                        cor.valor ===
                        corSelecionada;

                      return (
                        <button
                          key={
                            cor.valor
                          }
                          type="button"
                          onClick={() => {
                            setCorSelecionada(
                              cor.valor
                            );

                            setMensagemErro(
                              ""
                            );
                          }}
                          className={`relative rounded-[22px] border-2 p-4 text-center transition hover:-translate-y-0.5 ${
                            selecionada
                              ? "border-[#1F2937] bg-[#F8FBFE] shadow-[0_8px_18px_rgba(15,23,42,.08)]"
                              : "border-[#EDF2F7] bg-white hover:border-slate-200"
                          }`}
                        >
                          {selecionada && (
                            <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1F2937] text-[10px] font-black text-white">
                              ✓
                            </div>
                          )}

                          <div
                            className="mx-auto h-12 w-12 rounded-full border-4 border-white shadow-[0_5px_14px_rgba(15,23,42,.12)]"
                            style={{
                              backgroundColor:
                                cor.valor,
                            }}
                          />

                          <p className="mt-3 text-xs font-black">
                            {cor.nome}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-7 rounded-[22px] bg-[#F5F8FC] p-4">
                  <p className="text-[9px] font-black tracking-[0.16em] text-slate-400">
                    DICA
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Sua cor identifica seu peão no tabuleiro e também aparece no ranking da partida.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/jogo"
                    className="rounded-2xl bg-[#F5F8FC] px-5 py-3.5 text-center text-sm font-black text-slate-500 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="button"
                    onClick={
                      salvarCor
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-2xl bg-[#22C7D9] px-7 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvando
                      ? "Salvando..."
                      : "Salvar e jogar →"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}