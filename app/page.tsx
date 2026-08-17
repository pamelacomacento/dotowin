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

const coresComuns = [
  "#2563eb",
  "#3b82f6",
  "#6366f1",
  "#7c3aed",
];

type Casa = {
  numero: number;
  x: number;
  y: number;
};

const coordenadasCasas: [number, number][] = [
  [110, 100],
  [175, 104],
  [240, 107],
  [305, 110],
  [370, 112],
  [435, 113],
  [500, 113],
  [565, 112],
  [630, 110],
  [695, 106],
  [760, 101],
  [820, 112],

  [855, 140],
  [870, 175],

  [825, 208],
  [760, 216],
  [695, 221],
  [630, 225],
  [565, 228],
  [500, 229],
  [435, 229],
  [370, 228],
  [305, 225],
  [240, 221],

  [175, 215],
  [125, 232],
  [98, 262],
  [92, 298],

  [135, 326],
  [200, 334],
  [265, 339],
  [330, 343],
  [395, 346],
  [460, 347],
  [525, 347],
  [590, 345],
  [655, 342],
  [720, 337],
  [785, 330],

  [835, 343],
  [865, 370],
  [875, 405],
  [860, 438],

  [815, 462],
  [750, 469],
  [685, 474],
  [620, 478],
  [555, 480],
  [490, 481],
  [425, 481],
  [360, 479],
  [295, 475],
  [230, 470],

  [165, 463],
  [120, 475],
  [95, 503],

  [120, 530],
  [185, 535],
  [250, 539],
  [315, 542],
];

