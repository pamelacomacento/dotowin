"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  posicao: number;
  avatar: string | null;
};

type Partida = {
  id: number;
  nome: string;
  codigo: string;
  totalCasas: number;
  premio: string | null;
  vencedorJogadorId: number | null;
  finalizadaEm: string | null;
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
  created_at: string;
};

type EventoJogo = {
  id: number;
  tipo: string;
  atorId: number | null;
  alvoId: number | null;
  tarefaId: number | null;
  posicao: number | null;
  criadoEm: string;
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
  avatar = null,
  pequeno = false,
}: {
  cor: string;
  avatar?: string | null;
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
        className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white ${
          pequeno
            ? "h-4 w-4"
            : "h-5 w-5"
        }`}
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      >
        {avatar && (
          <img
            src={avatar}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

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
              avatar={jogador.avatar}
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

  const [
    eventos,
    setEventos,
  ] = useState<EventoJogo[]>([]);

  const [
    aprovadasHoje,
    setAprovadasHoje,
  ] = useState(0);

  const [
    totalAprovadas,
    setTotalAprovadas,
  ] = useState(0);

  const [
    sequenciaDias,
    setSequenciaDias,
  ] = useState(0);

  const [
    mostrarAvanco,
    setMostrarAvanco,
  ] = useState(false);

  const posicaoAnteriorRef =
    useRef<number | null>(null);

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
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => {
          carregarPartida(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_events",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          carregarEventos(gameId as number);
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

  async function carregarEventos(
    gameId: number
  ) {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_game_events",
      {
        p_game_id: gameId,
      }
    );

    if (error) {
      console.error(
        "Erro ao carregar histórico:",
        error
      );
      return;
    }

    setEventos(
      (data || []).map(
        (item: {
          id: number;
          event_type: string;
          actor_player_id: number | null;
          target_player_id: number | null;
          task_id: number | null;
          position: number | null;
          created_at: string;
        }) => ({
          id: item.id,
          tipo: item.event_type,
          atorId: item.actor_player_id,
          alvoId: item.target_player_id,
          tarefaId: item.task_id,
          posicao: item.position,
          criadoEm: item.created_at,
        })
      )
    );
  }

  function dataBrasilDeIso(
    iso: string
  ) {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date(iso));
  }

  function calcularSequencia(
    datas: string[],
    hoje: string
  ) {
    const unicas = Array.from(
      new Set(datas)
    ).sort();

    if (!unicas.includes(hoje)) {
      return 0;
    }

    let sequencia = 0;
    let cursor = new Date(
      `${hoje}T12:00:00-03:00`
    );

    const conjunto =
      new Set(unicas);

    while (true) {
      const chave =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        ).format(cursor);

      if (!conjunto.has(chave)) {
        break;
      }

      sequencia += 1;

      cursor = new Date(
        cursor.getTime() -
          24 * 60 * 60 * 1000
      );
    }

    return sequencia;
  }

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

    carregarEventos(gameId);

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
          "id, name, code, total_spaces, prize, winner_player_id, finished_at"
        )
        .eq("id", gameId)
        .single(),

      supabase
        .from("players")
        .select(
          "id, name, color, position, game_id, avatar"
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
          "task_id, status, occurrence_date, created_at"
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
        premio:
          partidaData.prize ||
          null,
        vencedorJogadorId:
          partidaData.winner_player_id ||
          null,
        finalizadaEm:
          partidaData.finished_at ||
          null,
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
        avatar:
          item.avatar &&
          (
            item.avatar.startsWith(
              "http://"
            ) ||
            item.avatar.startsWith(
              "https://"
            )
          )
            ? item.avatar
            : null,
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

    const aprovadas =
      submissoesDoBanco.filter(
        (submissao) =>
          [
            "approved",
            "Aprovada",
          ].includes(
            submissao.status
          )
      );

    const datasAprovadas =
      aprovadas.map(
        (submissao) =>
          submissao.occurrence_date ||
          dataBrasilDeIso(
            submissao.created_at
          )
      );

    setTotalAprovadas(
      aprovadas.length
    );

    setAprovadasHoje(
      datasAprovadas.filter(
        (data) =>
          data ===
          agoraBrasil.data
      ).length
    );

    setSequenciaDias(
      calcularSequencia(
        datasAprovadas,
        agoraBrasil.data
      )
    );

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
        ? `${window.location.origin}/partidas?codigo=${encodeURIComponent(
            partida.codigo
          )}`
        : "";

    const texto =
      `Vem jogar DoToWin comigo!\n\n` +
      `Partida: ${partida.nome}\n` +
      `Código: ${partida.codigo}\n\n` +
      `Abra o link e entre direto na partida: ${link}`;

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
    totalTarefas > 0;

  const vencedor =
    partida?.vencedorJogadorId
      ? jogadores.find(
          (jogador) =>
            jogador.id ===
            partida.vencedorJogadorId
        ) || null
      : null;

  const partidaFinalizada =
    Boolean(
      partida?.vencedorJogadorId &&
        vencedor
    );

  const euVenci =
    Boolean(
      vencedor &&
        vencedor.id ===
          jogadorAtualId
    );

  function nomeJogadorPorId(
    id: number | null
  ) {
    if (!id) {
      return "Jogador";
    }

    return (
      jogadores.find(
        (jogador) =>
          jogador.id === id
      )?.nome || "Jogador"
    );
  }

  function textoEvento(
    evento: EventoJogo
  ) {
    const ator =
      nomeJogadorPorId(
        evento.atorId
      );

    const alvo =
      nomeJogadorPorId(
        evento.alvoId
      );

    if (
      evento.tipo ===
      "task_submitted"
    ) {
      return `${ator} enviou uma tarefa`;
    }

    if (
      evento.tipo ===
      "task_approved"
    ) {
      return `Tarefa de ${alvo} foi aprovada`;
    }

    if (
      evento.tipo ===
      "player_advanced"
    ) {
      return `${ator} avançou para a casa ${
        evento.posicao ?? "?"
      }`;
    }

    if (
      evento.tipo ===
      "game_won"
    ) {
      return `${ator} venceu a partida`;
    }

    return "Novo acontecimento na partida";
  }

  function horaEvento(
    data: string
  ) {
    try {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone:
            "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(data));
    } catch {
      return "";
    }
  }

  const melhorPosicao =
    Math.max(
      ...jogadores.map(
        (jogador) =>
          jogador.posicao
      ),
      0
    );

  const lideres =
    jogadores.filter(
      (jogador) =>
        jogador.posicao ===
        melhorPosicao
    );

  const estaEmpatadoNaLideranca =
    Boolean(
      jogadorAtual &&
        jogadorAtual.posicao ===
          melhorPosicao &&
        lideres.length > 1
    );

  const casasRestantes =
    Math.max(
      totalCasas -
        posicaoAtual,
      0
    );

  const posicaoRanking =
    jogadorAtual
      ? ranking.findIndex(
          (jogador) =>
            jogador.id ===
            jogadorAtual.id
        ) + 1
      : 0;

  const mensagemCorrida =
    estaNaFrente
      ? casasRestantes <= 3
        ? `Você está na frente. Faltam só ${casasRestantes} ${
            casasRestantes === 1
              ? "casa"
              : "casas"
          } para vencer.`
        : "Você assumiu a liderança da corrida."
      : estaEmpatadoNaLideranca
      ? "Empate na liderança. Qualquer aprovação pode virar o jogo."
      : casasRestantes <= 3
      ? `Faltam só ${casasRestantes} ${
          casasRestantes === 1
            ? "casa"
            : "casas"
        } para chegar ao fim.`
      : posicaoRanking > 1
      ? `Você está em ${posicaoRanking}º lugar. A corrida ainda está aberta.`
      : "A corrida está começando. Cada aprovação vale uma casa.";

  const conquistas = [
    {
      titulo:
        "Primeiro passo",
      descricao:
        "Conseguiu a primeira aprovação.",
      desbloqueada:
        totalAprovadas >= 1,
    },
    {
      titulo:
        "Em movimento",
      descricao:
        "Chegou a 5 aprovações.",
      desbloqueada:
        totalAprovadas >= 5,
    },
    {
      titulo:
        "Metade do caminho",
      descricao:
        "Chegou à metade da corrida.",
      desbloqueada:
        posicaoAtual >=
        Math.ceil(totalCasas / 2),
    },
    {
      titulo:
        "Sequência",
      descricao:
        "3 dias seguidos com aprovação.",
      desbloqueada:
        sequenciaDias >= 3,
    },
  ];

  useEffect(() => {
    if (
      carregando ||
      !jogadorAtual
    ) {
      return;
    }

    const anterior =
      posicaoAnteriorRef.current;

    if (
      anterior !== null &&
      posicaoAtual > anterior
    ) {
      setMostrarAvanco(true);

      const timer =
        window.setTimeout(() => {
          setMostrarAvanco(false);
        }, 1800);

      posicaoAnteriorRef.current =
        posicaoAtual;

      return () => {
        window.clearTimeout(
          timer
        );
      };
    }

    posicaoAnteriorRef.current =
      posicaoAtual;
  }, [
    posicaoAtual,
    carregando,
    jogadorAtual,
  ]);

  return (
    <main className="min-h-screen bg-[#F5F8FC] pb-24 text-[#1F2937] lg:pb-0">
      {mostrarAvanco && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
          <div className="animate-bounce rounded-[28px] bg-[#22C7D9] px-7 py-5 text-center text-white shadow-[0_18px_50px_rgba(34,199,217,.35)]">
            <p className="text-[10px] font-black tracking-[0.22em] text-white/80">
              TAREFA APROVADA
            </p>

            <p className="mt-1 text-4xl font-black">
              +1 CASA
            </p>
          </div>
        </div>
      )}

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

        {partida?.premio && (
          <section className="mb-5 overflow-hidden rounded-[24px] border border-[#E9DEFF] bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)]">
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1ECFF] text-xl font-black text-[#8B5CF6]">
                ★
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black tracking-[0.2em] text-[#8B5CF6]">
                  PRÊMIO EM DISPUTA
                </p>

                <p className="mt-1 break-words text-sm font-black leading-relaxed text-[#1F2937] sm:text-base">
                  {partida.premio}
                </p>
              </div>
            </div>
          </section>
        )}

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        {partidaFinalizada && vencedor ? (
          <section className="mx-auto max-w-[980px]">
            <div className="overflow-hidden rounded-[34px] bg-white shadow-[0_18px_54px_rgba(15,23,42,.08)]">
              <div className="relative overflow-hidden bg-[#F1ECFF] px-5 py-8 text-center sm:px-8 sm:py-10">
                <style jsx>{`
                  @keyframes happyDance {
                    0% {
                      transform: translateY(0) rotate(-6deg) scale(1);
                    }
                    15% {
                      transform: translateY(-12px) rotate(5deg) scale(1.02);
                    }
                    30% {
                      transform: translateY(-3px) rotate(-4deg) scale(0.99);
                    }
                    45% {
                      transform: translateY(-11px) rotate(6deg) scale(1.02);
                    }
                    60% {
                      transform: translateY(0) rotate(-5deg) scale(1);
                    }
                    75% {
                      transform: translateY(-9px) rotate(4deg) scale(1.01);
                    }
                    100% {
                      transform: translateY(0) rotate(-6deg) scale(1);
                    }
                  }

                  @keyframes happyEntrance {
                    0% {
                      transform: translateY(28px) scale(0.78);
                      opacity: 0;
                    }
                    60% {
                      transform: translateY(-8px) scale(1.06);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(0) scale(1);
                      opacity: 1;
                    }
                  }

                  @keyframes happyGlow {
                    0%,
                    100% {
                      transform: scale(0.9);
                      opacity: 0.28;
                    }
                    50% {
                      transform: scale(1.12);
                      opacity: 0.6;
                    }
                  }

                  @keyframes sparklePulse {
                    0%,
                    100% {
                      transform: scale(0.8) rotate(0deg);
                      opacity: 0.4;
                    }
                    50% {
                      transform: scale(1.18) rotate(12deg);
                      opacity: 1;
                    }
                  }

                  .happy-wrap {
                    animation: happyEntrance 0.65s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
                  }

                  .happy-dance {
                    animation: happyDance 0.95s ease-in-out 0.65s infinite;
                    transform-origin: 50% 72%;
                    will-change: transform;
                  }

                  .happy-glow {
                    animation: happyGlow 1.15s ease-in-out infinite;
                  }

                  .happy-sparkle {
                    animation: sparklePulse 0.9s ease-in-out infinite;
                  }

                  .happy-sparkle.delay-1 {
                    animation-delay: 0.18s;
                  }

                  .happy-sparkle.delay-2 {
                    animation-delay: 0.36s;
                  }

                  @media (prefers-reduced-motion: reduce) {
                    .happy-dance,
                    .happy-glow {
                      animation: none;
                    }
                  }
                `}</style>

                <div className="pointer-events-none absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full bg-white/70 blur-3xl happy-glow" />

                <div className="pointer-events-none absolute left-[27%] top-20 text-2xl text-[#F4B942] happy-sparkle">
                  ✦
                </div>

                <div className="pointer-events-none absolute right-[28%] top-24 text-xl text-[#22C7D9] happy-sparkle delay-1">
                  ✦
                </div>

                <div className="pointer-events-none absolute right-[34%] top-44 text-lg text-[#8B5CF6] happy-sparkle delay-2">
                  ✦
                </div>

                <div className="happy-wrap relative mx-auto flex max-w-[290px] justify-center">
                  <img
                    src="/happy-iguana-vitoria.png"
                    alt="Happy Iguana comemorando"
                    className="happy-dance h-auto w-full object-contain"
                  />
                </div>

                <p className="mt-4 text-[10px] font-black tracking-[0.24em] text-[#8B5CF6]">
                  FIM DE JOGO
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-0.05em] text-[#1F2937] sm:text-5xl">
                  {euVenci
                    ? "VOCÊ VENCEU!"
                    : `${vencedor.nome} venceu!`}
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
                  {euVenci
                    ? `Você chegou primeiro ao fim da corrida ${partida?.nome || ""}.`
                    : `${vencedor.nome} foi a primeira pessoa a chegar ao fim da corrida.`}
                </p>
              </div>

              <div className="p-5 sm:p-8">
                <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
                  <div className="rounded-[26px] bg-[#F8FBFE] p-5">
                    <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                      CAMPEÃO
                    </p>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                        <Peao
                          cor={vencedor.cor}
                          avatar={vencedor.avatar}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xl font-black text-[#1F2937]">
                          {vencedor.nome}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {totalCasas} de {totalCasas} casas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-[#EAF8FB] p-5">
                    <p className="text-[9px] font-black tracking-[0.18em] text-[#1594A3]">
                      RESULTADO
                    </p>

                    <p className="mt-3 text-3xl font-black text-[#22C7D9]">
                      {totalCasas} / {totalCasas}
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      A primeira pessoa a completar a corrida fica registrada como vencedora.
                    </p>
                  </div>
                </div>

                {partida?.premio && (
                  <div className="mx-auto mt-5 max-w-3xl rounded-[28px] border-2 border-[#E1D5FF] bg-[#F7F4FF] p-5 text-center sm:p-7">
                    <p className="text-[10px] font-black tracking-[0.22em] text-[#8B5CF6]">
                      PRÊMIO DA VITÓRIA
                    </p>

                    <p className="mx-auto mt-3 max-w-2xl break-words text-2xl font-black leading-tight text-[#1F2937] sm:text-3xl">
                      {partida.premio}
                    </p>
                  </div>
                )}

                <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/partidas"
                    className="flex items-center justify-center rounded-2xl bg-[#8B5CF6] px-7 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,.17)] transition hover:-translate-y-0.5"
                  >
                    Voltar às partidas
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : carregando ? (
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
                      avatar={
                        jogadorAtual?.avatar ||
                        null
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
                        avatar={
                          jogador.avatar
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
          <>
            <section className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.05)] sm:p-6">
                <p className="text-[9px] font-black tracking-[0.2em] text-[#8B5CF6]">
                  COMO ESTÁ A CORRIDA
                </p>

                <p className="mt-2 text-lg font-black leading-snug text-[#1F2937]">
                  {mensagemCorrida}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] bg-[#F8FBFE] p-3 text-center">
                    <p className="text-[8px] font-black tracking-[0.15em] text-slate-400">
                      POSIÇÃO
                    </p>
                    <p className="mt-1 text-xl font-black text-[#22C7D9]">
                      {posicaoRanking || "-"}º
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#F8FBFE] p-3 text-center">
                    <p className="text-[8px] font-black tracking-[0.15em] text-slate-400">
                      FALTAM
                    </p>
                    <p className="mt-1 text-xl font-black text-[#8B5CF6]">
                      {casasRestantes}
                    </p>
                  </div>

                  <div className="rounded-[20px] bg-[#F8FBFE] p-3 text-center">
                    <p className="text-[8px] font-black tracking-[0.15em] text-slate-400">
                      SEQUÊNCIA
                    </p>
                    <p className="mt-1 text-xl font-black text-[#22C55E]">
                      {sequenciaDias}d
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-[#EAF8FB] p-5 sm:p-6">
                <p className="text-[9px] font-black tracking-[0.2em] text-[#1594A3]">
                  RESUMO DE HOJE
                </p>

                <p className="mt-2 text-3xl font-black text-[#22C7D9]">
                  {aprovadasHoje}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  {aprovadasHoje === 1
                    ? "tarefa aprovada hoje"
                    : "tarefas aprovadas hoje"}
                </p>

                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Você está na casa {posicaoAtual} de {totalCasas} e tem {tarefasPendentes} tarefa{tarefasPendentes === 1 ? "" : "s"} disponível{tarefasPendentes === 1 ? "" : "is"} agora.
                </p>
              </div>
            </section>

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
                            avatar={
                              jogador.avatar
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
              {eventos.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black tracking-[0.22em] text-slate-400">
                      ÚLTIMOS ACONTECIMENTOS
                    </p>

                    <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 shadow-sm">
                      {Math.min(eventos.length, 4)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {eventos
                      .slice(0, 4)
                      .map((evento) => (
                        <div
                          key={evento.id}
                          className="rounded-[20px] border border-[#EDF2F7] bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,.04)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8FBFE] text-xs font-black text-[#8B5CF6]">
                              {evento.tipo ===
                              "game_won"
                                ? "★"
                                : evento.tipo ===
                                  "player_advanced"
                                ? "↑"
                                : evento.tipo ===
                                  "task_approved"
                                ? "✓"
                                : "•"}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-black leading-snug text-[#1F2937]">
                                {textoEvento(
                                  evento
                                )}
                              </p>

                              <p className="mt-1 text-[9px] font-bold text-slate-400">
                                {horaEvento(
                                  evento.criadoEm
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
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
                              avatar={
                                jogador.avatar
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
            <section className="mt-5 mb-5 rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.05)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black tracking-[0.2em] text-[#F4B942]">
                    CONQUISTAS
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-400">
                    Marcos pessoais sem dar vantagem na corrida.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {conquistas.map(
                  (conquista) => (
                    <div
                      key={
                        conquista.titulo
                      }
                      className={`rounded-[22px] border p-4 ${
                        conquista.desbloqueada
                          ? "border-[#F5D879] bg-[#FFF8E7]"
                          : "border-[#EDF2F7] bg-[#F8FBFE] opacity-55"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                            conquista.desbloqueada
                              ? "bg-white text-[#D89900]"
                              : "bg-white text-slate-300"
                          }`}
                        >
                          {conquista.desbloqueada
                            ? "★"
                            : "○"}
                        </div>

                        <div>
                          <p className="text-sm font-black text-[#1F2937]">
                            {conquista.titulo}
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            {conquista.descricao}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

          </>
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