"use client";

import Link from "next/link";
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
  totalCasas: number;
};

const coresJogadores = [
  "#38BDF8",
  "#8B5CF6",
  "#F97316",
  "#22C55E",
  "#EC4899",
  "#EAB308",
  "#14B8A6",
  "#EF4444",
];

const opcoesCasas = [20, 30, 45, 60];

function Logo() {
  return (
    <img
      src="/dotowin-logo.png"
      alt="DoToWin"
      className="h-[54px] w-auto max-w-[205px] object-contain mix-blend-multiply sm:h-[60px] sm:max-w-[225px]"
    />
  );
}

function PeaoMini({
  cor,
}: {
  cor: string;
}) {
  return (
    <div className="relative h-12 w-10 shrink-0">
      <div
        className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      />

      <div
        className="absolute bottom-[7px] left-1/2 h-5 w-7 -translate-x-1/2 rounded-t-full border-x-2 border-white"
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className="absolute bottom-0 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full border-2 border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

export default function PartidasPage() {
  const router = useRouter();

  const [partidas, setPartidas] =
    useState<Partida[]>([]);

  const [nomeUsuario, setNomeUsuario] =
    useState("");

  const [carregando, setCarregando] =
    useState(true);

  const [mensagemErro, setMensagemErro] =
    useState("");

  const [mostrarCriacao, setMostrarCriacao] =
    useState(false);

  const [nomeNovaPartida, setNomeNovaPartida] =
    useState("");

  const [criandoPartida, setCriandoPartida] =
    useState(false);

  const [totalCasas, setTotalCasas] =
    useState(30);

  const [
    modoPersonalizado,
    setModoPersonalizado,
  ] = useState(false);

  const [
    totalPersonalizado,
    setTotalPersonalizado,
  ] = useState("30");

  const [mostrarEntrada, setMostrarEntrada] =
    useState(false);

  const [codigoEntrada, setCodigoEntrada] =
    useState("");

  const [
    entrandoPartida,
    setEntrandoPartida,
  ] = useState(false);

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

    const {
      data: perfil,
      error: erroPerfil,
    } = await supabase
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
        "id, name, code, status, total_spaces"
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
              item.game_id ===
              jogo.id
          );

        return {
          id: jogo.id,
          nome: jogo.name,
          codigo: jogo.code,
          status: jogo.status,
          posicao:
            participacao?.position ??
            0,
          cor:
            participacao?.color ||
            "#38BDF8",
          totalCasas:
            jogo.total_spaces ||
            60,
        };
      });

    setPartidas(lista);
    setCarregando(false);
  }

  function gerarCodigoPartida() {
    const caracteres =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (
      let i = 0;
      i < 5;
      i++
    ) {
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

  function obterTotalCasasEscolhido() {
    if (!modoPersonalizado) {
      return totalCasas;
    }

    const valor =
      Number(totalPersonalizado);

    if (!Number.isFinite(valor)) {
      return null;
    }

    const arredondado =
      Math.round(valor);

    if (
      arredondado < 10 ||
      arredondado > 100
    ) {
      return null;
    }

    return arredondado;
  }

  function limparCriacao() {
    setMostrarCriacao(false);
    setNomeNovaPartida("");
    setTotalCasas(30);
    setModoPersonalizado(false);
    setTotalPersonalizado("30");
    setMensagemErro("");
  }

  function fecharEntrada() {
    setMostrarEntrada(false);
    setCodigoEntrada("");
    setMensagemErro("");
  }

  async function criarPartida() {
    const nome =
      nomeNovaPartida.trim();

    const totalEscolhido =
      obterTotalCasasEscolhido();

    if (!nome) {
      setMensagemErro(
        "Digite um nome para a partida."
      );
      return;
    }

    if (!totalEscolhido) {
      setMensagemErro(
        "Escolha entre 10 e 100 casas."
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
          total_spaces: number;
        }
      | null = null;

    let ultimoErro: unknown =
      null;

    for (
      let tentativa = 0;
      tentativa < 5;
      tentativa++
    ) {
      const codigo =
        gerarCodigoPartida();

      const {
        data,
        error,
      } = await supabase
        .from("games")
        .insert({
          name: nome,
          code: codigo,
          admin_profile_id:
            user.id,
          status: "active",
          total_spaces:
            totalEscolhido,
        })
        .select(
          "id, name, code, total_spaces"
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

    const {
      error: erroJogador,
    } = await supabase
      .from("players")
      .insert({
        name:
          perfil.name ||
          "Jogador",
        color: corEscolhida,
        position: 0,
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

    setCriandoPartida(false);

    router.push("/personalizar");
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

    setEntrandoPartida(false);

    router.push("/personalizar");
  }

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
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] pb-10 text-[#1F2937]">
      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:px-5">
          <div className="flex items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-slate-200 sm:block" />

            <Link
              href="/"
              className="hidden rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-[#F5F8FC] hover:text-slate-600 sm:block"
            >
              Início
            </Link>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#F5F8FC] px-4 py-3 text-xs font-black text-slate-500 transition hover:bg-slate-100"
          >
            Sair
          </button>
        </header>

        <section className="mb-7">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#22C7D9]">
            SUAS PARTIDAS
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Onde vamos jogar,{" "}
            {nomeUsuario}?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            Continue uma corrida, crie uma nova partida ou entre com o código de alguém.
          </p>
        </section>

        {mensagemErro && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        {mostrarCriacao && (
          <section className="mb-7 rounded-[30px] bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-[#22C7D9]">
                  NOVA CORRIDA
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                  Monte sua partida
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                  Escolha o nome e quantas aprovações serão necessárias para chegar à vitória.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    !criandoPartida
                  ) {
                    limparCriacao();
                  }
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-sm font-black text-slate-400 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-7">
              <label className="text-[10px] font-black tracking-[0.18em] text-slate-400">
                NOME DA PARTIDA
              </label>

              <input
                value={
                  nomeNovaPartida
                }
                onChange={(
                  event
                ) =>
                  setNomeNovaPartida(
                    event.target
                      .value
                  )
                }
                placeholder="Ex.: Projeto Verão"
                maxLength={50}
                autoFocus
                className="mt-2 w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 font-bold text-[#1F2937] outline-none transition placeholder:text-slate-300 focus:border-[#22C7D9]"
              />
            </div>

            <div className="mt-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label className="text-[10px] font-black tracking-[0.18em] text-slate-400">
                    TAMANHO DA CORRIDA
                  </label>

                  <p className="mt-1 text-xs text-slate-500">
                    Uma aprovação vale exatamente uma casa.
                  </p>
                </div>

                <div className="w-fit rounded-full bg-[#EAF8FB] px-3 py-1.5 text-[10px] font-black text-[#1594A3]">
                  1 tarefa = +1 casa
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {opcoesCasas.map(
                  (quantidade) => {
                    const selecionada =
                      !modoPersonalizado &&
                      totalCasas ===
                        quantidade;

                    return (
                      <button
                        key={
                          quantidade
                        }
                        type="button"
                        onClick={() => {
                          setModoPersonalizado(
                            false
                          );

                          setTotalCasas(
                            quantidade
                          );

                          setMensagemErro(
                            ""
                          );
                        }}
                        className={`rounded-[22px] border-2 px-3 py-4 text-center transition hover:-translate-y-0.5 ${
                          selecionada
                            ? "border-[#22C7D9] bg-[#EAF8FB] shadow-[0_8px_18px_rgba(34,199,217,.1)]"
                            : "border-[#EDF2F7] bg-[#F8FBFE] hover:border-[#CDECF0]"
                        }`}
                      >
                        <p
                          className={`text-2xl font-black ${
                            selecionada
                              ? "text-[#1594A3]"
                              : "text-[#1F2937]"
                          }`}
                        >
                          {
                            quantidade
                          }
                        </p>

                        <p className="mt-1 text-[9px] font-black tracking-wider text-slate-400">
                          CASAS
                        </p>
                      </button>
                    );
                  }
                )}

                <button
                  type="button"
                  onClick={() => {
                    setModoPersonalizado(
                      true
                    );

                    setMensagemErro(
                      ""
                    );
                  }}
                  className={`rounded-[22px] border-2 px-3 py-4 text-center transition hover:-translate-y-0.5 ${
                    modoPersonalizado
                      ? "border-[#8B5CF6] bg-[#F1ECFF] shadow-[0_8px_18px_rgba(139,92,246,.1)]"
                      : "border-[#EDF2F7] bg-[#F8FBFE] hover:border-[#D9CCFF]"
                  }`}
                >
                  <p
                    className={`text-xl font-black ${
                      modoPersonalizado
                        ? "text-[#8B5CF6]"
                        : "text-slate-400"
                    }`}
                  >
                    +
                  </p>

                  <p className="mt-2 text-[9px] font-black tracking-wider text-slate-400">
                    PERSONALIZADO
                  </p>
                </button>
              </div>

              {modoPersonalizado && (
                <div className="mt-4 rounded-[22px] bg-[#F7F4FF] p-4">
                  <label className="text-[10px] font-black tracking-[0.18em] text-[#8B5CF6]">
                    QUANTIDADE PERSONALIZADA
                  </label>

                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={
                        totalPersonalizado
                      }
                      onChange={(
                        event
                      ) =>
                        setTotalPersonalizado(
                          event
                            .target
                            .value
                        )
                      }
                      className="w-full rounded-2xl border-2 border-[#E5DCFF] bg-white px-4 py-4 text-xl font-black outline-none transition focus:border-[#8B5CF6]"
                    />

                    <div className="shrink-0 text-xs font-bold text-slate-400">
                      10 a 100
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 rounded-[22px] bg-[#F8FBFE] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                  SUA CORRIDA
                </p>

                <p className="mt-1 text-sm font-black">
                  {obterTotalCasasEscolhido() ||
                    "?"}{" "}
                  casas até a vitória
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[9px] font-black tracking-[0.14em] text-slate-400">
                  PARA VENCER
                </p>

                <p className="mt-1 text-lg font-black text-[#22C7D9]">
                  {obterTotalCasasEscolhido() ||
                    "?"}{" "}
                  aprovações
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  limparCriacao
                }
                disabled={
                  criandoPartida
                }
                className="rounded-2xl bg-[#F5F8FC] px-5 py-3.5 text-sm font-black text-slate-500 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  criarPartida
                }
                disabled={
                  criandoPartida ||
                  !nomeNovaPartida.trim() ||
                  !obterTotalCasasEscolhido()
                }
                className="rounded-2xl bg-[#22C7D9] px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {criandoPartida
                  ? "Criando..."
                  : "Criar partida"}
              </button>
            </div>
          </section>
        )}

        {mostrarEntrada && (
          <section className="mb-7 rounded-[30px] bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-[#8B5CF6]">
                  ENTRAR NA CORRIDA
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                  Qual é o código?
                </h2>

                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Digite os 5 caracteres enviados por quem criou a partida.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    !entrandoPartida
                  ) {
                    fecharEntrada();
                  }
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-sm font-black text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto mt-7 max-w-lg">
              <input
                value={codigoEntrada}
                onChange={(
                  event
                ) =>
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
                onKeyDown={(
                  event
                ) => {
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
                className="w-full rounded-[22px] border-2 border-[#E5DCFF] bg-[#F7F4FF] px-4 py-5 text-center text-2xl font-black uppercase tracking-[0.38em] text-[#8B5CF6] outline-none transition placeholder:text-[#C8B9F4] focus:border-[#8B5CF6]"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={
                  fecharEntrada
                }
                disabled={
                  entrandoPartida
                }
                className="rounded-2xl bg-[#F5F8FC] px-5 py-3.5 text-sm font-black text-slate-500"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  entrarComCodigo
                }
                disabled={
                  entrandoPartida ||
                  codigoEntrada.length !==
                    5
                }
                className="rounded-2xl bg-[#8B5CF6] px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,.17)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {entrandoPartida
                  ? "Entrando..."
                  : "Entrar na partida"}
              </button>
            </div>
          </section>
        )}

        {carregando && (
          <div className="mb-7 flex min-h-[180px] items-center justify-center rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,.05)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

              <p className="mt-3 text-sm font-bold text-slate-400">
                Procurando suas partidas...
              </p>
            </div>
          </div>
        )}

        {!carregando &&
          partidas.length === 0 && (
            <section className="mb-7 rounded-[30px] bg-white p-7 text-center shadow-[0_10px_30px_rgba(15,23,42,.05)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF8FB]">
                <div className="h-5 w-5 rounded-full bg-[#22C7D9]" />
              </div>

              <h2 className="mt-4 text-xl font-black">
                Sua primeira corrida começa aqui
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Você ainda não participa de nenhuma partida. Crie uma ou entre usando um código.
              </p>
            </section>
          )}

        {!carregando &&
          partidas.length > 0 && (
            <section className="mb-7 grid gap-4 md:grid-cols-2">
              {partidas.map(
                (partida) => {
                  const progresso =
                    Math.min(
                      100,
                      Math.round(
                        (partida.posicao /
                          partida.totalCasas) *
                          100
                      )
                    );

                  return (
                    <button
                      key={
                        partida.id
                      }
                      type="button"
                      onClick={() =>
                        abrirPartida(
                          partida.id
                        )
                      }
                      className="group rounded-[28px] bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,.05)] transition hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(15,23,42,.08)] sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="rounded-2xl bg-[#F8FBFE] p-3">
                            <PeaoMini
                              cor={
                                partida.cor
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    partida.cor,
                                }}
                              />

                              <span className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                                EM ANDAMENTO
                              </span>
                            </div>

                            <h2 className="mt-2 truncate text-xl font-black">
                              {
                                partida.nome
                              }
                            </h2>

                            <p className="mt-2 text-xs text-slate-400">
                              Código{" "}
                              <span className="font-black tracking-[0.12em] text-[#22C7D9]">
                                {
                                  partida.codigo
                                }
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-[#F8FBFE] px-4 py-3 text-center">
                          <p className="text-[8px] font-black tracking-[0.1em] text-slate-400">
                            CASA
                          </p>

                          <p
                            className="mt-1 text-2xl font-black"
                            style={{
                              color:
                                partida.cor,
                            }}
                          >
                            {
                              partida.posicao
                            }
                          </p>

                          <p className="text-[9px] font-bold text-slate-400">
                            de{" "}
                            {
                              partida.totalCasas
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400">
                          <span>
                            PROGRESSO
                          </span>

                          <span>
                            {
                              progresso
                            }
                            %
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDF2F7]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progresso}%`,
                              backgroundColor:
                                partida.cor,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-black text-slate-500">
                          Continuar corrida
                        </span>

                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF8FB] text-[#22C7D9] transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </section>
          )}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] bg-[#EAF8FB] p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#22C7D9] shadow-sm">
              +
            </div>

            <p className="mt-5 text-[10px] font-black tracking-[0.2em] text-[#1594A3]">
              NOVA CORRIDA
            </p>

            <h2 className="mt-2 text-xl font-black">
              Criar partida
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Escolha o tamanho da corrida, crie as tarefas e depois convide os jogadores.
            </p>

            <button
              type="button"
              onClick={() => {
                setMostrarEntrada(
                  false
                );

                setMostrarCriacao(
                  true
                );

                setMensagemErro(
                  ""
                );
              }}
              className="mt-6 w-full rounded-2xl bg-[#22C7D9] px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(34,199,217,.15)] transition hover:-translate-y-0.5"
            >
              Criar partida
            </button>
          </div>

          <div className="rounded-[28px] bg-[#F1ECFF] p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#8B5CF6] shadow-sm">
              #
            </div>

            <p className="mt-5 text-[10px] font-black tracking-[0.2em] text-[#8B5CF6]">
              TEM UM CÓDIGO?
            </p>

            <h2 className="mt-2 text-xl font-black">
              Entrar em uma partida
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Use o código compartilhado pelo administrador para entrar na corrida.
            </p>

            <button
              type="button"
              onClick={() => {
                setMostrarCriacao(
                  false
                );

                setMostrarEntrada(
                  true
                );

                setMensagemErro(
                  ""
                );
              }}
              className="mt-6 w-full rounded-2xl bg-[#8B5CF6] px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(139,92,246,.14)] transition hover:-translate-y-0.5"
            >
              Entrar com código
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}