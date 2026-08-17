"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  posicao: number;
};

type Partida = {
  id: number;
  nome: string;
  codigo: string;
};

type SubmissaoJogador = {
  task_id: number;
  status: string;
};

type CasaEspecial =
  | "presente"
  | "estrela"
  | "surpresa"
  | "desafio"
  | "energia"
  | null;

const TOTAL_CASAS = 60;

function limitarPosicao(posicao: number) {
  return Math.min(
    Math.max(posicao || 1, 1),
    TOTAL_CASAS
  );
}

function tipoCasa(
  numero: number
): CasaEspecial {
  if (numero === TOTAL_CASAS) {
    return null;
  }

  if (numero % 17 === 0) {
    return "presente";
  }

  if (numero % 13 === 0) {
    return "desafio";
  }

  if (numero % 11 === 0) {
    return "energia";
  }

  if (numero % 9 === 0) {
    return "estrela";
  }

  if (numero % 7 === 0) {
    return "surpresa";
  }

  return null;
}

function simboloCasa(
  tipo: CasaEspecial
) {
  if (tipo === "presente") {
    return "🎁";
  }

  if (tipo === "estrela") {
    return "★";
  }

  if (tipo === "surpresa") {
    return "?";
  }

  if (tipo === "desafio") {
    return "!";
  }

  if (tipo === "energia") {
    return "+";
  }

  return null;
}

function classeCasaEspecial(
  tipo: CasaEspecial
) {
  if (tipo === "presente") {
    return {
      background:
        "radial-gradient(circle at 35% 25%, #fde047 0%, #e0a000 52%, #704400 140%)",
      border:
        "rgba(253, 224, 71, .7)",
      shadow:
        "0 0 24px rgba(234,179,8,.5)",
    };
  }

  if (tipo === "estrela") {
    return {
      background:
        "radial-gradient(circle at 35% 25%, #ffd84a 0%, #c78d00 60%, #422b00 140%)",
      border:
        "rgba(250,204,21,.65)",
      shadow:
        "0 0 24px rgba(234,179,8,.38)",
    };
  }

  if (tipo === "surpresa") {
    return {
      background:
        "radial-gradient(circle at 35% 25%, #a78bfa 0%, #6d28d9 58%, #25104f 140%)",
      border:
        "rgba(167,139,250,.6)",
      shadow:
        "0 0 24px rgba(139,92,246,.35)",
    };
  }

  if (tipo === "desafio") {
    return {
      background:
        "radial-gradient(circle at 35% 25%, #fb923c 0%, #ea580c 58%, #521b05 140%)",
      border:
        "rgba(251,146,60,.65)",
      shadow:
        "0 0 24px rgba(249,115,22,.35)",
    };
  }

  if (tipo === "energia") {
    return {
      background:
        "radial-gradient(circle at 35% 25%, #5eead4 0%, #0f9f91 58%, #083d3a 140%)",
      border:
        "rgba(94,234,212,.6)",
      shadow:
        "0 0 24px rgba(45,212,191,.32)",
    };
  }

  return null;
}

function Peao({
  cor,
  pequeno = false,
}: {
  cor: string;
  pequeno?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 ${
        pequeno
          ? "h-10 w-8"
          : "h-12 w-9"
      }`}
    >
      <div
        className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
        style={{
          backgroundColor: cor,
          opacity: 0.5,
        }}
      />

      <div
        className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-full border border-white/40 ${
          pequeno
            ? "h-4 w-4"
            : "h-5 w-5"
        }`}
        style={{
          background: `radial-gradient(circle at 35% 25%, #ffffff 0%, ${cor} 28%, ${cor} 64%, #0f172a 145%)`,
          boxShadow: `0 0 12px ${cor}`,
        }}
      />

      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-t-full ${
          pequeno
            ? "bottom-[6px] h-4 w-6"
            : "bottom-[6px] h-5 w-7"
        }`}
        style={{
          background: `linear-gradient(180deg, ${cor}, #111827 145%)`,
        }}
      />

      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full ${
          pequeno
            ? "h-2 w-8"
            : "h-2.5 w-9"
        }`}
        style={{
          background: `linear-gradient(180deg, ${cor}, #111827)`,
        }}
      />
    </div>
  );
}

