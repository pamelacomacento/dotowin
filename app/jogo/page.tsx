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
  totalCasas: number;
};

type ModoRepeticao =
  | "once"
  | "daily"
  | "weekdays"
  | "custom";

type TarefaContador = {
  id: number;
  repeat_mode: ModoRepeticao | string | null;
  repeat_days: number[] | null;
  available_from: string | null;
  available_until: string | null;
};

type SubmissaoJogador = {
  task_id: number;
  status: string;
  occurrence_date: string | null;
};

function horaEmMinutos(
  hora: string | null
) {
  if (!hora) {
    return null;
  }

  const [horas, minutos] =
    hora.split(":").map(Number);

  if (
    !Number.isFinite(horas) ||
    !Number.isFinite(minutos)
  ) {
    return null;
  }

  return horas * 60 + minutos;
}

function obterAgoraBrasil() {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(new Date());

  const mapa =
    Object.fromEntries(
      partes.map((parte) => [
        parte.type,
        parte.value,
      ])
    );

  const data =
    `${mapa.year}-${mapa.month}-${mapa.day}`;

  const ano = Number(mapa.year);
  const mes = Number(mapa.month);
  const dia = Number(mapa.day);

  const diaSemana =
    new Date(
      Date.UTC(ano, mes - 1, dia)
    ).getUTCDay();

  return {
    data,
    diaSemana,
    minutos:
      Number(mapa.hour) * 60 +
      Number(mapa.minute),
  };
}

function tarefaProgramadaAgora(
  tarefa: TarefaContador,
  diaSemana: number,
  agoraMinutos: number
) {
  const modo =
    tarefa.repeat_mode || "once";

  if (modo === "once") {
    return true;
  }

  if (modo === "weekdays") {
    if (
      diaSemana < 1 ||
      diaSemana > 5
    ) {
      return false;
    }
  } else if (modo === "custom") {
    const dias = Array.isArray(
      tarefa.repeat_days
    )
      ? tarefa.repeat_days
      : [];

    if (!dias.includes(diaSemana)) {
      return false;
    }
  } else if (modo !== "daily") {
    return false;
  }

  const inicio = horaEmMinutos(
    tarefa.available_from
  );

  const fim = horaEmMinutos(
    tarefa.available_until
  );

  if (
    inicio !== null &&
    agoraMinutos < inicio
  ) {
    return false;
  }

  if (
    fim !== null &&
    agoraMinutos > fim
  ) {
    return false;
  }

  return true;
}

function limitarPosicao(
  posicao: number,
  totalCasas: number
) {
  return Math.min(
    Math.max(posicao ?? 0, 0),
    totalCasas
  );
}

function criarLinhas(
  totalCasas: number,
  casasPorLinha: number
) {
  const numeros = Array.from(
    { length: totalCasas },
    (_, index) => index + 1
  );

  const linhas: number[][] = [];

  for (
    let index = 0;
    index < numeros.length;
    index += casasPorLinha
  ) {
    linhas.push(
      numeros.slice(
        index,
        index + casasPorLinha
      )
    );
  }

  return linhas;
}