const casas: Casa[] = coordenadasCasas.map(([x, y], index) => ({
  numero: index + 1,
  x,
  y,
}));

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
        pequeno ? "h-9 w-7" : "h-12 w-9"
      }`}
    >
      <div
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg"
        style={{
          backgroundColor: cor,
          opacity: 0.45,
        }}
      />

      <div
        className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-full border border-white/30 ${
          pequeno ? "h-4 w-4" : "h-5 w-5"
        }`}
        style={{
          background: `radial-gradient(circle at 35% 25%, #fff 0%, ${cor} 30%, ${cor} 68%, #111827 145%)`,
          boxShadow: `0 0 10px ${cor}`,
        }}
      />

      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-t-full ${
          pequeno
            ? "bottom-[5px] h-4 w-5"
            : "bottom-[5px] h-5 w-7"
        }`}
        style={{
          background: `linear-gradient(180deg, ${cor}, #111827 150%)`,
        }}
      />

      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full ${
          pequeno ? "h-2 w-7" : "h-2.5 w-9"
        }`}
        style={{
          background: `linear-gradient(180deg, ${cor}, #111827)`,
        }}
      />
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [partida, setPartida] = useState<Partida | null>(null);

  const [tarefasPendentes, setTarefasPendentes] = useState(0);
  const [aprovacoesPendentes, setAprovacoesPendentes] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    carregarPartida();
  }, []);

  useEffect(() => {
    if (!partida?.id) return;

    const gameId = partida.id;

    console.log(
      "🟡 Preparando Realtime da partida:",
      gameId
    );

    const canal = supabase
      .channel(`dotowin-home-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log(
            "🟢 REALTIME PLAYERS:",
            payload
          );

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
        (payload) => {
          console.log(
            "🔵 REALTIME TASKS:",
            payload
          );

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
        (payload) => {
          console.log(
            "🟣 REALTIME SUBMISSIONS:",
            payload
          );

          carregarPartida(true);
        }
      )
      .subscribe((status, error) => {
        console.log(
          "📡 STATUS REALTIME:",
          status
        );

        if (error) {
          console.error(
            "❌ ERRO REALTIME:",
            error
          );
        }

        if (status === "SUBSCRIBED") {
          console.log(
            "✅ DOTOWIN CONECTADO AO REALTIME"
          );
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            "🚨 FALHA NA CONEXÃO REALTIME:",
            status,
            error
          );
        }
      });

    return () => {
      console.log(
        "🔌 Desconectando Realtime:",
        gameId
      );

      supabase.removeChannel(canal);
    };
  }, [partida?.id]);

  async function carregarPartida(silencioso = false) {
    if (!silencioso) {
      setCarregando(true);
    }

    setMensagemErro("");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.push("/login");
      return;
    }

    const { data: participacoes, error: erroParticipacoes } =
      await supabase
        .from("players")
        .select("id, game_id")
        .eq("profile_id", user.id);

    if (erroParticipacoes) {
      console.error(
        "Erro ao localizar partidas do jogador:",
        erroParticipacoes
      );

      setMensagemErro(
        "Não foi possível identificar suas partidas."
      );

      setCarregando(false);
      return;
    }

    if (!participacoes || participacoes.length === 0) {
      router.push("/partidas");
      return;
    }

    let gameId: number | null = null;

    const gameIdSalvo = localStorage.getItem(
      "dotowin_game_id"
    );

    if (gameIdSalvo) {
      const idConvertido = Number(gameIdSalvo);

      const pertenceAPartida = participacoes.some(
        (participacao) =>
          participacao.game_id === idConvertido
      );

      if (pertenceAPartida) {
        gameId = idConvertido;
      }
    }

    if (!gameId) {
      if (
        participacoes.length === 1 &&
        participacoes[0].game_id
      ) {
        gameId = participacoes[0].game_id;

        localStorage.setItem(
          "dotowin_game_id",
          String(gameId)
        );
      } else {
        localStorage.removeItem(
          "dotowin_game_id"
        );

        router.push("/partidas");
        return;
      }
    }

    const participacaoAtual = participacoes.find(
      (participacao) =>
        participacao.game_id === gameId
    );

    if (!participacaoAtual) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      router.push("/partidas");
      return;
    }

    const jogadorAtualId =
      participacaoAtual.id;

    const [
      { data: partidaData, error: erroPartida },
      { data: jogadoresData, error: erroJogadores },
      { data: tarefasData, error: erroTarefas },
      {
        data: submissoesDoJogador,
        error: erroSubmissoesDoJogador,
      },
    ] = await Promise.all([
      supabase
        .from("games")
        .select("id, name, code")
        .eq("id", gameId)
        .single(),

      supabase
        .from("players")
        .select("id, name, color, position, game_id")
        .eq("game_id", gameId)
        .order("position", {
          ascending: false,
        }),

      supabase
        .from("tasks")
        .select("id")
        .eq("game_id", gameId),

      supabase
        .from("submissions")
        .select("task_id, status")
        .eq("player_id", jogadorAtualId),
    ]);

    if (erroPartida || !partidaData) {
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
        "Não foi possível carregar as tarefas da partida."
      );

      setCarregando(false);
      return;
    }

    if (erroSubmissoesDoJogador) {
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

    const partidaFormatada: Partida = {
      id: partidaData.id,
      nome: partidaData.name,
      codigo: partidaData.code,
    };

    const jogadoresDoBanco: Jogador[] =
      (jogadoresData || []).map((item) => ({
        id: item.id,
        nome: item.name,
        cor: item.color || "#38bdf8",
        posicao: item.position || 1,
      }));

    const mapaSubmissoes = new Map<number, string>();

    (
      (submissoesDoJogador || []) as SubmissaoJogador[]
    ).forEach((submissao) => {
      mapaSubmissoes.set(
        submissao.task_id,
        submissao.status
      );
    });

    const quantidadeTarefasPendentes =
      (tarefasData || []).filter((tarefa) => {
        const status =
          mapaSubmissoes.get(tarefa.id);

        return !status || status === "Pendente";
      }).length;

    const idsOutrosJogadores =
      (jogadoresData || [])
        .filter(
          (jogador) =>
            jogador.id !== jogadorAtualId
        )
        .map((jogador) => jogador.id);

    let quantidadeAprovacoes = 0;

    if (idsOutrosJogadores.length > 0) {
      const {
        count,
        error: erroAprovacoes,
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

      if (erroAprovacoes) {
        console.error(
          "Erro ao contar aprovações:",
          erroAprovacoes
        );
      } else {
        quantidadeAprovacoes =
          count || 0;
      }
    }

    setPartida(partidaFormatada);
    setJogadores(jogadoresDoBanco);
    setTarefasPendentes(
      quantidadeTarefasPendentes
    );
    setAprovacoesPendentes(
      quantidadeAprovacoes
    );

    setCarregando(false);
  }

  const lider =
    jogadores.length > 0
      ? jogadores.reduce((a, b) =>
          a.posicao > b.posicao ? a : b
        )
      : null;

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="mx-auto max-w-[1600px] p-4">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

              <p className="mt-1 text-[10px] font-bold tracking-[0.32em] text-slate-500">
                DO. MOVE. WIN.
              </p>
            </div>

            <div className="hidden h-10 w-px bg-white/10 md:block" />

            <div className="hidden md:block">
              <p className="text-xs text-slate-500">
                PARTIDA
              </p>

              <p className="font-bold">
                {partida?.nome || "Carregando..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-right sm:block">
              <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500">
                CÓDIGO
              </p>

              <p className="font-black tracking-[0.25em] text-cyan-300">
                {partida?.codigo || "-----"}
              </p>
            </div>

            <Link
              href="/partidas"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold transition hover:bg-white/[0.08]"
            >
              Partidas
            </Link>
          </div>
        </header>

        {mensagemErro && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm font-bold text-red-300">
            {mensagemErro}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[205px_1fr]">
          <aside className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black tracking-[0.25em] text-slate-500">
                JOGADORES
              </p>

              <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] text-slate-400">
                {jogadores.length}
              </span>
            </div>

            {carregando && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#071329] p-4 text-center text-xs text-slate-500">
                Carregando partida...
              </div>
            )}

            {!carregando &&
              [...jogadores]
                .sort(
                  (a, b) =>
                    b.posicao - a.posicao
                )
                .map((jogador, index) => (
                  <div
                    key={jogador.id}
                    className={`rounded-2xl border p-3 transition ${
                      jogador.id === lider?.id
                        ? "border-amber-300/30 bg-amber-300/[0.05]"
                        : "border-white/[0.07] bg-[#071329]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Peao cor={jogador.cor} />

                        <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#101d35] text-[9px] font-black text-slate-300">
                          {index + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">
                            {jogador.nome}
                          </p>

                          {jogador.id === lider?.id && (
                            <span className="text-[8px] font-black tracking-wider text-amber-300">
                              LÍDER
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-baseline gap-1">
                          <span
                            className="text-xl font-black"
                            style={{
                              color: jogador.cor,
                            }}
                          >
                            {jogador.posicao}
                          </span>

                          <span className="text-[10px] text-slate-500">
                            / 60
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${
                            (jogador.posicao / 60) * 100
                          }%`,
                          backgroundColor:
                            jogador.cor,
                          boxShadow: `0 0 8px ${jogador.cor}`,
                        }}
                      />
                    </div>
                  </div>
                ))}

            <div className="mt-3 rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] to-cyan-400/[0.04] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/15 text-sm font-black text-lime-300">
                  H
                </div>

                <div>
                  <p className="text-xs font-black text-lime-300">
                    HAPPY
                  </p>

                  <p className="text-[9px] text-slate-500">
                    seu parceiro de progresso
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {lider
                  ? `${lider.nome} está na frente. Mas uma boa sequência muda o jogo rápido.`
                  : "A corrida começa assim que os jogadores entrarem na partida."}
              </p>
            </div>
          </aside>

          <section className="rounded-[30px] border border-cyan-300/10 bg-[#061329] p-4 shadow-[0_30px_100px_rgba(0,0,0,.45)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] text-cyan-400">
                  CORRIDA ATUAL
                </p>

                <h1 className="mt-1 text-xl font-black">
                  60 casas até a vitória
                </h1>
              </div>

              <div className="flex gap-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2">
                  <p className="text-[9px] text-slate-500">
                    SUAS TAREFAS
                  </p>

                  <p className="font-black">
                    {tarefasPendentes}{" "}
                    {tarefasPendentes === 1
                      ? "pendente"
                      : "pendentes"}
                  </p>
                </div>

                <div className="rounded-xl border border-orange-300/20 bg-orange-300/[0.05] px-3 py-2">
                  <p className="text-[9px] text-orange-300/70">
                    APROVAÇÕES
                  </p>

                  <p className="font-black text-orange-300">
                    {aprovacoesPendentes}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto h-[590px] max-w-[980px] overflow-hidden rounded-[25px] border border-white/[0.04] bg-[radial-gradient(circle_at_center,#071c3b_0%,#05142c_58%,#031023_100%)]">
              <svg
                className="pointer-events-none absolute inset-0"
                viewBox="0 0 980 590"
                preserveAspectRatio="none"
              >
                <path
                  d="
                    M 110 100
                    C 300 118, 600 120, 820 112
                    C 870 110, 890 145, 870 175
                    C 840 215, 620 240, 240 221
                    C 150 216, 95 245, 92 298
                    C 90 350, 170 360, 300 345
                    C 480 325, 720 335, 835 343
                    C 885 347, 895 400, 860 438
                    C 820 485, 590 495, 230 470
                    C 130 463, 90 485, 95 503
                    C 105 535, 300 555, 835 530
                  "
                  fill="none"
                  stroke="#0b1e3b"
                  strokeWidth="58"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="
                    M 110 100
                    C 300 118, 600 120, 820 112
                    C 870 110, 890 145, 870 175
                    C 840 215, 620 240, 240 221
                    C 150 216, 95 245, 92 298
                    C 90 350, 170 360, 300 345
                    C 480 325, 720 335, 835 343
                    C 885 347, 895 400, 860 438
                    C 820 485, 590 495, 230 470
                    C 130 463, 90 485, 95 503
                    C 105 535, 300 555, 835 530
                  "
                  fill="none"
                  stroke="rgba(255,255,255,.035)"
                  strokeWidth="38"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {casas.map((casa, index) => {
                const inicio =
                  casa.numero === 1;

                const chegada =
                  casa.numero === 60;

                const tipoEspecial =
                  casa.numero % 13 === 0
                    ? "!"
                    : casa.numero % 11 === 0
                    ? "+"
                    : casa.numero % 9 === 0
                    ? "★"
                    : casa.numero % 7 === 0
                    ? "?"
                    : null;

                const jogadoresNaCasa =
                  jogadores.filter(
                    (jogador) =>
                      jogador.posicao === casa.numero
                  );

                let corEspecial = "";

                if (casa.numero % 13 === 0) {
                  corEspecial = "#f97316";
                } else if (
                  casa.numero % 11 === 0
                ) {
                  corEspecial = "#ec4899";
                } else if (
                  casa.numero % 9 === 0
                ) {
                  corEspecial = "#eab308";
                } else if (
                  casa.numero % 7 === 0
                ) {
                  corEspecial = "#14b8a6";
                }

                return (
                  <div
                    key={casa.numero}
                    className="absolute flex items-center justify-center border font-black shadow-[inset_0_2px_0_rgba(255,255,255,.25),0_8px_18px_rgba(0,0,0,.35)]"
                    style={{
                      left: casa.x,
                      top: casa.y,
                      width:
                        inicio || chegada
                          ? 64
                          : 42,
                      height:
                        inicio || chegada
                          ? 64
                          : 42,
                      borderRadius:
                        "9999px",
                      transform:
                        "translate(-50%, -50%)",
                      borderColor:
                        inicio || chegada
                          ? "rgba(255,255,255,.35)"
                          : "rgba(255,255,255,.16)",
                      background:
                        inicio
                          ? "radial-gradient(circle at 35% 25%,#78dd8f,#28834a)"
                          : chegada
                          ? "radial-gradient(circle at 35% 25%,#ffd75a,#d89405)"
                          : tipoEspecial
                          ? `radial-gradient(circle at 35% 25%, ${corEspecial}, #172033 140%)`
                          : `radial-gradient(circle at 35% 25%, ${
                              coresComuns[
                                index %
                                  coresComuns.length
                              ]
                            }, #172033 140%)`,
                    }}
                  >
                    {inicio ? (
                      <span className="text-[8px] font-black">
                        START
                      </span>
                    ) : chegada ? (
                      <span className="text-center text-[8px] font-black text-[#281b00]">
                        🏆
                        <br />
                        WIN
                      </span>
                    ) : tipoEspecial ? (
                      <span className="text-sm">
                        {tipoEspecial}
                      </span>
                    ) : (
                      <span className="text-xs">
                        {casa.numero}
                      </span>
                    )}

                    {jogadoresNaCasa.length > 0 && (
                      <div className="absolute -top-8 left-1/2 z-30 flex -translate-x-1/2 items-end">
                        {jogadoresNaCasa.map(
                          (jogador, i) => (
                            <div
                              key={jogador.id}
                              className={
                                i > 0
                                  ? "-ml-2"
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
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.5fr_1fr]">
              <Link
                href="/tarefas"
                className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm font-bold transition hover:bg-white/[0.08]"
              >
                Minhas tarefas
              </Link>

              <Link
                href="/tarefas"
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-4 text-sm font-black tracking-wide shadow-[0_12px_35px_rgba(59,130,246,.25)] transition hover:scale-[1.01]"
              >
                CONCLUIR TAREFA
              </Link>

              <Link
                href="/aprovacoes"
                className="flex items-center justify-center rounded-xl border border-orange-300/20 bg-orange-300/[0.05] px-5 py-4 text-sm font-bold text-orange-200 transition hover:bg-orange-300/[0.1]"
              >
                Aprovações · {aprovacoesPendentes}
              </Link>
            </div>

            <div className="mt-3 flex justify-center">
              <button className="text-xs font-bold text-slate-500 transition hover:text-slate-300">
                Ver histórico da partida
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}