function Logo() {
  return (
    <div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black tracking-[-0.06em]">
          DO
        </span>

        <span className="mb-[3px] text-sm font-black tracking-wider text-cyan-400">
          TO
        </span>

        <span className="text-3xl font-black tracking-[-0.06em] text-violet-400">
          WIN
        </span>
      </div>

      <p className="mt-1 text-[9px] font-bold tracking-[0.34em] text-slate-500">
        DO. MOVE. WIN.
      </p>
    </div>
  );
}

function CasaDesktop({
  numero,
  jogadores,
}: {
  numero: number;
  jogadores: Jogador[];
}) {
  const especial =
    tipoCasa(numero);

  const estiloEspecial =
    classeCasaEspecial(especial);

  const final =
    numero === TOTAL_CASAS;

  const jogadoresNaCasa =
    jogadores.filter(
      (jogador) =>
        limitarPosicao(
          jogador.posicao
        ) === numero
    );

  return (
    <div className="relative flex flex-col items-center">
      {jogadoresNaCasa.length >
        0 && (
        <div className="absolute -top-10 z-30 flex items-end">
          {jogadoresNaCasa.map(
            (jogador, index) => (
              <div
                key={
                  jogador.id
                }
                className={
                  index > 0
                    ? "-ml-3"
                    : ""
                }
              >
                <Peao
                  cor={
                    jogador.cor
                  }
                  pequeno
                />
              </div>
            )
          )}
        </div>
      )}

      <div
        className={`relative z-20 flex items-center justify-center rounded-full border font-black shadow-[inset_0_2px_0_rgba(255,255,255,.22),0_10px_22px_rgba(0,0,0,.35)] ${
          final
            ? "h-[70px] w-[70px]"
            : "h-[48px] w-[48px]"
        }`}
        style={
          final
            ? {
                background:
                  "radial-gradient(circle at 35% 25%, #c4b5fd 0%, #7c3aed 52%, #2e1065 140%)",
                borderColor:
                  "rgba(221,214,254,.9)",
                boxShadow:
                  "0 0 30px rgba(139,92,246,.65), inset 0 2px 0 rgba(255,255,255,.3)",
              }
            : estiloEspecial
            ? {
                background:
                  estiloEspecial.background,
                borderColor:
                  estiloEspecial.border,
                boxShadow:
                  `${estiloEspecial.shadow}, inset 0 2px 0 rgba(255,255,255,.24)`,
              }
            : {
                background:
                  "radial-gradient(circle at 35% 25%, #60a5fa 0%, #2563eb 52%, #172554 140%)",
                borderColor:
                  "rgba(147,197,253,.35)",
              }
        }
      >
        {final ? (
          <div className="text-center">
            <div className="text-xl">
              ♛
            </div>

            <div className="mt-[-2px] text-[8px] tracking-wider">
              WIN
            </div>
          </div>
        ) : especial ? (
          <span
            className={
              especial ===
              "presente"
                ? "text-lg"
                : "text-base"
            }
          >
            {simboloCasa(
              especial
            )}
          </span>
        ) : (
          <span className="text-xs">
            {numero}
          </span>
        )}
      </div>
    </div>
  );
}