function criarSlotsLinha(
  linha: number[],
  quantidadeSlots: number,
  invertida: boolean
) {
  const slots: Array<number | null> =
    Array(quantidadeSlots).fill(null);

  linha.forEach((numero, index) => {
    if (invertida) {
      slots[
        quantidadeSlots - 1 - index
      ] = numero;
    } else {
      slots[index] = numero;
    }
  });

  return slots;
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
          opacity: 0.18,
        }}
      />

      <div
        className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-2 border-white ${
          pequeno
            ? "h-4 w-4"
            : "h-5 w-5"
        }`}
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      />

      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-t-full border-x-2 border-white ${
          pequeno
            ? "bottom-[6px] h-4 w-6"
            : "bottom-[6px] h-5 w-7"
        }`}
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border-2 border-white ${
          pequeno
            ? "h-2.5 w-8"
            : "h-3 w-9"
        }`}
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Voltar para a página inicial"
      className="block shrink-0 rounded-xl transition hover:opacity-80"
    >
      <img
        src="/dotowin-logo.png"
        alt="DoToWin"
        className="h-[54px] w-auto max-w-[205px] object-contain mix-blend-multiply sm:h-[60px] sm:max-w-[225px]"
      />
    </Link>
  );
}

function JogadoresNoPonto({
  jogadores,
}: {
  jogadores: Jogador[];
}) {
  if (jogadores.length === 0) {
    return null;
  }

  return (
    <div className="absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-end">
      {jogadores.map(
        (jogador, index) => (
          <div
            key={jogador.id}
            className={
              index > 0
                ? "-ml-3"
                : ""
            }
          >
            <Peao
              cor={jogador.cor}
              pequeno
            />
          </div>
        )
      )}
    </div>
  );
}

function estiloCasa(
  numero: number,
  totalCasas: number,
  posicaoAtual: number,
  corJogadorAtual: string
) {
  const final =
    numero === totalCasas;

  const atual =
    posicaoAtual > 0 &&
    numero === posicaoAtual;

  const concluida =
    numero < posicaoAtual;

  if (final) {
    if (atual) {
      return {
        backgroundColor: "#8B5CF6",
        borderColor: corJogadorAtual,
        color: "#FFFFFF",
        boxShadow: `0 0 0 5px ${corJogadorAtual}22, 0 10px 24px rgba(139,92,246,.22)`,
      };
    }

    return {
      backgroundColor: "#F1ECFF",
      borderColor: "#D9CCFF",
      color: "#8B5CF6",
      boxShadow:
        "0 6px 16px rgba(139,92,246,.08)",
    };
  }

  if (atual) {
    return {
      backgroundColor: "#FFFFFF",
      borderColor: corJogadorAtual,
      color: corJogadorAtual,
      boxShadow: `0 0 0 5px ${corJogadorAtual}20, 0 8px 18px rgba(15,23,42,.08)`,
    };
  }

  if (concluida) {
    return {
      backgroundColor: "#3B82F6",
      borderColor: "#3B82F6",
      color: "#FFFFFF",
      boxShadow:
        "0 6px 14px rgba(59,130,246,.14)",
    };
  }

  return {
    backgroundColor: "#EDF5FC",
    borderColor: "#DCE9F4",
    color: "#8CA3B9",
    boxShadow:
      "0 4px 10px rgba(15,23,42,.025)",
  };
}

function CasaDesktop({
  numero,
  jogadores,
  totalCasas,
  posicaoAtual,
  corJogadorAtual,
}: {
  numero: number;
  jogadores: Jogador[];
  totalCasas: number;
  posicaoAtual: number;
  corJogadorAtual: string;
}) {
  const final =
    numero === totalCasas;

  const atual =
    posicaoAtual > 0 &&
    numero === posicaoAtual;

  const jogadoresNaCasa =
    jogadores.filter(
      (jogador) =>
        limitarPosicao(
          jogador.posicao,
          totalCasas
        ) === numero
    );

  const estilo = estiloCasa(
    numero,
    totalCasas,
    posicaoAtual,
    corJogadorAtual
  );

  return (
    <div className="relative flex flex-col items-center">
      <JogadoresNoPonto
        jogadores={jogadoresNaCasa}
      />

      {atual && (
        <div
          className="absolute left-1/2 top-1/2 z-10 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
          style={{
            backgroundColor:
              corJogadorAtual,
          }}
        />
      )}

      <div
        className={`relative z-20 flex items-center justify-center rounded-full font-black transition ${
          final
            ? "h-[68px] w-[68px] border-[3px]"
            : atual
            ? "h-[52px] w-[52px] border-[4px]"
            : "h-[48px] w-[48px] border-2"
        }`}
        style={estilo}
      >
        <span
          className={
            final
              ? "text-lg"
              : "text-xs"
          }
        >
          {numero}
        </span>
      </div>

      {atual && !final && (
        <p
          className="mt-2 text-[8px] font-black tracking-[0.18em]"
          style={{
            color:
              corJogadorAtual,
          }}
        >
          VOCÊ
        </p>
      )}

      {final && (
        <p className="mt-2 text-[9px] font-black tracking-[0.2em] text-[#8B5CF6]">
          VITÓRIA
        </p>
      )}
    </div>
  );
}

function StartDesktop({
  jogadores,
  jogadorAtualNoStart,
  corJogadorAtual,
}: {
  jogadores: Jogador[];
  jogadorAtualNoStart: boolean;
  corJogadorAtual: string;
}) {
  return (
    <div className="mb-10 flex items-center gap-5">
      <div className="relative">
        <JogadoresNoPonto
          jogadores={jogadores}
        />

        {jogadorAtualNoStart && (
          <div
            className="absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
            style={{
              backgroundColor:
                corJogadorAtual,
            }}
          />
        )}

        <div
          className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 bg-[#22C7D9] text-white shadow-[0_10px_24px_rgba(34,199,217,.18)]"
          style={{
            borderColor:
              jogadorAtualNoStart
                ? corJogadorAtual
                : "#FFFFFF",
          }}
        >
          <span className="text-xl font-black">
            0
          </span>
        </div>

        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black tracking-[0.2em] text-[#1594A3]">
          START
        </div>
      </div>

      <div className="h-[42px] flex-1 rounded-full bg-[#E6F0F8]" />
    </div>
  );
}

function TabuleiroDesktop({
  jogadores,
  totalCasas,
  posicaoAtual,
  corJogadorAtual,
}: {
  jogadores: Jogador[];
  totalCasas: number;
  posicaoAtual: number;
  corJogadorAtual: string;
}) {
  const CASAS_POR_LINHA = 12;

  const linhas = criarLinhas(
    totalCasas,
    CASAS_POR_LINHA
  );

  const jogadoresNoStart =
    jogadores.filter(
      (jogador) =>
        jogador.posicao === 0
    );

  return (
    <div className="hidden lg:block">
      <div className="relative overflow-hidden rounded-[30px] border border-[#E6EDF5] bg-[#FBFDFE] px-8 py-12">
        <div className="relative">
          <StartDesktop
            jogadores={
              jogadoresNoStart
            }
            jogadorAtualNoStart={
              posicaoAtual === 0
            }
            corJogadorAtual={
              corJogadorAtual
            }
          />

          <div className="space-y-12">
            {linhas.map(
              (
                linha,
                linhaIndex
              ) => {
                const invertida =
                  linhaIndex %
                    2 ===
                  1;

                const slots =
                  criarSlotsLinha(
                    linha,
                    CASAS_POR_LINHA,
                    invertida
                  );

                return (
                  <div
                    key={
                      linhaIndex
                    }
                    className="relative"
                  >
                    <div className="absolute left-[3%] right-[3%] top-1/2 h-[48px] -translate-y-1/2 rounded-full bg-[#E6F0F8]" />

                    <div className="absolute left-[3%] right-[3%] top-1/2 h-[24px] -translate-y-1/2 rounded-full bg-white/30" />

                    <div className="relative grid grid-cols-12 items-center gap-2">
                      {slots.map(
                        (
                          numero,
                          slotIndex
                        ) => (
                          <div
                            key={
                              slotIndex
                            }
                            className="flex justify-center"
                          >
                            {numero !==
                              null && (
                              <CasaDesktop
                                numero={
                                  numero
                                }
                                jogadores={
                                  jogadores
                                }
                                totalCasas={
                                  totalCasas
                                }
                                posicaoAtual={
                                  posicaoAtual
                                }
                                corJogadorAtual={
                                  corJogadorAtual
                                }
                              />
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {linhaIndex <
                      linhas.length -
                        1 && (
                      <div
                        className={`absolute top-1/2 h-[108px] w-[78px] border-y-[48px] border-[#E6F0F8] ${
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
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 rounded-2xl bg-white px-5 py-4 text-xs shadow-[0_6px_20px_rgba(15,23,42,.04)]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#3B82F6]" />

            <span className="font-bold text-slate-500">
              Conquistado
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border-2 bg-white"
              style={{
                borderColor:
                  corJogadorAtual,
              }}
            />

            <span className="font-bold text-slate-500">
              Sua posição
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#EDF5FC]" />

            <span className="font-bold text-slate-500">
              Próximas casas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasaMobile({
  numero,
  jogadores,
  totalCasas,
  posicaoAtual,
  corJogadorAtual,
}: {
  numero: number;
  jogadores: Jogador[];
  totalCasas: number;
  posicaoAtual: number;
  corJogadorAtual: string;
}) {
  const final =
    numero === totalCasas;

  const atual =
    posicaoAtual > 0 &&
    numero === posicaoAtual;

  const jogadoresNaCasa =
    jogadores.filter(
      (jogador) =>
        limitarPosicao(
          jogador.posicao,
          totalCasas
        ) === numero
    );

  const estilo = estiloCasa(
    numero,
    totalCasas,
    posicaoAtual,
    corJogadorAtual
  );

  return (
    <div className="relative flex flex-col items-center justify-center">
      <JogadoresNoPonto
        jogadores={jogadoresNaCasa}
      />

      {atual && (
        <div
          className="absolute left-1/2 top-1/2 z-10 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
          style={{
            backgroundColor:
              corJogadorAtual,
          }}
        />
      )}

      <div
        className={`relative z-20 flex items-center justify-center rounded-full font-black ${
          final
            ? "h-[68px] w-[68px] border-[3px]"
            : atual
            ? "h-[58px] w-[58px] border-[4px]"
            : "h-[52px] w-[52px] border-2"
        }`}
        style={estilo}
      >
        <span
          className={
            final
              ? "text-lg"
              : "text-sm"
          }
        >
          {numero}
        </span>
      </div>

      {atual && !final && (
        <p
          className="mt-2 text-[8px] font-black tracking-[0.18em]"
          style={{
            color:
              corJogadorAtual,
          }}
        >
          VOCÊ
        </p>
      )}

      {final && (
        <p className="mt-2 text-[9px] font-black tracking-[0.22em] text-[#8B5CF6]">
          VITÓRIA
        </p>
      )}
    </div>
  );
}

function StartMobile({
  jogadores,
  jogadorAtualNoStart,
  corJogadorAtual,
}: {
  jogadores: Jogador[];
  jogadorAtualNoStart: boolean;
  corJogadorAtual: string;
}) {
  return (
    <div className="relative mb-11 flex items-center">
      <div className="relative z-20">
        <JogadoresNoPonto
          jogadores={jogadores}
        />

        {jogadorAtualNoStart && (
          <div
            className="absolute left-1/2 top-1/2 h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
            style={{
              backgroundColor:
                corJogadorAtual,
            }}
          />
        )}

        <div
          className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 bg-[#22C7D9] text-white shadow-[0_10px_24px_rgba(34,199,217,.16)]"
          style={{
            borderColor:
              jogadorAtualNoStart
                ? corJogadorAtual
                : "#FFFFFF",
          }}
        >
          <span className="text-xl font-black">
            0
          </span>
        </div>        <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-[0.2em] text-[#1594A3]">
          START
        </p>
      </div>

      <div className="-ml-1 h-[42px] flex-1 rounded-r-full bg-[#E6F0F8]" />
    </div>
  );
}

function TabuleiroMobile({
  jogadores,
  totalCasas,
  posicaoAtual,
  corJogadorAtual,
}: {
  jogadores: Jogador[];
  totalCasas: number;
  posicaoAtual: number;
  corJogadorAtual: string;
}) {
  const CASAS_POR_LINHA = 4;

  const linhas = criarLinhas(
    totalCasas,
    CASAS_POR_LINHA
  );

  const jogadoresNoStart =
    jogadores.filter(
      (jogador) =>
        jogador.posicao === 0
    );

  return (
    <div className="lg:hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-[#E6EDF5] bg-[#FBFDFE] px-5 py-10">
        <div className="relative">
          <StartMobile
            jogadores={
              jogadoresNoStart
            }
            jogadorAtualNoStart={
              posicaoAtual === 0
            }
            corJogadorAtual={
              corJogadorAtual
            }
          />

          <div className="space-y-10">
            {linhas.map(
              (
                linha,
                linhaIndex
              ) => {
                const invertida =
                  linhaIndex %
                    2 ===
                  1;

                const slots =
                  criarSlotsLinha(
                    linha,
                    CASAS_POR_LINHA,
                    invertida
                  );

                return (
                  <div
                    key={
                      linhaIndex
                    }
                    className="relative"
                  >
                    <div className="absolute left-[4%] right-[4%] top-1/2 h-[42px] -translate-y-1/2 rounded-full bg-[#E6F0F8]" />

                    <div className="relative grid grid-cols-4 items-center gap-4">
                      {slots.map(
                        (
                          numero,
                          slotIndex
                        ) => (
                          <div
                            key={
                              slotIndex
                            }
                            className="flex justify-center"
                          >
                            {numero !==
                              null && (
                              <CasaMobile
                                numero={
                                  numero
                                }
                                jogadores={
                                  jogadores
                                }
                                totalCasas={
                                  totalCasas
                                }
                                posicaoAtual={
                                  posicaoAtual
                                }
                                corJogadorAtual={
                                  corJogadorAtual
                                }
                              />
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {linhaIndex <
                      linhas.length -
                        1 && (
                      <div
                        className={`absolute top-1/2 h-[82px] w-[58px] border-y-[42px] border-[#E6F0F8] ${
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
        </div>

        <div className="mt-11 rounded-2xl bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,.05)]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="mx-auto block h-3 w-3 rounded-full bg-[#3B82F6]" />

              <p className="mt-2 text-[9px] font-black text-slate-500">
                CONQUISTADO
              </p>
            </div>

            <div>
              <span
                className="mx-auto block h-3 w-3 rounded-full border-2 bg-white"
                style={{
                  borderColor:
                    corJogadorAtual,
                }}
              />

              <p className="mt-2 text-[9px] font-black text-slate-500">
                VOCÊ
              </p>
            </div>

            <div>
              <span className="mx-auto block h-3 w-3 rounded-full bg-[#EDF5FC]" />

              <p className="mt-2 text-[9px] font-black text-slate-500">
                A CONQUISTAR
              </p>
            </div>
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
  ] = useState<Jogador[]>([]);

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
    totalTarefas,
    setTotalTarefas,
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

  const [
    mensagemConvite,
    setMensagemConvite,
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
          carregarPartida(true);
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
          carregarPartida(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => {
          carregarPartida(true);
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
        participacoes[0].game_id
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
        data: submissoesDoJogador,
        error:
          erroSubmissoesDoJogador,
      },
    ] = await Promise.all([
      supabase
        .from("games")
        .select(
          "id, name, code, total_spaces"
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
        .select(
          "id, repeat_mode, repeat_days, available_from, available_until"
        )
        .eq(
          "game_id",
          gameId
        ),

      supabase
        .from("submissions")
        .select(
          "task_id, status, occurrence_date"
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

    const totalCasas =
      partidaData.total_spaces ||
      60;

    const partidaFormatada: Partida =
      {
        id: partidaData.id,
        nome:
          partidaData.name,
        codigo:
          partidaData.code,
        totalCasas,
      };

    const jogadoresDoBanco: Jogador[] =
      (
        jogadoresData || []
      ).map((item) => ({
        id: item.id,
        nome: item.name,
        cor:
          item.color ||
          "#3B82F6",
        posicao:
          limitarPosicao(
            item.position ?? 0,
            totalCasas
          ),
      }));

    const tarefasDoBanco =
      (
        tarefasData ||
        []
      ) as TarefaContador[];

    const submissoesDoBanco =
      (
        submissoesDoJogador ||
        []
      ) as SubmissaoJogador[];

    const agoraBrasil =
      obterAgoraBrasil();

    const quantidadeTarefasPendentes =
      tarefasDoBanco.filter(
        (tarefa) => {
          const modo =
            tarefa.repeat_mode ||
            "once";

          const programadaAgora =
            tarefaProgramadaAgora(
              tarefa,
              agoraBrasil.diaSemana,
              agoraBrasil.minutos
            );

          if (
            !programadaAgora
          ) {
            return false;
          }

          const submissaoAtual =
            submissoesDoBanco.find(
              (submissao) => {
                if (
                  submissao.task_id !==
                  tarefa.id
                ) {
                  return false;
                }

                if (
                  modo === "once"
                ) {
                  return (
                    submissao.occurrence_date ===
                      null
                  );
                }

                return (
                  submissao.occurrence_date ===
                  agoraBrasil.data
                );
              }
            );

          if (
            !submissaoAtual
          ) {
            return true;
          }

          return [
            "Pendente",
            "rejected",
            "Rejeitada",
          ].includes(
            submissaoAtual.status
          );
        }
      ).length;

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
        .in(
          "status",
          [
            "waiting",
            "Aguardando aprovação",
          ]
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

    setTotalTarefas(
      tarefasDoBanco.length
    );

    setTarefasPendentes(
      quantidadeTarefasPendentes
    );

    setAprovacoesPendentes(
      quantidadeAprovacoes
    );

    setCarregando(false);
  }

  async function copiarCodigo() {
    if (!partida?.codigo) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        partida.codigo
      );

      setMensagemConvite(
        "Código copiado!"
      );

      window.setTimeout(() => {
        setMensagemConvite("");
      }, 2500);
    } catch (error) {
      console.error(
        "Erro ao copiar código:",
        error
      );

      setMensagemConvite(
        "Não foi possível copiar o código."
      );
    }
  }

  async function compartilharConvite() {
    if (!partida?.codigo) {
      return;
    }

    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/partidas`
        : "";

    const texto =
      `Vem jogar DoToWin comigo!\n\n` +
      `Partida: ${partida.nome}\n` +
      `Código: ${partida.codigo}\n\n` +
      `Entre aqui: ${link}`;

    try {
      if (
        typeof navigator !==
          "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title:
            "Convite DoToWin",
          text: texto,
        });

        return;
      }

      await navigator.clipboard.writeText(
        texto
      );

      setMensagemConvite(
        "Convite copiado! Agora é só enviar."
      );

      window.setTimeout(() => {
        setMensagemConvite("");
      }, 3000);
    } catch (error) {
      console.error(
        "Erro ao compartilhar convite:",
        error
      );
    }
  }

  const totalCasas =
    partida?.totalCasas || 60;

  const ranking =
    [...jogadores].sort(
      (a, b) =>
        b.posicao -
        a.posicao
    );

  const jogadorAtual =
    jogadores.find(
      (jogador) =>
        jogador.id ===
        jogadorAtualId
    ) || null;

  const estaNaFrente =
    jogadorAtual &&
    jogadores.length > 1 &&
    jogadores.every(
      (jogador) =>
        jogador.id === jogadorAtual.id ||
        jogadorAtual.posicao >
          jogador.posicao
    );

  const posicaoAtual =
    jogadorAtual?.posicao ?? 0;

  const corJogadorAtual =
    jogadorAtual?.cor ||
    "#3B82F6";

  const temOponente =
    jogadores.length >= 2;

  const temTarefas =
    totalTarefas > 0;  return (
    <main className="min-h-screen bg-[#F5F8FC] pb-24 text-[#1F2937] lg:pb-0">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 lg:px-6">
        <header className="mb-5 flex items-center justify-between gap-3 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] lg:px-5">
          <div className="flex min-w-0 items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-slate-200 md:block" />

            <div className="hidden min-w-0 md:block">
              <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                PARTIDA
              </p>

              <p className="max-w-[300px] truncate text-sm font-black text-[#1F2937]">
                {partida?.nome ||
                  "Carregando..."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-2xl bg-[#F5F8FC] px-3 py-2 text-center">
              <p className="text-[8px] font-black tracking-[0.24em] text-slate-400">
                CÓDIGO
              </p>

              <p className="mt-0.5 text-xs font-black tracking-[0.28em] text-[#22C7D9]">
                {partida?.codigo ||
                  "-----"}
              </p>
            </div>

            <Link
              href="/"
              className="hidden rounded-2xl bg-[#F5F8FC] px-4 py-3 text-xs font-black text-slate-500 transition hover:bg-slate-100 sm:block"
            >
              Início
            </Link>

            <Link
              href="/partidas"
              className="hidden rounded-2xl bg-[#F1ECFF] px-4 py-3 text-xs font-black text-[#8B5CF6] transition hover:bg-[#E9DEFF] sm:block"
            >
              Partidas
            </Link>
          </div>
        </header>

        <div className="mb-4 md:hidden">
          <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
            PARTIDA
          </p>

          <p className="mt-1 truncate text-sm font-black">
            {partida?.nome ||
              "Carregando..."}
          </p>
        </div>

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        {carregando ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-[30px] bg-white shadow-[0_14px_42px_rgba(15,23,42,.06)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

              <p className="mt-3 text-sm font-bold text-slate-400">
                Montando a corrida...
              </p>
            </div>
          </div>
        ) : !temOponente ? (
          <section className="mx-auto max-w-[920px]">
            <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_16px_48px_rgba(15,23,42,.07)]">
              <div className="bg-[#F1ECFF] px-5 py-8 text-center sm:px-8 sm:py-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(139,92,246,.10)]">
                  <div className="flex items-end">
                    <Peao
                      cor={
                        jogadorAtual?.cor ||
                        "#38BDF8"
                      }
                    />

                    <div className="-ml-2 flex h-10 w-8 items-center justify-center rounded-full border-2 border-dashed border-[#C8B9F4] text-lg font-black text-[#8B5CF6]">
                      ?
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-[10px] font-black tracking-[0.24em] text-[#8B5CF6]">
                  SALA DE ESPERA
                </p>

                <h1 className="mx-auto mt-3 max-w-xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Falta um oponente para começar
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
                  Convide pelo menos mais uma pessoa para a partida. No DoToWin, outro jogador precisa validar suas tarefas antes de você avançar.
                </p>
              </div>

              <div className="p-5 sm:p-8">
                <div className="mx-auto max-w-2xl rounded-[26px] border-2 border-dashed border-[#CDECF0] bg-[#F8FBFE] p-5 text-center sm:p-6">
                  <p className="text-[9px] font-black tracking-[0.2em] text-slate-400">
                    CÓDIGO DA PARTIDA
                  </p>

                  <p className="mt-3 text-4xl font-black tracking-[0.24em] text-[#22C7D9] sm:text-5xl">
                    {partida?.codigo}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Envie este código para quem vai jogar com você.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={
                        copiarCodigo
                      }
                      className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#1594A3] shadow-[0_6px_18px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5"
                    >
                      Copiar código
                    </button>

                    <button
                      type="button"
                      onClick={
                        compartilharConvite
                      }
                      className="rounded-2xl bg-[#8B5CF6] px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,.16)] transition hover:-translate-y-0.5"
                    >
                      Compartilhar convite
                    </button>
                  </div>

                  {mensagemConvite && (
                    <div className="mt-4 rounded-2xl bg-[#EEFBEF] px-4 py-3 text-xs font-black text-[#25853D]">
                      {mensagemConvite}
                    </div>
                  )}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-[#EAF8FB] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black tracking-[0.18em] text-[#1594A3]">
                          JOGADORES
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {jogadores.length} de 2
                        </p>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-black text-[#22C7D9] shadow-sm">
                        {jogadores.length}
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      Você precisa de pelo menos 1 oponente para a validação funcionar.
                    </p>
                  </div>

                  <div
                    className={`rounded-[24px] p-5 ${
                      temTarefas
                        ? "bg-[#EEFBEF]"
                        : "bg-[#FFF8E7]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p
                          className={`text-[9px] font-black tracking-[0.18em] ${
                            temTarefas
                              ? "text-[#25853D]"
                              : "text-[#B87C00]"
                          }`}
                        >
                          TAREFAS
                        </p>

                        <p className="mt-2 text-2xl font-black">
                          {totalTarefas}
                        </p>
                      </div>

                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-black shadow-sm ${
                          temTarefas
                            ? "text-[#22C55E]"
                            : "text-[#F4B942]"
                        }`}
                      >
                        {temTarefas
                          ? "✓"
                          : "!"}
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      {temTarefas
                        ? "As tarefas já estão preparadas para a corrida."
                        : "Você pode criar as tarefas enquanto espera seu oponente entrar."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/tarefas"
                    className="flex items-center justify-center rounded-2xl bg-[#22C7D9] px-7 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.17)] transition hover:-translate-y-0.5"
                  >
                    {temTarefas
                      ? "Ver tarefas"
                      : "+ Criar tarefas"}
                  </Link>

                  <Link
                    href="/partidas"
                    className="flex items-center justify-center rounded-2xl bg-[#F5F8FC] px-7 py-4 text-sm font-black text-slate-500 transition hover:bg-slate-100"
                  >
                    Voltar às partidas
                  </Link>
                </div>

                <div className="mt-7 flex items-center justify-center gap-3 rounded-[22px] bg-[#F8FBFE] p-4">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C7D9]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#8B5CF6]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
                  </div>

                  <p className="text-xs font-bold text-slate-400">
                    Aguardando outro jogador entrar...
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : !temTarefas ? (
          <section className="mx-auto max-w-[820px]">
            <div className="rounded-[32px] bg-white p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,.07)] sm:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF8E7] text-3xl font-black text-[#D89900]">
                +
              </div>

              <p className="mt-6 text-[10px] font-black tracking-[0.22em] text-[#22C7D9]">
                OPONENTE PRONTO
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Agora só faltam as tarefas
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
                Já existem {jogadores.length} jogadores na partida. Crie pelo menos uma tarefa para colocar a corrida em movimento.
              </p>

              <div className="mx-auto mt-7 flex max-w-md -space-x-3 justify-center">
                {jogadores.map(
                  (jogador) => (
                    <div
                      key={
                        jogador.id
                      }
                      className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#F8FBFE] shadow-sm"
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

              <Link
                href="/tarefas"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#22C7D9] px-8 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.17)] transition hover:-translate-y-0.5"
              >
                + Criar tarefas
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[225px_minmax(0,1fr)]">
            <aside className="hidden xl:block">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black tracking-[0.25em] text-slate-400">
                  JOGADORES
                </p>

                <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 shadow-sm">
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
                      Math.min(
                        100,
                        Math.round(
                          (jogador.posicao /
                            totalCasas) *
                            100
                        )
                      );

                    const souEu =
                      jogador.id ===
                      jogadorAtualId;

                    return (
                      <div
                        key={
                          jogador.id
                        }
                        className={`rounded-[22px] bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,.05)] ${
                          souEu
                            ? "ring-2 ring-[#22C7D9]/25"
                            : ""
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
                                <span className="rounded-full bg-[#FFF4CC] px-2 py-0.5 text-[8px] font-black text-[#C98A00]">
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

                              <span className="text-[10px] text-slate-400">
                                /{" "}
                                {
                                  totalCasas
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${progresso}%`,
                                backgroundColor:
                                  jogador.cor,
                              }}
                            />
                          </div>

                          <span className="text-[9px] font-bold text-slate-400">
                            {progresso}%
                          </span>
                        </div>

                        {souEu && (
                          <Link
                            href="/personalizar"
                            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#F5F8FC] px-3 py-2.5 text-[10px] font-black text-slate-500 transition hover:bg-[#EAF8FB] hover:text-[#1594A3]"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  jogador.cor,
                              }}
                            />

                            Trocar cor
                          </Link>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {estaNaFrente && (
                <div className="mt-4">
                  <img
                    src="/happy-iguana.png"
                    alt="Happy Iguana — você está na frente, continue assim!"
                    className="block h-auto w-full object-contain"
                  />
                </div>
              )}
            </aside>

            <section className="min-w-0">
              <div className="rounded-[30px] bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,.06)] sm:p-5 lg:p-6">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.25em] text-[#22C7D9]">
                      CORRIDA ATUAL
                    </p>

                    <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                      {totalCasas} casas até a vitória
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                      Cada tarefa aprovada faz você avançar exatamente uma casa.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:min-w-[380px]">
                    <Link
                      href="/tarefas"
                      className="rounded-[20px] bg-[#EAF8FB] p-4 transition hover:-translate-y-0.5"
                    >
                      <p className="text-[9px] font-black tracking-wider text-[#1594A3]">
                        SUAS TAREFAS
                      </p>

                      <p className="mt-2 text-2xl font-black text-[#1F2937]">
                        {tarefasPendentes}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        para concluir
                      </p>
                    </Link>

                    <Link
                      href="/aprovacoes"
                      className="rounded-[20px] bg-[#F1ECFF] p-4 transition hover:-translate-y-0.5"
                    >
                      <p className="text-[9px] font-black tracking-wider text-[#8B5CF6]">
                        APROVAÇÕES
                      </p>

                      <p className="mt-2 text-2xl font-black text-[#8B5CF6]">
                        {aprovacoesPendentes}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        aguardando você
                      </p>
                    </Link>
                  </div>
                </div>

                <TabuleiroDesktop
                  jogadores={jogadores}
                  totalCasas={totalCasas}
                  posicaoAtual={
                    posicaoAtual
                  }
                  corJogadorAtual={
                    corJogadorAtual
                  }
                />

                <TabuleiroMobile
                  jogadores={jogadores}
                  totalCasas={totalCasas}
                  posicaoAtual={
                    posicaoAtual
                  }
                  corJogadorAtual={
                    corJogadorAtual
                  }
                />

                <div className="mt-5 hidden gap-3 lg:grid lg:grid-cols-[1fr_1.45fr_1fr]">
                  <Link
                    href="/tarefas"
                    className="flex items-center justify-center rounded-2xl bg-[#F5F8FC] px-5 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    Minhas tarefas
                  </Link>

                  <Link
                    href="/tarefas"
                    className="flex items-center justify-center rounded-2xl bg-[#22C7D9] px-5 py-4 text-sm font-black tracking-wide text-white shadow-[0_10px_24px_rgba(34,199,217,.18)] transition hover:-translate-y-0.5"
                  >
                    + CONCLUIR TAREFA
                  </Link>

                  <Link
                    href="/aprovacoes"
                    className="flex items-center justify-center rounded-2xl bg-[#F1ECFF] px-5 py-4 text-sm font-black text-[#8B5CF6] transition hover:bg-[#E9DEFF]"
                  >
                    Aprovações ·{" "}
                    {aprovacoesPendentes}
                  </Link>
                </div>
              </div>

              <div className="mt-4 xl:hidden">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {ranking.map(
                    (
                      jogador,
                      index
                    ) => {
                      const souEu =
                        jogador.id ===
                        jogadorAtualId;

                      return (
                        <div
                          key={
                            jogador.id
                          }
                          className={`min-w-[165px] rounded-2xl bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,.05)] ${
                            souEu
                              ? "ring-2 ring-[#22C7D9]/20"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
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
                                  totalCasas
                                }
                              </p>

                              {index ===
                                0 && (
                                <p className="text-[8px] font-black text-[#C98A00]">
                                  LÍDER
                                </p>
                              )}
                            </div>
                          </div>

                          {souEu && (
                            <Link
                              href="/personalizar"
                              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#F5F8FC] px-2 py-2 text-[9px] font-black text-slate-500"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    jogador.cor,
                                }}
                              />

                              Trocar cor
                            </Link>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {estaNaFrente && (
                  <div className="mt-4 overflow-hidden rounded-[24px] bg-white shadow-[0_8px_26px_rgba(15,23,42,.05)]">
                    <img
                      src="/happy-iguana.png"
                      alt="Happy Iguana — você está na frente, continue assim!"
                      className="block h-auto w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[24px] bg-white p-2 shadow-[0_14px_38px_rgba(15,23,42,.14)] lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          <Link
            href="/jogo"
            className="flex flex-col items-center justify-center rounded-2xl bg-[#EAF8FB] px-2 py-2.5 text-[#1594A3]"
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
              <span className="absolute right-[18%] top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8B5CF6] px-1 text-[9px] font-black text-white">
                {aprovacoesPendentes}
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
            href="/"
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
            <span className="text-lg">
              ⌂
            </span>

            <span className="mt-1 text-[10px] font-bold">
              Início
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}