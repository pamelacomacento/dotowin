"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StatusSubmissao =
  | "Pendente"
  | "Aguardando aprovação"
  | "Concluída";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  gameId: number;
};

type Tarefa = {
  id: number;
  titulo: string;
  categoria: string;
};

type Submissao = {
  id: number;
  taskId: number;
  playerId: number;
  status: StatusSubmissao;
  photoUrl: string | null;
};

export default function TarefasPage() {
  const router = useRouter();

  const [tarefas, setTarefas] =
    useState<Tarefa[]>([]);

  const [submissoes, setSubmissoes] =
    useState<Submissao[]>([]);

  const [
    jogadorAtual,
    setJogadorAtual,
  ] = useState<Jogador | null>(null);

  const [
    ehAdministrador,
    setEhAdministrador,
  ] = useState(false);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    menuPerfilAberto,
    setMenuPerfilAberto,
  ] = useState(false);

  const [titulo, setTitulo] =
    useState("");

  const [categoria, setCategoria] =
    useState("");

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState("");

  const [
    tarefaEmAtualizacao,
    setTarefaEmAtualizacao,
  ] = useState<number | null>(null);

  const [
    tarefaSelecionada,
    setTarefaSelecionada,
  ] = useState<Tarefa | null>(null);

  const [
    cameraAberta,
    setCameraAberta,
  ] = useState(false);

  const [
    iniciandoCamera,
    setIniciandoCamera,
  ] = useState(false);

  const [
    fotoCapturada,
    setFotoCapturada,
  ] = useState<Blob | null>(null);

  const [
    fotoPreview,
    setFotoPreview,
  ] = useState<string | null>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(null);

  const menuPerfilRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (
      !jogadorAtual?.gameId ||
      !jogadorAtual?.id
    ) {
      return;
    }

    const gameId =
      jogadorAtual.gameId;

    const playerId =
      jogadorAtual.id;

    const canal = supabase
      .channel(
        `dotowin-tarefas-${gameId}-${playerId}`
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
          carregarDados(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          carregarDados(true);
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

  useEffect(() => {
    if (!cameraAberta) {
      return;
    }

    iniciarCamera();

    return () => {
      pararCamera();
    };
  }, [cameraAberta]);

  useEffect(() => {
    return () => {
      pararCamera();
    };
  }, []);

  useEffect(() => {
    function fecharMenuAoClicarFora(
      event: MouseEvent
    ) {
      if (
        menuPerfilRef.current &&
        !menuPerfilRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuPerfilAberto(false);
      }
    }

    document.addEventListener(
      "mousedown",
      fecharMenuAoClicarFora
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        fecharMenuAoClicarFora
      );
    };
  }, []);

  async function carregarDados(
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
          "id, name, color, profile_id, game_id"
        )
        .eq(
          "profile_id",
          user.id
        )
        .eq("game_id", gameId)
        .maybeSingle(),

      supabase
        .from("games")
        .select(
          "id, admin_profile_id"
        )
        .eq("id", gameId)
        .maybeSingle(),
    ]);

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

    if (erroPartida) {
      console.error(
        "Erro ao localizar partida:",
        erroPartida
      );

      setMensagemErro(
        "Não foi possível identificar a partida."
      );

      setCarregando(false);
      return;
    }

    if (
      !jogadorData ||
      !partidaData
    ) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      setMensagemErro(
        "Você não pertence a esta partida. Volte para selecionar outra."
      );

      setCarregando(false);
      return;
    }

    const administrador =
      partidaData.admin_profile_id ===
      user.id;

    setEhAdministrador(
      administrador
    );

    const jogadorFormatado: Jogador =
      {
        id: jogadorData.id,
        nome: jogadorData.name,
        cor:
          jogadorData.color ||
          "#38bdf8",
        gameId:
          jogadorData.game_id,
      };

    setJogadorAtual(
      jogadorFormatado
    );

    const [
      {
        data: tarefasData,
        error: erroTarefas,
      },
      {
        data: submissoesData,
        error: erroSubmissoes,
      },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, category, created_at, game_id"
        )
        .eq(
          "game_id",
          jogadorFormatado.gameId
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("submissions")
        .select(
          "id, task_id, player_id, status, photo_url"
        )
        .eq(
          "player_id",
          jogadorFormatado.id
        ),
    ]);

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

    if (erroSubmissoes) {
      console.error(
        "Erro ao carregar submissões:",
        erroSubmissoes
      );

      setMensagemErro(
        "Não foi possível carregar seu progresso."
      );

      setCarregando(false);
      return;
    }

    const tarefasFormatadas: Tarefa[] =
      (tarefasData || []).map(
        (item) => ({
          id: item.id,
          titulo: item.title,
          categoria:
            item.category ||
            "Geral",
        })
      );

    const submissoesFormatadas: Submissao[] =
      (submissoesData || []).map(
        (item) => ({
          id: item.id,
          taskId: item.task_id,
          playerId:
            item.player_id,
          status: (
            item.status ||
            "Pendente"
          ) as StatusSubmissao,
          photoUrl:
            item.photo_url ||
            null,
        })
      );

    setTarefas(
      tarefasFormatadas
    );

    setSubmissoes(
      submissoesFormatadas
    );

    setCarregando(false);
  }

  function trocarPartida() {
    setMenuPerfilAberto(false);

    localStorage.removeItem(
      "dotowin_game_id"
    );

    router.push("/partidas");
  }

  async function sair() {
    setMenuPerfilAberto(false);

    pararCamera();

    await supabase.auth.signOut();

    localStorage.removeItem(
      "dotowin_game_id"
    );

    router.push("/login");
    router.refresh();
  }

  async function adicionarTarefa() {
    if (!titulo.trim()) {
      return;
    }

    if (!jogadorAtual) {
      setMensagemErro(
        "Não foi possível identificar sua partida."
      );
      return;
    }

    if (!ehAdministrador) {
      setMensagemErro(
        "Somente o administrador da partida pode criar tarefas."
      );
      return;
    }

    setSalvando(true);
    setMensagemErro("");

    const { data, error } =
      await supabase
        .from("tasks")
        .insert({
          title:
            titulo.trim(),
          category:
            categoria.trim() ||
            "Geral",
          status: "Pendente",
          game_id:
            jogadorAtual.gameId,
        })
        .select(
          "id, title, category"
        )
        .single();

    if (error) {
      console.error(
        "Erro ao criar tarefa:",
        error
      );

      setMensagemErro(
        "Não foi possível criar a tarefa."
      );

      setSalvando(false);
      return;
    }

    const novaTarefa: Tarefa =
      {
        id: data.id,
        titulo: data.title,
        categoria:
          data.category ||
          "Geral",
      };

    setTarefas(
      (tarefasAtuais) => [
        novaTarefa,
        ...tarefasAtuais,
      ]
    );

    setTitulo("");
    setCategoria("");
    setMostrarFormulario(false);
    setSalvando(false);
  }

  function buscarSubmissao(
    tarefaId: number
  ) {
    if (!jogadorAtual) {
      return undefined;
    }

    return submissoes.find(
      (submissao) =>
        submissao.taskId ===
          tarefaId &&
        submissao.playerId ===
          jogadorAtual.id
    );
  }

  function abrirCamera(
    tarefa: Tarefa
  ) {
    if (!jogadorAtual) {
      setMensagemErro(
        "Não foi possível identificar seu jogador."
      );

      return;
    }

    limparFotoCapturada();

    setMensagemErro("");
    setTarefaSelecionada(
      tarefa
    );

    setCameraAberta(true);
  }

  async function iniciarCamera() {
    setIniciandoCamera(true);
    setMensagemErro("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "CAMERA_NAO_SUPORTADA"
        );
      }

      pararCamera();

      let stream: MediaStream;

      try {
        stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    "environment",
                },
              },
              audio: false,
            }
          );
      } catch {
        stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: false,
            }
          );
      }

      streamRef.current =
        stream;

      window.setTimeout(
        async () => {
          if (
            videoRef.current
          ) {
            videoRef.current.srcObject =
              stream;

            try {
              await videoRef.current.play();
            } catch (
              erroPlay
            ) {
              console.error(
                "Erro ao iniciar vídeo:",
                erroPlay
              );
            }
          }

          setIniciandoCamera(
            false
          );
        },
        100
      );
    } catch (error) {
      console.error(
        "Erro ao abrir câmera:",
        error
      );

      setIniciandoCamera(false);

      setMensagemErro(
        "Não foi possível acessar a câmera. Verifique se você permitiu o uso da câmera para o DoToWin."
      );

      setCameraAberta(false);
      setTarefaSelecionada(
        null
      );
    }
  }

  function pararCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current =
        null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }
  }

  function limparFotoCapturada() {
    if (fotoPreview) {
      URL.revokeObjectURL(
        fotoPreview
      );
    }

    setFotoCapturada(null);
    setFotoPreview(null);
  }

  function fecharCamera() {
    pararCamera();
    limparFotoCapturada();

    setCameraAberta(false);

    setTarefaSelecionada(
      null
    );

    setIniciandoCamera(false);
  }

  function tirarFoto() {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (!video || !canvas) {
      setMensagemErro(
        "A câmera ainda não está pronta."
      );

      return;
    }

    const largura =
      video.videoWidth;

    const altura =
      video.videoHeight;

    if (
      !largura ||
      !altura
    ) {
      setMensagemErro(
        "A câmera ainda está carregando. Tente novamente em alguns segundos."
      );

      return;
    }

    canvas.width =
      largura;

    canvas.height =
      altura;

    const contexto =
      canvas.getContext("2d");

    if (!contexto) {
      setMensagemErro(
        "Não foi possível capturar a foto."
      );

      return;
    }

    contexto.drawImage(
      video,
      0,
      0,
      largura,
      altura
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMensagemErro(
            "Não foi possível gerar a foto."
          );

          return;
        }

        if (fotoPreview) {
          URL.revokeObjectURL(
            fotoPreview
          );
        }

        const preview =
          URL.createObjectURL(
            blob
          );

        setFotoCapturada(
          blob
        );

        setFotoPreview(
          preview
        );

        pararCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  async function tirarOutraFoto() {
    limparFotoCapturada();
    await iniciarCamera();
  }

  async function usarFoto() {
    if (
      !fotoCapturada ||
      !tarefaSelecionada ||
      !jogadorAtual
    ) {
      setMensagemErro(
        "Nenhuma foto foi capturada."
      );

      return;
    }

    const tarefa =
      tarefaSelecionada;

    setTarefaEmAtualizacao(
      tarefa.id
    );

    setMensagemErro("");

    const nomeArquivo =
      `task-${tarefa.id}-player-${jogadorAtual.id}-${Date.now()}.jpg`;

    const caminhoArquivo =
      `tasks/${nomeArquivo}`;

    const {
      error: erroUpload,
    } = await supabase.storage
      .from("task-photos")
      .upload(
        caminhoArquivo,
        fotoCapturada,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            "image/jpeg",
        }
      );

    if (erroUpload) {
      console.error(
        "Erro ao enviar foto:",
        erroUpload
      );

      setMensagemErro(
        "Não foi possível enviar a foto."
      );

      setTarefaEmAtualizacao(
        null
      );

      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("task-photos")
      .getPublicUrl(
        caminhoArquivo
      );

    const {
      data,
      error,
    } = await supabase.rpc(
      "submit_task",
      {
        p_task_id:
          tarefa.id,
        p_photo_url:
          publicUrl,
      }
    );

    if (error) {
      console.error(
        "Erro ao registrar submissão:",
        error
      );

      let mensagem =
        "A foto foi enviada, mas não foi possível registrar a tarefa.";

      const erroTexto =
        `${error.message || ""} ${
          error.details || ""
        }`.toLowerCase();

      if (
        erroTexto.includes(
          "task already completed"
        )
      ) {
        mensagem =
          "Essa tarefa já foi concluída.";
      } else if (
        erroTexto.includes(
          "already awaiting approval"
        )
      ) {
        mensagem =
          "Essa tarefa já está aguardando aprovação.";
      } else if (
        erroTexto.includes(
          "player is not part of this game"
        )
      ) {
        mensagem =
          "Você não pertence à partida desta tarefa.";
      } else if (
        erroTexto.includes(
          "task not found"
        )
      ) {
        mensagem =
          "Essa tarefa não foi encontrada.";
      }

      setMensagemErro(
        mensagem
      );

      setTarefaEmAtualizacao(
        null
      );

      return;
    }

    const resultado =
      Array.isArray(data)
        ? data[0]
        : data;

    if (resultado) {
      const submissaoAtualizada: Submissao =
        {
          id:
            resultado.id,
          taskId:
            resultado.task_id,
          playerId:
            resultado.player_id,
          status:
            resultado.status as StatusSubmissao,
          photoUrl:
            resultado.photo_url ||
            null,
        };

      setSubmissoes(
        (atuais) => {
          const existe =
            atuais.some(
              (item) =>
                item.id ===
                submissaoAtualizada.id
            );

          if (existe) {
            return atuais.map(
              (item) =>
                item.id ===
                submissaoAtualizada.id
                  ? submissaoAtualizada
                  : item
            );
          }

          return [
            submissaoAtualizada,
            ...atuais,
          ];
        }
      );
    }

    setTarefaEmAtualizacao(
      null
    );

    fecharCamera();
  }

  const statusDasTarefas =
    tarefas.map((tarefa) => {
      const submissao =
        buscarSubmissao(
          tarefa.id
        );

      return {
        tarefa,
        submissao,
        status:
          submissao?.status ||
          ("Pendente" as StatusSubmissao),
      };
    });

  const disponiveis =
    statusDasTarefas.filter(
      (item) =>
        item.status ===
        "Pendente"
    ).length;

  const aguardando =
    statusDasTarefas.filter(
      (item) =>
        item.status ===
        "Aguardando aprovação"
    ).length;

  const concluidas =
    statusDasTarefas.filter(
      (item) =>
        item.status ===
        "Concluída"
    ).length;

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {cameraAberta &&
        tarefaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#01040c]/95 p-3 backdrop-blur-xl">
            <div className="flex max-h-[96vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#061329] shadow-[0_30px_100px_rgba(0,0,0,.7)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[0.25em] text-cyan-400">
                    COMPROVAÇÃO
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black">
                    {
                      tarefaSelecionada.titulo
                    }
                  </h2>
                </div>

                <button
                  onClick={
                    fecharCamera
                  }
                  disabled={
                    tarefaEmAtualizacao ===
                    tarefaSelecionada.id
                  }
                  className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg text-slate-300 transition hover:bg-white/[0.1] disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden bg-black">
                {!fotoPreview && (
                  <>
                    <video
                      ref={
                        videoRef
                      }
                      autoPlay
                      playsInline
                      muted
                      className="h-full max-h-[65vh] w-full object-cover"
                    />

                    <div className="pointer-events-none absolute inset-0 border-[2px] border-white/[0.04]" />

                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/20" />

                    {iniciandoCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <div className="text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />

                          <p className="mt-3 text-sm font-bold text-slate-300">
                            Abrindo câmera...
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {fotoPreview && (
                  <img
                    src={
                      fotoPreview
                    }
                    alt="Foto capturada agora"
                    className="h-full max-h-[65vh] w-full object-contain"
                  />
                )}
              </div>

              <div className="border-t border-white/[0.07] p-4 sm:p-5">
                {!fotoPreview ? (
                  <>
                    <p className="mb-4 text-center text-xs text-slate-400">
                      Tire a foto agora para comprovar a tarefa.
                    </p>

                    <button
                      onClick={
                        tirarFoto
                      }
                      disabled={
                        iniciandoCamera
                      }
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-4 text-sm font-black tracking-wide shadow-[0_12px_35px_rgba(59,130,246,.3)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white">
                        ●
                      </span>

                      TIRAR FOTO
                    </button>
                  </>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={
                        tirarOutraFoto
                      }
                      disabled={
                        tarefaEmAtualizacao ===
                        tarefaSelecionada.id
                      }
                      className="rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-4 text-sm font-black text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      TIRAR OUTRA
                    </button>

                    <button
                      onClick={
                        usarFoto
                      }
                      disabled={
                        tarefaEmAtualizacao ===
                        tarefaSelecionada.id
                      }
                      className="rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-4 text-sm font-black text-[#02110c] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tarefaEmAtualizacao ===
                      tarefaSelecionada.id
                        ? "ENVIANDO..."
                        : "USAR FOTO"}
                    </button>
                  </div>
                )}

                <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-500">
                  A comprovação precisa ser registrada pela câmera neste momento.
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="mx-auto max-w-[1100px] p-5">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/"
              className="mb-3 inline-block text-sm font-bold text-slate-400 transition hover:text-white"
            >
              ← Voltar ao jogo
            </a>

            <p className="text-xs font-black tracking-[0.25em] text-cyan-400">
              DOTOWIN
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Tarefas da partida
            </h1>

            <p className="mt-2 max-w-xl text-sm text-slate-400">
              As mesmas tarefas para todos. Cada jogador avança no seu próprio ritmo.
            </p>
          </div>

          {jogadorAtual && (
            <div
              ref={menuPerfilRef}
              className="relative"
            >
              <button
                onClick={() =>
                  setMenuPerfilAberto(
                    (aberto) => !aberto
                  )
                }
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#071329] px-3 py-2.5 transition hover:border-white/[0.14] hover:bg-[#091832]"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      jogadorAtual.cor,
                    boxShadow: `0 0 10px ${jogadorAtual.cor}`,
                  }}
                />

                <div className="hidden text-left sm:block">
                  <p className="max-w-[150px] truncate text-xs font-black">
                    {jogadorAtual.nome}
                  </p>

                  <p className="text-[9px] font-bold text-slate-500">
                    {ehAdministrador
                      ? "Administrador"
                      : "Jogador"}
                  </p>
                </div>

                <span
                  className={`text-xs text-slate-400 transition ${
                    menuPerfilAberto
                      ? "rotate-180"
                      : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {menuPerfilAberto && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#08152b] p-2 shadow-[0_20px_60px_rgba(0,0,0,.55)]">
                  <div className="border-b border-white/[0.06] px-3 py-3 sm:hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            jogadorAtual.cor,
                        }}
                      />

                      <p className="truncate text-sm font-black">
                        {jogadorAtual.nome}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={
                      trocarPartida
                    }
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>
                      Trocar partida
                    </span>

                    <span className="text-slate-500">
                      →
                    </span>
                  </button>

                  <button
                    onClick={sair}
                    className="mt-1 w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-400/[0.08]"
                  >
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {jogadorAtual && (
          <section className="mb-6 rounded-2xl border border-white/[0.07] bg-[#071329] p-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
              JOGANDO COMO
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
                {jogadorAtual.nome}
              </p>

              {ehAdministrador && (
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-black tracking-wider text-cyan-300">
                  ADMIN
                </span>
              )}
            </div>
          </section>
        )}

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm font-bold text-red-300">
            {
              mensagemErro
            }
          </div>
        )}

        {ehAdministrador &&
          mostrarFormulario && (
            <section className="mb-6 rounded-2xl border border-cyan-300/15 bg-[#071329] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-cyan-400">
                    NOVA TAREFA DA PARTIDA
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Todos os jogadores receberão esta tarefa
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setMostrarFormulario(
                      false
                    );

                    setTitulo("");

                    setCategoria("");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4">
                <input
                  value={titulo}
                  onChange={(
                    event
                  ) =>
                    setTitulo(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Caminhar por 30 minutos"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#020b1c] px-4 py-3 text-sm text-white outline-none"
                />

                <input
                  value={
                    categoria
                  }
                  onChange={(
                    event
                  ) =>
                    setCategoria(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Saúde"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#020b1c] px-4 py-3 text-sm text-white outline-none"
                />

                <button
                  onClick={
                    adicionarTarefa
                  }
                  disabled={
                    salvando ||
                    !titulo.trim()
                  }
                  className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-3 text-sm font-black disabled:opacity-50"
                >
                  {salvando
                    ? "SALVANDO..."
                    : "CRIAR PARA TODOS"}
                </button>
              </div>
            </section>
          )}

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#071329] p-4">
            <p className="text-xs text-slate-500">
              PENDENTES
            </p>

            <p className="mt-1 text-2xl font-black">
              {disponiveis}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-300/15 bg-orange-300/[0.04] p-4">
            <p className="text-xs text-orange-300/70">
              AGUARDANDO
            </p>

            <p className="mt-1 text-2xl font-black text-orange-300">
              {aguardando}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
            <p className="text-xs text-emerald-300/70">
              CONCLUÍDAS
            </p>

            <p className="mt-1 text-2xl font-black text-emerald-300">
              {concluidas}
            </p>
          </div>
        </section>

        {ehAdministrador && (
          <div className="mb-5 flex justify-end">
            <button
              onClick={() => {
                setMostrarFormulario(
                  true
                );

                setMensagemErro(
                  ""
                );
              }}
              className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-3 text-sm font-black shadow-[0_12px_35px_rgba(59,130,246,.25)] transition hover:scale-[1.02]"
            >
              + NOVA TAREFA
            </button>
          </div>
        )}

        {carregando && (
          <div className="rounded-2xl bg-[#071329] p-6 text-center text-slate-400">
            Identificando jogador...
          </div>
        )}

        {!carregando &&
          jogadorAtual && (
            <section className="space-y-3">
              {tarefas.length ===
                0 && (
                <div className="rounded-2xl border border-white/[0.07] bg-[#071329] p-8 text-center">
                  <p className="text-lg font-black">
                    Nenhuma tarefa na partida
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {ehAdministrador
                      ? "Crie a primeira tarefa para começar a corrida."
                      : "O administrador ainda não definiu as tarefas."}
                  </p>
                </div>
              )}

              {statusDasTarefas.map(
                ({
                  tarefa,
                  status,
                }) => {
                  const atualizando =
                    tarefaEmAtualizacao ===
                    tarefa.id;

                  return (
                    <article
                      key={
                        tarefa.id
                      }
                      className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#071329] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-slate-400">
                            {
                              tarefa.categoria
                            }
                          </span>

                          {status ===
                            "Aguardando aprovação" && (
                            <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold text-orange-300">
                              Aguardando aprovação
                            </span>
                          )}

                          {status ===
                            "Concluída" && (
                            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                              Aprovada
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-black">
                          {
                            tarefa.titulo
                          }
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          +1 casa para cada jogador que concluir
                        </p>
                      </div>

                      {status ===
                        "Pendente" && (
                        <button
                          onClick={() =>
                            abrirCamera(
                              tarefa
                            )
                          }
                          disabled={
                            atualizando
                          }
                          className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50"
                        >
                          {atualizando
                            ? "ENVIANDO FOTO..."
                            : "CONCLUIR"}
                        </button>
                      )}

                      {status ===
                        "Aguardando aprovação" && (
                        <div className="rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-5 py-3 text-sm font-bold text-orange-300">
                          Aguardando aprovação
                        </div>
                      )}

                      {status ===
                        "Concluída" && (
                        <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-5 py-3 text-sm font-black text-emerald-300">
                          ✓ +1 CASA
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </section>
          )}

        <section className="mt-6 rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] to-cyan-400/[0.04] p-5">
          <p className="text-xs font-black text-violet-300">
            COMO FUNCIONA
          </p>

          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            O administrador define as tarefas da partida.
            Todos recebem as mesmas missões. Cada jogador
            registra uma foto naquele momento e, quando ela
            for aprovada por outro jogador, avança uma casa.
          </p>
        </section>
      </div>
    </main>
  );
}