function TabuleiroDesktop({
  jogadores,
}: {
  jogadores: Jogador[];
}) {
  const linhas =
    Array.from(
      { length: 5 },
      (_, linha) =>
        Array.from(
          { length: 12 },
          (_, index) =>
            linha * 12 +
            index +
            1
        )
    );

  return (
    <div className="hidden lg:block">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.05] bg-[radial-gradient(circle_at_45%_20%,#0a2348_0%,#06172e_42%,#031023_100%)] px-8 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,rgba(34,211,238,.05),transparent_38%)]" />

        <div className="relative space-y-12">
          {linhas.map(
            (
              linha,
              linhaIndex
            ) => {
              const invertida =
                linhaIndex %
                  2 ===
                1;

              const casasLinha =
                invertida
                  ? [...linha].reverse()
                  : linha;

              return (
                <div
                  key={
                    linhaIndex
                  }
                  className="relative"
                >
                  <div className="absolute left-[3%] right-[3%] top-1/2 h-[48px] -translate-y-1/2 rounded-full bg-[#0b2344] shadow-[inset_0_0_0_1px_rgba(255,255,255,.025)]" />

                  <div className="absolute left-[3%] right-[3%] top-1/2 h-[28px] -translate-y-1/2 rounded-full bg-white/[0.018]" />

                  <div className="relative grid grid-cols-12 items-center gap-2">
                    {casasLinha.map(
                      (
                        numero
                      ) => (
                        <CasaDesktop
                          key={
                            numero
                          }
                          numero={
                            numero
                          }
                          jogadores={
                            jogadores
                          }
                        />
                      )
                    )}
                  </div>

                  {linhaIndex <
                    linhas.length -
                      1 && (
                    <div
                      className={`absolute top-1/2 h-[108px] w-[78px] border-y-[48px] border-[#0b2344] ${
                        invertida
                          ? "-left-[30px] rounded-l-full border-l-[48px]"
                          : "-right-[30px] rounded-r-full border-r-[48px]"
                      }`}
                      style={{
                        transform:
                          "translateY(16px)",
                      }}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>

        <div className="mt-12 grid grid-cols-4 gap-3">
          <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300">
              AQUECIMENTO
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Comece ganhando ritmo
              e avance pelas
              primeiras tarefas.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.04] p-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-violet-300">
              RITMO
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Mantenha a sequência
              e não deixe a corrida
              esfriar.
            </p>
          </div>

          <div className="rounded-2xl border border-teal-300/10 bg-teal-300/[0.04] p-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-teal-300">
              SPRINT
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              A reta final começa.
              Cada tarefa conta.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-300/10 bg-purple-300/[0.04] p-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-purple-300">
              VITÓRIA
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Chegue ao final antes
              dos outros jogadores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasaMobile({
  numero,
  jogadores,
}: {
  numero: number;
  jogadores: Jogador[];
}) {
  const especial =
    tipoCasa(numero);

  const estiloEspecial =
    classeCasaEspecial(especial);

  const final =
    numero === TOTAL_CASAS;

  const jogadoresNaCasa =
    jogadores.filter(
      (jogador) =>
        limitarPosicao(
          jogador.posicao
        ) === numero
    );

  return (
    <div className="relative flex flex-col items-center justify-center">
      {jogadoresNaCasa.length >
        0 && (
        <div className="absolute -top-9 z-30 flex items-end">
          {jogadoresNaCasa.map(
            (jogador, index) => (
              <div
                key={
                  jogador.id
                }
                className={
                  index > 0
                    ? "-ml-3"
                    : ""
                }
              >
                <Peao
                  cor={
                    jogador.cor
                  }
                  pequeno
                />
              </div>
            )
          )}
        </div>
      )}

      <div
        className={`relative z-20 flex items-center justify-center rounded-full border font-black shadow-[inset_0_2px_0_rgba(255,255,255,.22),0_8px_18px_rgba(0,0,0,.45)] ${
          final
            ? "h-[68px] w-[68px]"
            : "h-[52px] w-[52px]"
        }`}
        style={
          final
            ? {
                background:
                  "radial-gradient(circle at 35% 25%, #ddd6fe 0%, #8b5cf6 50%, #2e1065 140%)",
                borderColor:
                  "rgba(237,233,254,.9)",
                boxShadow:
                  "0 0 28px rgba(139,92,246,.65), inset 0 2px 0 rgba(255,255,255,.3)",
              }
            : estiloEspecial
            ? {
                background:
                  estiloEspecial.background,
                borderColor:
                  estiloEspecial.border,
                boxShadow:
                  `${estiloEspecial.shadow}, inset 0 2px 0 rgba(255,255,255,.25)`,
              }
            : {
                background:
                  "radial-gradient(circle at 35% 25%, #60a5fa 0%, #2563eb 52%, #172554 140%)",
                borderColor:
                  "rgba(147,197,253,.35)",
              }
        }
      >
        {final ? (
          <span className="text-2xl">
            ♛
          </span>
        ) : especial ? (
          <span
            className={
              especial ===
              "presente"
                ? "text-lg"
                : "text-xl"
            }
          >
            {simboloCasa(
              especial
            )}
          </span>
        ) : (
          <span className="text-sm">
            {numero}
          </span>
        )}
      </div>

      {final && (
        <p className="mt-2 text-[10px] font-black tracking-[0.22em] text-violet-300">
          VITÓRIA
        </p>
      )}
    </div>
  );
}

function TabuleiroMobile({
  jogadores,
}: {
  jogadores: Jogador[];
}) {
  const linhas =
    Array.from(
      { length: 15 },
      (_, linha) =>
        Array.from(
          { length: 4 },
          (_, index) =>
            linha * 4 +
            index +
            1
        )
    );

  return (
    <div className="lg:hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.05] bg-[radial-gradient(circle_at_50%_10%,#0b264e_0%,#06172e_40%,#031023_100%)] px-5 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.04),transparent_48%)]" />

        <div className="relative space-y-10">
          {linhas.map(
            (
              linha,
              linhaIndex
            ) => {
              const invertida =
                linhaIndex %
                  2 ===
                1;

              const casasLinha =
                invertida
                  ? [...linha].reverse()
                  : linha;

              return (
                <div
                  key={
                    linhaIndex
                  }
                  className="relative"
                >
                  <div className="absolute left-[4%] right-[4%] top-1/2 h-[42px] -translate-y-1/2 rounded-full bg-[#0b2344]" />

                  <div className="absolute left-[4%] right-[4%] top-1/2 h-[24px] -translate-y-1/2 rounded-full bg-white/[0.02]" />

                  <div className="relative grid grid-cols-4 items-center gap-4">
                    {casasLinha.map(
                      (
                        numero
                      ) => (
                        <CasaMobile
                          key={
                            numero
                          }
                          numero={
                            numero
                          }
                          jogadores={
                            jogadores
                          }
                        />
                      )
                    )}
                  </div>

                  {linhaIndex <
                    linhas.length -
                      1 && (
                    <div
                      className={`absolute top-1/2 h-[82px] w-[58px] border-y-[42px] border-[#0b2344] ${
                        invertida
                          ? "-left-[28px] rounded-l-full border-l-[42px]"
                          : "-right-[28px] rounded-r-full border-r-[42px]"
                      }`}
                      style={{
                        transform:
                          "translateY(15px)",
                      }}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>

        <div className="mt-10 grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
          <div className="px-2">
            <div className="text-lg text-cyan-300">
              ⚡
            </div>

            <p className="mt-2 text-[9px] font-black tracking-wider text-cyan-300">
              SPRINT
            </p>
          </div>

          <div className="px-3">
            <div className="text-lg text-violet-300">
              ⌛
            </div>

            <p className="mt-2 text-[9px] font-black tracking-wider text-violet-300">
              RITMO
            </p>
          </div>

          <div className="px-3">
            <div className="text-lg text-purple-300">
              ♛
            </div>

            <p className="mt-2 text-[9px] font-black tracking-wider text-purple-300">
              VITÓRIA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [
    jogadores,
    setJogadores,
  ] = useState<Jogador[]>(
    []
  );

  const [
    partida,
    setPartida,
  ] = useState<Partida | null>(
    null
  );

  const [
    jogadorAtualId,
    setJogadorAtualId,
  ] = useState<number | null>(
    null
  );

  const [
    tarefasPendentes,
    setTarefasPendentes,
  ] = useState(0);

  const [
    aprovacoesPendentes,
    setAprovacoesPendentes,
  ] = useState(0);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState("");

  useEffect(() => {
    carregarPartida();
  }, []);

  useEffect(() => {
    if (!partida?.id) {
      return;
    }

    const gameId =
      partida.id;

    const canal = supabase
      .channel(
        `dotowin-home-${gameId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          carregarPartida(
            true
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          carregarPartida(
            true
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "submissions",
        },
        () => {
          carregarPartida(
            true
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        canal
      );
    };
  }, [partida?.id]);

  async function carregarPartida(
    silencioso = false
  ) {
    if (!silencioso) {
      setCarregando(true);
    }

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

    const {
      data: participacoes,
      error: erroParticipacoes,
    } = await supabase
      .from("players")
      .select("id, game_id")
      .eq(
        "profile_id",
        user.id
      );

    if (erroParticipacoes) {
      console.error(
        "Erro ao localizar partidas:",
        erroParticipacoes
      );

      setMensagemErro(
        "Não foi possível identificar suas partidas."
      );

      setCarregando(false);
      return;
    }

    if (
      !participacoes ||
      participacoes.length === 0
    ) {
      router.push("/partidas");
      return;
    }

    let gameId:
      | number
      | null = null;

    const gameIdSalvo =
      localStorage.getItem(
        "dotowin_game_id"
      );

    if (gameIdSalvo) {
      const idConvertido =
        Number(gameIdSalvo);

      const pertence =
        participacoes.some(
          (participacao) =>
            participacao.game_id ===
            idConvertido
        );

      if (pertence) {
        gameId =
          idConvertido;
      }
    }

    if (!gameId) {
      if (
        participacoes.length ===
          1 &&
        participacoes[0]
          .game_id
      ) {
        gameId =
          participacoes[0]
            .game_id;

        localStorage.setItem(
          "dotowin_game_id",
          String(gameId)
        );
      } else {
        localStorage.removeItem(
          "dotowin_game_id"
        );

        router.push(
          "/partidas"
        );

        return;
      }
    }

    const participacaoAtual =
      participacoes.find(
        (participacao) =>
          participacao.game_id ===
          gameId
      );

    if (!participacaoAtual) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      router.push("/partidas");
      return;
    }

    const playerId =
      participacaoAtual.id;

    setJogadorAtualId(
      playerId
    );

    const [
      {
        data: partidaData,
        error: erroPartida,
      },
      {
        data: jogadoresData,
        error: erroJogadores,
      },
      {
        data: tarefasData,
        error: erroTarefas,
      },
      {
        data:
          submissoesDoJogador,
        error:
          erroSubmissoesDoJogador,
      },
    ] = await Promise.all([
      supabase
        .from("games")
        .select(
          "id, name, code"
        )
        .eq("id", gameId)
        .single(),

      supabase
        .from("players")
        .select(
          "id, name, color, position, game_id"
        )
        .eq(
          "game_id",
          gameId
        )
        .order("position", {
          ascending: false,
        }),

      supabase
        .from("tasks")
        .select("id")
        .eq(
          "game_id",
          gameId
        ),

      supabase
        .from("submissions")
        .select(
          "task_id, status"
        )
        .eq(
          "player_id",
          playerId
        ),
    ]);

    if (
      erroPartida ||
      !partidaData
    ) {
      console.error(
        "Erro ao carregar partida:",
        erroPartida
      );

      localStorage.removeItem(
        "dotowin_game_id"
      );

      setMensagemErro(
        "Não foi possível carregar os dados da partida."
      );

      setCarregando(false);
      return;
    }

    if (erroJogadores) {
      console.error(
        "Erro ao carregar jogadores:",
        erroJogadores
      );

      setMensagemErro(
        "Não foi possível carregar os jogadores da partida."
      );

      setCarregando(false);
      return;
    }

    if (erroTarefas) {
      console.error(
        "Erro ao carregar tarefas:",
        erroTarefas
      );

      setMensagemErro(
        "Não foi possível carregar as tarefas."
      );

      setCarregando(false);
      return;
    }

    if (
      erroSubmissoesDoJogador
    ) {
      console.error(
        "Erro ao carregar progresso:",
        erroSubmissoesDoJogador
      );

      setMensagemErro(
        "Não foi possível carregar seu progresso."
      );

      setCarregando(false);
      return;
    }

    const partidaFormatada: Partida =
      {
        id: partidaData.id,
        nome:
          partidaData.name,
        codigo:
          partidaData.code,
      };

    const jogadoresDoBanco: Jogador[] =
      (
        jogadoresData || []
      ).map((item) => ({
        id: item.id,
        nome: item.name,
        cor:
          item.color ||
          "#38bdf8",
        posicao:
          limitarPosicao(
            item.position ||
              1
          ),
      }));

    const mapaSubmissoes =
      new Map<
        number,
        string
      >();

    (
      (submissoesDoJogador ||
        []) as SubmissaoJogador[]
    ).forEach(
      (submissao) => {
        mapaSubmissoes.set(
          submissao.task_id,
          submissao.status
        );
      }
    );

    const quantidadeTarefasPendentes =
      (
        tarefasData || []
      ).filter((tarefa) => {
        const status =
          mapaSubmissoes.get(
            tarefa.id
          );

        return (
          !status ||
          status ===
            "Pendente"
        );
      }).length;

    const idsOutrosJogadores =
      (
        jogadoresData || []
      )
        .filter(
          (jogador) =>
            jogador.id !==
            playerId
        )
        .map(
          (jogador) =>
            jogador.id
        );

    let quantidadeAprovacoes =
      0;

    if (
      idsOutrosJogadores.length >
      0
    ) {
      const {
        count,
        error:
          erroAprovacoes,
      } = await supabase
        .from("submissions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "status",
          "Aguardando aprovação"
        )
        .in(
          "player_id",
          idsOutrosJogadores
        );

      if (
        erroAprovacoes
      ) {
        console.error(
          "Erro ao contar aprovações:",
          erroAprovacoes
        );
      } else {
        quantidadeAprovacoes =
          count || 0;
      }
    }

    setPartida(
      partidaFormatada
    );

    setJogadores(
      jogadoresDoBanco
    );

    setTarefasPendentes(
      quantidadeTarefasPendentes
    );

    setAprovacoesPendentes(
      quantidadeAprovacoes
    );

    setCarregando(false);
  }

  const ranking =
    [...jogadores].sort(
      (a, b) =>
        b.posicao -
        a.posicao
    );

  const lider =
    ranking[0] || null;

  const jogadorAtual =
    jogadores.find(
      (jogador) =>
        jogador.id ===
        jogadorAtualId
    ) || null;

  return (
    <main className="min-h-screen bg-[#020713] pb-24 text-white lg:pb-0">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 lg:px-6">
        <header className="mb-5 flex items-center justify-between gap-3 rounded-[24px] border border-white/[0.05] bg-[#051020]/80 px-4 py-3 backdrop-blur-xl lg:bg-transparent lg:px-0">
          <div className="flex min-w-0 items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-white/[0.08] md:block" />

            <div className="hidden min-w-0 md:block">
              <p className="text-[9px] font-bold tracking-[0.18em] text-slate-500">
                PARTIDA
              </p>

              <p className="max-w-[300px] truncate text-sm font-black">
                {partida?.nome ||
                  "Carregando..."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-center">
              <p className="text-[8px] font-bold tracking-[0.24em] text-slate-500">
                CÓDIGO
              </p>

              <p className="mt-0.5 text-xs font-black tracking-[0.28em] text-cyan-300">
                {partida?.codigo ||
                  "-----"}
              </p>
            </div>

            <Link
              href="/partidas"
              className="hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs font-black transition hover:bg-white/[0.07] sm:block"
            >
              Partidas
            </Link>
          </div>
        </header>

        <div className="mb-4 md:hidden">
          <p className="text-[9px] font-bold tracking-[0.18em] text-slate-500">
            PARTIDA
          </p>

          <p className="mt-1 truncate text-sm font-black">
            {partida?.nome ||
              "Carregando..."}
          </p>
        </div>

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm font-bold text-red-300">
            {mensagemErro}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[225px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black tracking-[0.25em] text-slate-500">
                JOGADORES
              </p>

              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[9px] font-black text-slate-400">
                {jogadores.length}
              </span>
            </div>

            <div className="space-y-3">
              {ranking.map(
                (
                  jogador,
                  index
                ) => {
                  const progresso =
                    Math.round(
                      (jogador.posicao /
                        TOTAL_CASAS) *
                        100
                    );

                  return (
                    <div
                      key={
                        jogador.id
                      }
                      className={`rounded-[22px] border p-4 ${
                        jogador.id ===
                        jogadorAtualId
                          ? "border-cyan-300/30 bg-cyan-300/[0.05]"
                          : "border-white/[0.07] bg-[#071329]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Peao
                          cor={
                            jogador.cor
                          }
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black">
                              {
                                jogador.nome
                              }
                            </p>

                            {index ===
                              0 && (
                              <span className="text-[8px] font-black tracking-wider text-amber-300">
                                LÍDER
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-baseline gap-1">
                            <span
                              className="text-xl font-black"
                              style={{
                                color:
                                  jogador.cor,
                              }}
                            >
                              {
                                jogador.posicao
                              }
                            </span>

                            <span className="text-[10px] text-slate-500">
                              /{" "}
                              {
                                TOTAL_CASAS
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progresso}%`,
                              backgroundColor:
                                jogador.cor,
                              boxShadow: `0 0 9px ${jogador.cor}`,
                            }}
                          />
                        </div>

                        <span className="text-[9px] font-bold text-slate-400">
                          {
                            progresso
                          }
                          %
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-4 rounded-[22px] border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] to-cyan-400/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400/15 text-sm font-black text-lime-300">
                  H
                </div>

                <div>
                  <p className="text-xs font-black text-lime-300">
                    HAPPY
                  </p>

                  <p className="text-[9px] text-slate-500">
                    parceiro de
                    progresso
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {lider
                  ? `${lider.nome} está na frente. Uma boa sequência pode mudar essa corrida.`
                  : "A corrida começa quando os jogadores entram na partida."}
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-[30px] border border-cyan-300/10 bg-[#061329] p-4 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-5 lg:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.25em] text-cyan-400">
                    CORRIDA ATUAL
                  </p>

                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                    {
                      TOTAL_CASAS
                    }{" "}
                    casas até a
                    vitória
                  </h1>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                    Complete tarefas,
                    ganhe aprovações e
                    avance pela trilha
                    até chegar ao topo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:min-w-[380px]">
                  <Link
                    href="/tarefas"
                    className="rounded-[20px] border border-blue-300/15 bg-blue-400/[0.05] p-4 transition hover:bg-blue-400/[0.09]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/15 text-xl">
                        ▣
                      </div>

                      <div>
                        <p className="text-[9px] font-black tracking-wider text-cyan-300">
                          SUAS TAREFAS
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {
                            tarefasPendentes
                          }
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-500">
                      para concluir
                    </p>
                  </Link>

                  <Link
                    href="/aprovacoes"
                    className="rounded-[20px] border border-orange-300/20 bg-orange-300/[0.05] p-4 transition hover:bg-orange-300/[0.09]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400/15 text-xl">
                        👍
                      </div>

                      <div>
                        <p className="text-[9px] font-black tracking-wider text-orange-300">
                          APROVAÇÕES
                        </p>

                        <p className="mt-1 text-xl font-black text-orange-300">
                          {
                            aprovacoesPendentes
                          }
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-500">
                      aguardando você
                    </p>
                  </Link>
                </div>
              </div>

              {carregando ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/[0.05] bg-[#031023]">
                  <div className="text-center">
                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

                    <p className="mt-3 text-sm font-bold text-slate-400">
                      Montando a
                      corrida...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <TabuleiroDesktop
                    jogadores={
                      jogadores
                    }
                  />

                  <TabuleiroMobile
                    jogadores={
                      jogadores
                    }
                  />
                </>
              )}

              <div className="mt-5 hidden gap-3 lg:grid lg:grid-cols-[1fr_1.45fr_1fr]">
                <Link
                  href="/tarefas"
                  className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm font-bold transition hover:bg-white/[0.08]"
                >
                  Minhas tarefas
                </Link>

                <Link
                  href="/tarefas"
                  className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 px-5 py-4 text-sm font-black tracking-wide text-[#02101c] shadow-[0_12px_35px_rgba(34,211,238,.25)] transition hover:scale-[1.01]"
                >
                  + CONCLUIR TAREFA
                </Link>

                <Link
                  href="/aprovacoes"
                  className="flex items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-300/[0.05] px-5 py-4 text-sm font-bold text-orange-200 transition hover:bg-orange-300/[0.1]"
                >
                  Aprovações ·{" "}
                  {
                    aprovacoesPendentes
                  }
                </Link>
              </div>
            </div>

            <div className="mt-4 xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ranking.map(
                  (
                    jogador,
                    index
                  ) => (
                    <div
                      key={
                        jogador.id
                      }
                      className={`flex min-w-[155px] items-center gap-3 rounded-2xl border p-3 ${
                        jogador.id ===
                        jogadorAtualId
                          ? "border-cyan-300/25 bg-cyan-300/[0.05]"
                          : "border-white/[0.06] bg-[#071329]"
                      }`}
                    >
                      <Peao
                        cor={
                          jogador.cor
                        }
                        pequeno
                      />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">
                          {
                            jogador.nome
                          }
                        </p>

                        <p
                          className="mt-1 text-sm font-black"
                          style={{
                            color:
                              jogador.cor,
                          }}
                        >
                          {
                            jogador.posicao
                          }
                          /
                          {
                            TOTAL_CASAS
                          }
                        </p>

                        {index ===
                          0 && (
                          <p className="text-[8px] font-black text-amber-300">
                            LÍDER
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[24px] border border-white/[0.08] bg-[#081529]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,.55)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          <Link
            href="/"
            className="flex flex-col items-center justify-center rounded-2xl bg-cyan-400/[0.08] px-2 py-2.5 text-cyan-300"
          >
            <span className="text-lg">
              🎮
            </span>

            <span className="mt-1 text-[10px] font-black">
              Jogo
            </span>
          </Link>

          <Link
            href="/tarefas"
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
            <span className="text-lg">
              ▣
            </span>

            <span className="mt-1 text-[10px] font-bold">
              Tarefas
            </span>
          </Link>

          <Link
            href="/aprovacoes"
            className="relative flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
            {aprovacoesPendentes >
              0 && (
              <span className="absolute right-[18%] top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white">
                {
                  aprovacoesPendentes
                }
              </span>
            )}

            <span className="text-lg">
              👍
            </span>

            <span className="mt-1 text-[10px] font-bold">
              Aprovações
            </span>
          </Link>

          <Link
            href="/partidas"
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
            <span className="text-lg">
              🏆
            </span>

            <span className="mt-1 text-[10px] font-bold">
              Partidas
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}