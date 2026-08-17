"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Partida = {
  id: number;
  nome: string;
  codigo: string;
  status: string;
  posicao: number;
  cor: string;
};

const coresJogadores = [
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#eab308",
  "#3b82f6",
];

export default function PartidasPage() {
  const router = useRouter();

  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");

  const [mostrarCriacao, setMostrarCriacao] =
    useState(false);

  const [nomeNovaPartida, setNomeNovaPartida] =
    useState("");

  const [criandoPartida, setCriandoPartida] =
    useState(false);

  const [mostrarEntrada, setMostrarEntrada] =
    useState(false);

  const [codigoEntrada, setCodigoEntrada] =
    useState("");

  const [entrandoPartida, setEntrandoPartida] =
    useState(false);

  useEffect(() => {
    carregarPartidas();
  }, []);

  async function carregarPartidas() {
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

    const { data: perfil, error: erroPerfil } =
      await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

    if (erroPerfil) {
      console.error(
        "Erro ao carregar perfil:",
        erroPerfil
      );
    }

    setNomeUsuario(
      perfil?.name || "Jogador"
    );

    const {
      data: participacoes,
      error: erroParticipacoes,
    } = await supabase
      .from("players")
      .select(
        "id, game_id, color, position"
      )
      .eq("profile_id", user.id);

    if (erroParticipacoes) {
      console.error(
        "Erro ao carregar participações:",
        erroParticipacoes
      );

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
        "id, name, code, status"
      )
      .in("id", idsPartidas);

    if (erroJogos) {
      console.error(
        "Erro ao carregar dados das partidas:",
        erroJogos
      );

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
              item.game_id === jogo.id
          );

        return {
          id: jogo.id,
          nome: jogo.name,
          codigo: jogo.code,
          status: jogo.status,
          posicao:
            participacao?.position || 1,
          cor:
            participacao?.color ||
            "#38bdf8",
        };
      });

    setPartidas(lista);
    setCarregando(false);
  }

  function gerarCodigoPartida() {
    const caracteres =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (let i = 0; i < 5; i++) {
      codigo +=
        caracteres[
          Math.floor(
            Math.random() *
              caracteres.length
          )
        ];
    }

    return codigo;
  }

  async function criarPartida() {
    const nome =
      nomeNovaPartida.trim();

    if (!nome) {
      setMensagemErro(
        "Digite um nome para a partida."
      );
      return;
    }

    setCriandoPartida(true);
    setMensagemErro("");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.push("/login");
      return;
    }

    const {
      data: perfil,
      error: erroPerfil,
    } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    if (erroPerfil || !perfil) {
      console.error(
        "Erro ao carregar perfil:",
        erroPerfil
      );

      setMensagemErro(
        "Não foi possível identificar seu perfil."
      );

      setCriandoPartida(false);
      return;
    }

    let partidaCriada:
      | {
          id: number;
          name: string;
          code: string;
        }
      | null = null;

    let ultimoErro: any = null;

    for (
      let tentativa = 0;
      tentativa < 5;
      tentativa++
    ) {
      const codigo =
        gerarCodigoPartida();

      const { data, error } =
        await supabase
          .from("games")
          .insert({
            name: nome,
            code: codigo,
            admin_profile_id:
              user.id,
            status: "active",
          })
          .select(
            "id, name, code"
          )
          .single();

      if (!error && data) {
        partidaCriada = data;
        break;
      }

      ultimoErro = error;

      const codigoDuplicado =
        error?.code === "23505";

      if (!codigoDuplicado) {
        break;
      }
    }

    if (!partidaCriada) {
      console.error(
        "Erro ao criar partida:",
        ultimoErro
      );

      setMensagemErro(
        "Não foi possível criar a partida."
      );

      setCriandoPartida(false);
      return;
    }

    const corEscolhida =
      coresJogadores[
        partidas.length %
          coresJogadores.length
      ];

    const { error: erroJogador } =
      await supabase
        .from("players")
        .insert({
          name:
            perfil.name ||
            "Jogador",
          color: corEscolhida,
          position: 1,
          profile_id: user.id,
          game_id:
            partidaCriada.id,
        });

    if (erroJogador) {
      console.error(
        "Erro ao criar jogador:",
        erroJogador
      );

      setMensagemErro(
        "A partida foi criada, mas não foi possível adicionar você como jogador."
      );

      setCriandoPartida(false);
      return;
    }

    localStorage.setItem(
      "dotowin_game_id",
      String(partidaCriada.id)
    );

    setNomeNovaPartida("");
    setMostrarCriacao(false);
    setCriandoPartida(false);

    router.push("/");
  }

  async function entrarComCodigo() {
    const codigo =
      codigoEntrada
        .trim()
        .toUpperCase();

    if (!codigo) {
      setMensagemErro(
        "Digite o código da partida."
      );
      return;
    }

    setEntrandoPartida(true);
    setMensagemErro("");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      router.push("/login");
      return;
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "join_game_by_code",
      {
        p_code: codigo,
      }
    );

    if (error) {
      console.error(
        "Erro ao entrar por código:",
        error
      );

      const erroTexto =
        `${error.message || ""} ${
          error.details || ""
        }`.toLowerCase();

      let mensagem =
        "Não foi possível entrar nesta partida.";

      if (
        erroTexto.includes(
          "game not found"
        )
      ) {
        mensagem =
          "Não encontramos nenhuma partida ativa com esse código.";
      } else if (
        erroTexto.includes(
          "game code is required"
        )
      ) {
        mensagem =
          "Digite o código da partida.";
      } else if (
        erroTexto.includes(
          "profile not found"
        )
      ) {
        mensagem =
          "Não foi possível identificar seu perfil.";
      } else if (
        erroTexto.includes(
          "not authenticated"
        )
      ) {
        router.push("/login");
        return;
      }

      setMensagemErro(mensagem);
      setEntrandoPartida(false);
      return;
    }

    const resultado =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      !resultado ||
      !resultado.game_id
    ) {
      setMensagemErro(
        "Não foi possível entrar nesta partida."
      );

      setEntrandoPartida(false);
      return;
    }

    localStorage.setItem(
      "dotowin_game_id",
      String(resultado.game_id)
    );

    setCodigoEntrada("");
    setMostrarEntrada(false);
    setEntrandoPartida(false);

    router.push("/");
  }

  function abrirPartida(
    partidaId: number
  ) {
    localStorage.setItem(
      "dotowin_game_id",
      String(partidaId)
    );

    router.push("/");
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
      <div className="mx-auto max-w-[1050px] p-5">
        <header className="mb-10 flex items-center justify-between gap-4">
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

          <button
            onClick={sair}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            SAIR
          </button>
        </header>

        <section className="mb-8">
          <p className="text-xs font-black tracking-[0.25em] text-cyan-400">
            SUAS PARTIDAS
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Onde vamos jogar,{" "}
            {nomeUsuario}?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Entre em uma partida existente ou comece uma nova corrida.
          </p>
        </section>

        {mensagemErro && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm font-bold text-red-300">
            {mensagemErro}
          </div>
        )}

        {mostrarCriacao && (
          <section className="mb-8 rounded-3xl border border-cyan-400/20 bg-[#071329] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300">
                  NOVA CORRIDA
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Dê um nome à partida
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Depois você poderá criar as tarefas e convidar os outros jogadores.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!criandoPartida) {
                    setMostrarCriacao(false);
                    setNomeNovaPartida("");
                    setMensagemErro("");
                  }
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <input
                value={nomeNovaPartida}
                onChange={(event) =>
                  setNomeNovaPartida(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !criandoPartida
                  ) {
                    criarPartida();
                  }
                }}
                placeholder="Ex.: Projeto Verão"
                maxLength={50}
                autoFocus
                className="w-full rounded-2xl border border-white/[0.08] bg-[#020b1c] px-4 py-4 font-bold outline-none focus:border-cyan-400/40"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarCriacao(false);
                  setNomeNovaPartida("");
                  setMensagemErro("");
                }}
                disabled={criandoPartida}
                className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-black text-slate-400"
              >
                CANCELAR
              </button>

              <button
                onClick={criarPartida}
                disabled={
                  criandoPartida ||
                  !nomeNovaPartida.trim()
                }
                className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-6 py-3 text-sm font-black disabled:opacity-50"
              >
                {criandoPartida
                  ? "CRIANDO..."
                  : "COMEÇAR PARTIDA"}
              </button>
            </div>
          </section>
        )}

        {mostrarEntrada && (
          <section className="mb-8 rounded-3xl border border-violet-400/20 bg-[#071329] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-violet-300">
                  ENTRAR NA CORRIDA
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Qual é o código?
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Digite o código de 5 caracteres enviado por quem criou a partida.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!entrandoPartida) {
                    setMostrarEntrada(false);
                    setCodigoEntrada("");
                    setMensagemErro("");
                  }
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <input
                value={codigoEntrada}
                onChange={(event) =>
                  setCodigoEntrada(
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z0-9]/g,
                        ""
                      )
                      .slice(0, 5)
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !entrandoPartida
                  ) {
                    entrarComCodigo();
                  }
                }}
                placeholder="ABCDE"
                maxLength={5}
                autoFocus
                className="w-full rounded-2xl border border-violet-400/20 bg-[#020b1c] px-4 py-4 text-center text-2xl font-black uppercase tracking-[0.4em] text-violet-200 outline-none focus:border-violet-400/50"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarEntrada(false);
                  setCodigoEntrada("");
                  setMensagemErro("");
                }}
                disabled={entrandoPartida}
                className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-black text-slate-400"
              >
                CANCELAR
              </button>

              <button
                onClick={entrarComCodigo}
                disabled={
                  entrandoPartida ||
                  codigoEntrada.length !== 5
                }
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-black disabled:opacity-50"
              >
                {entrandoPartida
                  ? "ENTRANDO..."
                  : "ENTRAR NA PARTIDA"}
              </button>
            </div>
          </section>
        )}

        {carregando && (
          <div className="rounded-3xl border border-white/[0.07] bg-[#071329] p-8 text-center text-sm text-slate-400">
            Procurando suas partidas...
          </div>
        )}

        {!carregando &&
          partidas.length > 0 && (
            <section className="mb-8 grid gap-4 md:grid-cols-2">
              {partidas.map(
                (partida) => (
                  <button
                    key={partida.id}
                    onClick={() =>
                      abrirPartida(
                        partida.id
                      )
                    }
                    className="group rounded-3xl border border-white/[0.08] bg-[#071329] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-[#091832]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-4 flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                partida.cor,
                              boxShadow: `0 0 10px ${partida.cor}`,
                            }}
                          />

                          <span className="text-[10px] font-black tracking-[0.2em] text-slate-500">
                            EM ANDAMENTO
                          </span>
                        </div>

                        <h2 className="text-xl font-black">
                          {partida.nome}
                        </h2>

                        <p className="mt-2 text-xs text-slate-500">
                          CÓDIGO{" "}
                          <span className="font-black tracking-[0.15em] text-cyan-300">
                            {partida.codigo}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-center">
                        <p className="text-[9px] font-bold text-slate-500">
                          SUA CASA
                        </p>

                        <p
                          className="mt-1 text-2xl font-black"
                          style={{
                            color:
                              partida.cor,
                          }}
                        >
                          {partida.posicao}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="text-xs font-bold text-slate-400">
                        Continuar partida
                      </span>

                      <span className="text-lg text-cyan-300">
                        →
                      </span>
                    </div>
                  </button>
                )
              )}
            </section>
          )}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] to-blue-500/[0.03] p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300">
              NOVA CORRIDA
            </p>

            <h2 className="mt-2 text-xl font-black">
              Criar partida
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Monte uma nova partida, escolha as tarefas e convide os jogadores.
            </p>

            <button
              onClick={() => {
                setMostrarEntrada(false);
                setMostrarCriacao(true);
                setMensagemErro("");
              }}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black"
            >
              CRIAR PARTIDA
            </button>
          </div>

          <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.03] p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-violet-300">
              TEM UM CÓDIGO?
            </p>

            <h2 className="mt-2 text-xl font-black">
              Entrar em uma partida
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Use o código enviado pelo administrador para entrar na corrida.
            </p>

            <button
              onClick={() => {
                setMostrarCriacao(false);
                setMostrarEntrada(true);
                setMensagemErro("");
              }}
              className="mt-6 w-full rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-5 py-3 text-sm font-black text-violet-200 transition hover:bg-violet-400/[0.12]"
            >
              ENTRAR COM CÓDIGO
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}