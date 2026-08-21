"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JogadorAtual = {
  id: number;
  nome: string;
  cor: string;
  avatar: string | null;
  gameId: number;
};

type Submissao = {
  id: number;
  taskId: number;
  playerId: number;
  status: string;
  photoUrl: string | null;
  createdAt: string;
  tarefaTitulo: string;
  tarefaCategoria: string;
  jogadorNome: string;
  jogadorCor: string;
  jogadorAvatar: string | null;
};

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

function PeaoMini({
  cor,
  avatar,
}: {
  cor: string;
  avatar?: string | null;
}) {
  return (
    <div className="relative h-11 w-9 shrink-0">
      <div
        className="absolute left-1/2 top-0 z-10 h-5 w-5 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white"
        style={{
          backgroundColor: cor,
          boxShadow: "0 3px 8px rgba(15,23,42,.12)",
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
        className="absolute bottom-[6px] left-1/2 h-4 w-6 -translate-x-1/2 rounded-t-full border-x-2 border-white"
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className="absolute bottom-0 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full border-2 border-white"
        style={{
          backgroundColor: cor,
          boxShadow: "0 3px 8px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

function formatarHorarioEnvio(createdAt: string) {
  const data = new Date(createdAt);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const agora = new Date();

  const dataBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);

  const hojeBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);

  const horaBrasil = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(data);

  if (dataBrasil === hojeBrasil) {
    return `Enviada hoje às ${horaBrasil}`;
  }

  const diaBrasil = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(data);

  return `Enviada em ${diaBrasil} às ${horaBrasil}`;
}

function imagemVeioDaGaleria(
  photoUrl: string | null
) {
  return Boolean(
    photoUrl?.includes(
      "/gallery-task-"
    )
  );
}

export default function AprovacoesPage() {
  const router = useRouter();

  const [jogadorAtual, setJogadorAtual] =
    useState<JogadorAtual | null>(null);

  const [submissoes, setSubmissoes] =
    useState<Submissao[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [processandoId, setProcessandoId] =
    useState<number | null>(null);

  const [mensagemErro, setMensagemErro] =
    useState("");

  const [
    modoAprovacao,
    setModoAprovacao,
  ] = useState<"all" | "admin_only">("all");

  useEffect(() => {
    carregarAprovacoes();
  }, []);

  useEffect(() => {
    if (!jogadorAtual?.gameId) {
      return;
    }

    const gameId = jogadorAtual.gameId;

    const canal = supabase
      .channel(
        `dotowin-aprovacoes-${gameId}-${jogadorAtual.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => {
          carregarAprovacoes(true);
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
          carregarAprovacoes(true);
        }
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
          carregarAprovacoes(true);
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
          carregarAprovacoes(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [
    jogadorAtual?.gameId,
    jogadorAtual?.id,
  ]);

  async function carregarAprovacoes(
    silencioso = false
  ) {
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

    const {
      data: jogadorData,
      error: erroJogador,
    } = await supabase
      .from("players")
      .select(
        "id, name, color, avatar, profile_id, game_id"
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "game_id",
        gameId
      )
      .maybeSingle();

    if (erroJogador) {
      console.error(
        "Erro ao localizar jogador:",
        erroJogador
      );

      setMensagemErro(
        "Não foi possível identificar seu jogador."
      );

      setCarregando(false);
      return;
    }

    if (!jogadorData) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      setMensagemErro(
        "Você não pertence a esta partida. Volte para selecionar outra."
      );

      setCarregando(false);
      return;
    }

    const jogadorFormatado: JogadorAtual =
      {
        id: jogadorData.id,
        nome: jogadorData.name,
        cor:
          jogadorData.color ||
          "#38BDF8",
        avatar:
          jogadorData.avatar ||
          null,
        gameId:
          jogadorData.game_id,
      };

    setJogadorAtual(
      jogadorFormatado
    );

    const {
      data: partidaData,
      error: erroPartida,
    } = await supabase
      .from("games")
      .select(
        "admin_profile_id, approval_mode, admin_approver_player_id"
      )
      .eq(
        "id",
        jogadorFormatado.gameId
      )
      .single();

    if (
      erroPartida ||
      !partidaData
    ) {
      console.error(
        "Erro ao carregar regra de aprovação:",
        erroPartida
      );

      setMensagemErro(
        "Não foi possível carregar a regra de aprovação da partida."
      );

      setCarregando(false);
      return;
    }

    const modo =
      partidaData.approval_mode ===
      "admin_only"
        ? "admin_only"
        : "all";

    setModoAprovacao(modo);

    const {
      data: playersDaPartida,
      error: erroPlayersDaPartida,
    } = await supabase
      .from("players")
      .select(
        "id, name, color, avatar, profile_id"
      )
      .eq(
        "game_id",
        jogadorFormatado.gameId
      );

    if (erroPlayersDaPartida) {
      console.error(
        "Erro ao carregar jogadores da partida:",
        erroPlayersDaPartida
      );

      setMensagemErro(
        "Não foi possível carregar os jogadores da partida."
      );

      setCarregando(false);
      return;
    }

    const jogadoresPartida =
      playersDaPartida || [];

    const adminPlayer =
      jogadoresPartida.find(
        (player) =>
          player.profile_id ===
          partidaData.admin_profile_id
      ) || null;

    let idsQuePossoAprovar: number[] =
      [];

    if (modo === "admin_only") {
      if (
        adminPlayer &&
        jogadorFormatado.id ===
          adminPlayer.id
      ) {
        idsQuePossoAprovar =
          jogadoresPartida
            .filter(
              (player) =>
                player.id !==
                adminPlayer.id
            )
            .map(
              (player) =>
                player.id
            );
      } else if (
        adminPlayer &&
        partidaData.admin_approver_player_id ===
          jogadorFormatado.id
      ) {
        idsQuePossoAprovar = [
          adminPlayer.id,
        ];
      }
    } else {
      idsQuePossoAprovar =
        jogadoresPartida
          .filter(
            (player) =>
              player.id !==
              jogadorFormatado.id
          )
          .map(
            (player) =>
              player.id
          );
    }

    if (
      idsQuePossoAprovar.length ===
      0
    ) {
      setSubmissoes([]);
      setCarregando(false);
      return;
    }

    const {
      data: submissionsData,
      error: erroSubmissions,
    } = await supabase
      .from("submissions")
      .select(
        "id, task_id, player_id, status, photo_url, created_at, occurrence_date"
      )
      .in(
        "status",
        [
          "waiting",
          "Aguardando aprovação",
        ]
      )
      .in(
        "player_id",
        idsQuePossoAprovar
      )
      .neq(
        "player_id",
        jogadorFormatado.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (erroSubmissions) {
      console.error(
        "Erro ao carregar submissions:",
        erroSubmissions
      );

      setMensagemErro(
        "Não foi possível carregar as aprovações."
      );

      setCarregando(false);
      return;
    }

    const submissionsFiltradas =
      (
        submissionsData || []
      ).filter(
        (submission) =>
          submission.player_id !==
          jogadorFormatado.id
      );

    if (
      submissionsFiltradas.length ===
      0
    ) {
      setSubmissoes([]);
      setCarregando(false);
      return;
    }

    const taskIds = [
      ...new Set(
        submissionsFiltradas.map(
          (item) =>
            item.task_id
        )
      ),
    ];

    const {
      data: tasksData,
      error: erroTasks,
    } = await supabase
      .from("tasks")
      .select(
        "id, title, category, game_id, repeat_mode"
      )
      .in(
        "id",
        taskIds
      )
      .eq(
        "game_id",
        jogadorFormatado.gameId
      );

    if (erroTasks) {
      console.error(
        "Erro ao carregar tarefas:",
        erroTasks
      );

      setMensagemErro(
        "Não foi possível carregar as tarefas das aprovações."
      );

      setCarregando(false);
      return;
    }

    const tarefasValidas =
      new Set(
        (
          tasksData || []
        ).map(
          (task) =>
            task.id
        )
      );

    const lista: Submissao[] =
      submissionsFiltradas
        .filter(
          (submission) =>
            submission.player_id !==
              jogadorFormatado.id &&
            tarefasValidas.has(
              submission.task_id
            )
        )
        .map(
          (submission) => {
            const tarefa =
              (
                tasksData || []
              ).find(
                (item) =>
                  item.id ===
                  submission.task_id
              );

            const jogador =
              (
                playersDaPartida || []
              ).find(
                (item) =>
                  item.id ===
                  submission.player_id
              );

            return {
              id:
                submission.id,

              taskId:
                submission.task_id,

              playerId:
                submission.player_id,

              status:
                submission.status,

              photoUrl:
                submission.photo_url ||
                null,

              createdAt:
                submission.created_at,

              tarefaTitulo:
                tarefa?.title ||
                "Tarefa",

              tarefaCategoria:
                tarefa?.category ||
                "Geral",

              jogadorNome:
                jogador?.name ||
                "Jogador",

              jogadorCor:
                jogador?.color ||
                "#38BDF8",

              jogadorAvatar:
                jogador?.avatar ||
                null,
            };
          }
        );

    setSubmissoes(lista);
    setCarregando(false);
  }

  async function aprovarSubmissao(
    submissao: Submissao
  ) {
    if (!jogadorAtual) {
      setMensagemErro(
        "Não foi possível identificar quem está aprovando."
      );

      return;
    }

    if (
      submissao.playerId ===
      jogadorAtual.id
    ) {
      setMensagemErro(
        "Você não pode aprovar a própria tarefa."
      );

      return;
    }

    setProcessandoId(
      submissao.id
    );

    setMensagemErro("");

    const { error } =
      await supabase.rpc(
        "approve_submission_controlled",
        {
          p_submission_id:
            submissao.id,
        }
      );

    if (error) {
      console.error(
        "Erro ao aprovar submissão:",
        error
      );

      let mensagem =
        "Não foi possível aprovar esta tarefa.";

      const erroTexto =
        `${error.message || ""} ${
          error.details || ""
        }`.toLowerCase();

      if (
        erroTexto.includes(
          "cannot approve your own"
        ) ||
        erroTexto.includes(
          "players cannot approve their own submission"
        )
      ) {
        mensagem =
          "Você não pode aprovar a própria tarefa.";
      } else if (
        erroTexto.includes(
          "not awaiting approval"
        )
      ) {
        mensagem =
          "Essa tarefa já foi processada por outro jogador.";
      } else if (
        erroTexto.includes(
          "not a player in this game"
        ) ||
        erroTexto.includes(
          "approver is not in this game"
        )
      ) {
        mensagem =
          "Você não pertence à partida desta tarefa.";
      }

      setMensagemErro(
        mensagem
      );

      setProcessandoId(
        null
      );

      return;
    }

    setSubmissoes(
      (atuais) =>
        atuais.filter(
          (item) =>
            item.id !==
            submissao.id
        )
    );

    setProcessandoId(
      null
    );
  }

  async function recusarSubmissao(
    submissao: Submissao
  ) {
    if (!jogadorAtual) {
      setMensagemErro(
        "Não foi possível identificar quem está recusando."
      );

      return;
    }

    if (
      submissao.playerId ===
      jogadorAtual.id
    ) {
      setMensagemErro(
        "Você não pode recusar a própria tarefa."
      );

      return;
    }

    setProcessandoId(
      submissao.id
    );

    setMensagemErro("");

    const { error } =
      await supabase.rpc(
        "reject_submission_controlled",
        {
          p_submission_id:
            submissao.id,
        }
      );

    if (error) {
      console.error(
        "Erro ao recusar submissão:",
        error
      );

      let mensagem =
        "Não foi possível recusar esta tarefa.";

      const erroTexto =
        `${error.message || ""} ${
          error.details || ""
        }`.toLowerCase();

      if (
        erroTexto.includes(
          "cannot reject your own"
        ) ||
        erroTexto.includes(
          "players cannot reject their own submission"
        )
      ) {
        mensagem =
          "Você não pode recusar a própria tarefa.";
      } else if (
        erroTexto.includes(
          "not awaiting approval"
        )
      ) {
        mensagem =
          "Essa tarefa já foi processada por outro jogador.";
      } else if (
        erroTexto.includes(
          "not a player in this game"
        ) ||
        erroTexto.includes(
          "reviewer is not in this game"
        )
      ) {
        mensagem =
          "Você não pertence à partida desta tarefa.";
      }

      setMensagemErro(
        mensagem
      );

      setProcessandoId(
        null
      );

      return;
    }

    setSubmissoes(
      (atuais) =>
        atuais.filter(
          (item) =>
            item.id !==
            submissao.id
        )
    );

    setProcessandoId(
      null
    );
  }

  async function sair() {
    await supabase.auth.signOut();

    localStorage.removeItem(
      "dotowin_game_id"
    );

    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] pb-24 text-[#1F2937] lg:pb-10">
      <div className="mx-auto max-w-[1050px] px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:mb-7 sm:px-5">
          <div className="flex items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-slate-200 sm:block" />

            <Link
              href="/jogo"
              className="hidden items-center justify-center rounded-2xl bg-[#EAF8FB] px-5 py-3.5 text-sm font-black text-[#1594A3] transition hover:-translate-y-0.5 hover:bg-[#DDF5F8] sm:inline-flex"
            >
              ← Voltar para o jogo
            </Link>
          </div>

          {jogadorAtual && (
            <div className="flex items-center gap-3 rounded-2xl bg-[#F8FBFE] px-3 py-2">
              <PeaoMini
                cor={
                  jogadorAtual.cor
                }
                avatar={
                  jogadorAtual.avatar
                }
              />

              <div className="hidden md:block">
                <p className="max-w-[150px] truncate text-xs font-black">
                  {jogadorAtual.nome}
                </p>

                <p className="text-[9px] font-bold text-slate-400">
                  Aprovando
                </p>
              </div>

              <button
                onClick={sair}
                className="ml-1 rounded-xl px-3 py-2 text-[10px] font-black text-slate-400 transition hover:bg-white hover:text-red-500"
              >
                Sair
              </button>
            </div>
          )}
        </header>

        <Link
          href="/jogo"
          className="mb-6 flex w-full items-center justify-center rounded-2xl bg-[#EAF8FB] px-5 py-4 text-sm font-black text-[#1594A3] shadow-[0_6px_18px_rgba(34,199,217,.08)] transition active:scale-[0.99] sm:hidden"
        >
          ← Voltar para o jogo
        </Link>

        <section className="mb-7">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#8B5CF6]">
            APROVAÇÕES
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Sua decisão move a corrida
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Confira as fotos dos outros jogadores. Se a comprovação corresponder à tarefa, aprove para liberar +1 casa.
          </p>
        </section>

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        {jogadorAtual && (
          <section className="mb-6 flex flex-col gap-4 rounded-[24px] bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,.05)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#F8FBFE] p-2">
                <PeaoMini
                  cor={
                    jogadorAtual.cor
                  }
                  avatar={
                    jogadorAtual.avatar
                  }
                />
              </div>

              <div>
                <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                  APROVANDO COMO
                </p>

                <p className="mt-1 font-black">
                  {jogadorAtual.nome}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F1ECFF] px-4 py-3">
              <p className="text-[9px] font-black tracking-[0.14em] text-[#8B5CF6]">
                AGUARDANDO VOCÊ
              </p>

              <p className="mt-1 text-2xl font-black text-[#8B5CF6]">
                {submissoes.length}
              </p>
            </div>
          </section>
        )}

        {carregando && (
          <div className="flex min-h-[260px] items-center justify-center rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,.05)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#8B5CF6]" />

              <p className="mt-3 text-sm font-bold text-slate-400">
                Carregando aprovações...
              </p>
            </div>
          </div>
        )}

        {!carregando &&
          submissoes.length === 0 && (
            <div className="rounded-[30px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,.05)] sm:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EEFBEF]">
                <span className="text-3xl font-black text-[#22A447]">
                  ✓
                </span>
              </div>

              <h2 className="mt-5 text-xl font-black">
                Tudo em dia
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Nenhuma comprovação de outro jogador está aguardando sua aprovação agora.
              </p>

              <Link
                href="/jogo"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#22C7D9] px-7 py-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(34,199,217,.16)] transition hover:-translate-y-0.5"
              >
                ← Voltar para o jogo
              </Link>
            </div>
          )}

        {!carregando &&
          submissoes.length > 0 && (
            <section className="space-y-5">
              {submissoes.map(
                (submissao) => {
                  const processando =
                    processandoId ===
                    submissao.id;

                  return (
                    <article
                      key={submissao.id}
                      className="overflow-hidden rounded-[30px] bg-white shadow-[0_12px_36px_rgba(15,23,42,.06)]"
                    >
                      <div className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)]">
                        <div className="relative flex min-h-[300px] items-center justify-center bg-[#EEF2F6] sm:min-h-[380px]">
                          {submissao.photoUrl ? (
                            <img
                              src={
                                submissao.photoUrl
                              }
                              alt={`Comprovação de ${submissao.jogadorNome}`}
                              className="max-h-[520px] w-full object-contain"
                            />
                          ) : (
                            <div className="p-8 text-center">
                              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-slate-300 shadow-sm">
                                ◻
                              </div>

                              <p className="mt-3 text-sm font-bold text-slate-400">
                                Nenhuma foto enviada
                              </p>
                            </div>
                          )}

                          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-6 w-6 overflow-hidden rounded-full border-2 border-white"
                                style={{
                                  backgroundColor:
                                    submissao.jogadorCor,
                                }}
                              >
                                {submissao.jogadorAvatar && (
                                  <img
                                    src={
                                      submissao.jogadorAvatar
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </span>

                              <span className="text-[10px] font-black text-slate-600">
                                {submissao.jogadorNome}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col p-5 sm:p-6">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#F5F8FC] px-2.5 py-1 text-[9px] font-black text-slate-400">
                                {submissao.tarefaCategoria}
                              </span>

                              <span className="rounded-full bg-[#FFF0C7] px-2.5 py-1 text-[9px] font-black text-[#B87C00]">
                                Aguardando aprovação
                              </span>

                              {imagemVeioDaGaleria(
                                submissao.photoUrl
                              ) && (
                                <span className="rounded-full bg-[#F7F4FF] px-2.5 py-1 text-[9px] font-black text-[#8B5CF6]">
                                  Imagem da galeria
                                </span>
                              )}
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                              <div className="rounded-2xl bg-[#F8FBFE] p-2">
                                <PeaoMini
                                  cor={
                                    submissao.jogadorCor
                                  }
                                  avatar={
                                    submissao.jogadorAvatar
                                  }
                                />
                              </div>

                              <div>
                                <p className="text-[9px] font-black tracking-[0.16em] text-slate-400">
                                  JOGADOR
                                </p>

                                <p className="mt-1 font-black">
                                  {submissao.jogadorNome}
                                </p>

                                <p className="mt-1 text-[11px] font-bold text-slate-400">
                                  {formatarHorarioEnvio(
                                    submissao.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6">
                              <p className="text-[9px] font-black tracking-[0.16em] text-[#8B5CF6]">
                                TAREFA
                              </p>

                              <h2 className="mt-2 text-xl font-black leading-snug">
                                {submissao.tarefaTitulo}
                              </h2>

                              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                                Confira a imagem com atenção. Se ela comprovar a tarefa,{" "}
                                <strong className="text-[#1F2937]">
                                  {submissao.jogadorNome}
                                </strong>{" "}
                                avança exatamente uma casa.
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto pt-7">
                            <div className="mb-3 rounded-2xl bg-[#F8FBFE] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[9px] font-black tracking-[0.14em] text-slate-400">
                                    SUA DECISÃO
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    A prova corresponde à tarefa?
                                  </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1ECFF] font-black text-[#8B5CF6]">
                                  ?
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() =>
                                  recusarSubmissao(
                                    submissao
                                  )
                                }
                                disabled={
                                  processando
                                }
                                className="rounded-2xl bg-red-50 px-4 py-4 text-sm font-black text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processando
                                  ? "Salvando..."
                                  : "Recusar"}
                              </button>

                              <button
                                onClick={() =>
                                  aprovarSubmissao(
                                    submissao
                                  )
                                }
                                disabled={
                                  processando
                                }
                                className="rounded-2xl bg-[#22C55E] px-4 py-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(34,197,94,.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processando
                                  ? "Salvando..."
                                  : "✓ Aprovar"}
                              </button>
                            </div>

                            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
                              Você nunca aprova a própria comprovação.
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </section>
          )}

        <section className="mt-6 rounded-[26px] bg-[#F1ECFF] p-5 sm:p-6">
          <p className="text-[10px] font-black tracking-[0.18em] text-[#8B5CF6]">
            POR QUE OUTRO JOGADOR APROVA?
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {modoAprovacao === "admin_only"
              ? "Nesta partida, as aprovações estão centralizadas no admin. O admin aprova os demais jogadores e a pessoa escolhida por ele aprova as tarefas do admin."
              : "O DoToWin usa validação entre jogadores. Você registra a comprovação da sua tarefa e outra pessoa da mesma partida decide se ela é válida. Só depois da aprovação o avanço acontece."}
          </p>
        </section>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-40 rounded-[24px] bg-white p-2 shadow-[0_14px_38px_rgba(15,23,42,.14)] lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          <Link
            href="/jogo"
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
            <span className="text-lg">
              🎮
            </span>

            <span className="mt-1 text-[10px] font-bold">
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
            className="flex flex-col items-center justify-center rounded-2xl bg-[#F1ECFF] px-2 py-2.5 text-[#8B5CF6]"
          >
            <span className="text-lg">
              👍
            </span>

            <span className="mt-1 text-[10px] font-black">
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