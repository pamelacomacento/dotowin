"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JogadorAtual = {
  id: number;
  nome: string;
  cor: string;
  gameId: number;
};

type Submissao = {
  id: number;
  taskId: number;
  playerId: number;
  status: string;
  photoUrl: string | null;
  tarefaTitulo: string;
  tarefaCategoria: string;
  jogadorNome: string;
  jogadorCor: string;
};

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
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [jogadorAtual?.gameId, jogadorAtual?.id]);

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

    const gameId = Number(gameIdSalvo);

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
        "id, name, color, profile_id, game_id"
      )
      .eq("profile_id", user.id)
      .eq("game_id", gameId)
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

    const jogadorFormatado: JogadorAtual = {
      id: jogadorData.id,
      nome: jogadorData.name,
      cor:
        jogadorData.color ||
        "#38bdf8",
      gameId: jogadorData.game_id,
    };

    setJogadorAtual(
      jogadorFormatado
    );

    const {
      data: playersDaPartida,
      error: erroPlayersDaPartida,
    } = await supabase
      .from("players")
      .select("id, name, color")
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

    const idsOutrosJogadores =
      (playersDaPartida || [])
        .filter(
          (player) =>
            player.id !==
            jogadorFormatado.id
        )
        .map(
          (player) => player.id
        );

    if (
      idsOutrosJogadores.length === 0
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
        "id, task_id, player_id, status, photo_url, created_at"
      )
      .eq(
        "status",
        "Aguardando aprovação"
      )
      .in(
        "player_id",
        idsOutrosJogadores
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
          (item) => item.task_id
        )
      ),
    ];

    const {
      data: tasksData,
      error: erroTasks,
    } = await supabase
      .from("tasks")
      .select(
        "id, title, category, game_id"
      )
      .in("id", taskIds)
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
        (tasksData || []).map(
          (task) => task.id
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
        .map((submission) => {
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
              "#38bdf8",
          };
        });

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
        "approve_submission",
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
        )
      ) {
        mensagem =
          "Você não pertence à partida desta tarefa.";
      }

      setMensagemErro(
        mensagem
      );

      setProcessandoId(null);
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

    setProcessandoId(null);
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
        "reject_submission",
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
        )
      ) {
        mensagem =
          "Você não pertence à partida desta tarefa.";
      }

      setMensagemErro(
        mensagem
      );

      setProcessandoId(null);
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

    setProcessandoId(null);
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
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="mx-auto max-w-[900px] p-5">
        <header className="mb-6">
          <a
            href="/"
            className="mb-3 inline-block text-sm font-bold text-slate-400 transition hover:text-white"
          >
            ← Voltar ao jogo
          </a>

          <p className="text-xs font-black tracking-[0.25em] text-violet-400">
            DOTOWIN
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Aprovações
          </h1>

          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Confira as comprovações dos outros jogadores da sua partida antes
            de liberar o avanço.
          </p>
        </header>

        {jogadorAtual && (
          <section className="mb-6 rounded-2xl border border-white/[0.07] bg-[#071329] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
                  APROVANDO COMO
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        jogadorAtual.cor,

                      boxShadow: `0 0 10px ${jogadorAtual.cor}`,
                    }}
                  />

                  <p className="font-black">
                    {
                      jogadorAtual.nome
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={sair}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                SAIR
              </button>
            </div>
          </section>
        )}

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm font-bold text-red-300">
            {mensagemErro}
          </div>
        )}

        {carregando && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#071329] p-6 text-center text-sm text-slate-400">
            Carregando aprovações...
          </div>
        )}

        {!carregando &&
          submissoes.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#071329] p-8 text-center">
              <div className="text-4xl">
                ✓
              </div>

              <h2 className="mt-4 text-xl font-black">
                Tudo em dia
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Nenhuma comprovação de outro jogador da sua partida está
                aguardando aprovação.
              </p>
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
                      key={
                        submissao.id
                      }
                      className="overflow-hidden rounded-2xl border border-violet-400/10 bg-[#071329] shadow-xl"
                    >
                      {submissao.photoUrl ? (
                        <div className="border-b border-white/[0.06] bg-black/20">
                          <img
                            src={
                              submissao.photoUrl
                            }
                            alt={`Comprovação de ${submissao.jogadorNome}`}
                            className="max-h-[420px] w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="border-b border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                          Nenhuma foto enviada.
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-slate-400">
                                {
                                  submissao.tarefaCategoria
                                }
                              </span>

                              <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold text-orange-300">
                                Aguardando aprovação
                              </span>
                            </div>

                            <div className="mb-3 flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    submissao.jogadorCor,

                                  boxShadow: `0 0 10px ${submissao.jogadorCor}`,
                                }}
                              />

                              <p className="text-sm font-black">
                                {
                                  submissao.jogadorNome
                                }
                              </p>
                            </div>

                            <h2 className="text-lg font-black">
                              {
                                submissao.tarefaTitulo
                              }
                            </h2>

                            <p className="mt-2 text-xs text-slate-500">
                              Se aprovada,{" "}
                              {
                                submissao.jogadorNome
                              }{" "}
                              avança +1 casa.
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                recusarSubmissao(
                                  submissao
                                )
                              }
                              disabled={
                                processando
                              }
                              className="rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processando
                                ? "SALVANDO..."
                                : "RECUSAR"}
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
                              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-3 text-sm font-black text-[#02110c] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processando
                                ? "SALVANDO..."
                                : "APROVAR"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </section>
          )}
      </div>
    </main>
  );
}