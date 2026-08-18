"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StatusSubmissao =
  | "Pendente"
  | "Aguardando aprovação"
  | "Concluída";

type ModoRepeticao =
  | "once"
  | "daily"
  | "weekdays"
  | "custom";

type EstadoHorario =
  | "disponivel"
  | "ainda_nao"
  | "encerrada";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  avatar: string | null;
  gameId: number;
};

type Tarefa = {
  id: number;
  titulo: string;
  categoria: string;
  repeatMode: ModoRepeticao;
  repeatDays: number[];
  availableFrom: string | null;
  availableUntil: string | null;
};

type Submissao = {
  id: number;
  taskId: number;
  playerId: number;
  status: StatusSubmissao;
  photoUrl: string | null;
  occurrenceDate: string | null;
};

const diasSemana = [
  {
    numero: 0,
    curto: "Dom",
    nome: "Domingo",
  },
  {
    numero: 1,
    curto: "Seg",
    nome: "Segunda",
  },
  {
    numero: 2,
    curto: "Ter",
    nome: "Terça",
  },
  {
    numero: 3,
    curto: "Qua",
    nome: "Quarta",
  },
  {
    numero: 4,
    curto: "Qui",
    nome: "Quinta",
  },
  {
    numero: 5,
    curto: "Sex",
    nome: "Sexta",
  },
  {
    numero: 6,
    curto: "Sáb",
    nome: "Sábado",
  },
];

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
        className="absolute bottom-[6px] left-1/2 h-4 w-6 -translate-x-1/2 rounded-t-full border-x-2 border-white"
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className="absolute bottom-0 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full border-2 border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 3px 8px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

function normalizarStatus(
  status: string | null
): StatusSubmissao {
  if (
    status === "waiting" ||
    status ===
      "Aguardando aprovação"
  ) {
    return "Aguardando aprovação";
  }

  if (
    status === "approved" ||
    status === "Concluída"
  ) {
    return "Concluída";
  }

  return "Pendente";
}

function formatarHora(
  hora: string | null
) {
  if (!hora) {
    return null;
  }

  return hora.slice(0, 5);
}

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

function obterAgoraBrasil(
  timestamp: number
) {
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
    ).formatToParts(
      new Date(timestamp)
    );

  const mapa =
    Object.fromEntries(
      partes.map((parte) => [
        parte.type,
        parte.value,
      ])
    );

  const data =
    `${mapa.year}-${mapa.month}-${mapa.day}`;

  const ano =
    Number(mapa.year);

  const mes =
    Number(mapa.month);

  const dia =
    Number(mapa.day);

  const diaSemana =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia
      )
    ).getUTCDay();

  return {
    data,
    minutos:
      Number(mapa.hour) *
        60 +
      Number(mapa.minute),
    diaSemana,
  };
}

function tarefaProgramadaHoje(
  tarefa: Tarefa,
  diaSemana: number
) {
  if (
    tarefa.repeatMode ===
    "once"
  ) {
    return true;
  }

  if (
    tarefa.repeatMode ===
    "daily"
  ) {
    return true;
  }

  if (
    tarefa.repeatMode ===
    "weekdays"
  ) {
    return (
      diaSemana >= 1 &&
      diaSemana <= 5
    );
  }

  if (
    tarefa.repeatMode ===
    "custom"
  ) {
    return tarefa.repeatDays.includes(
      diaSemana
    );
  }

  return false;
}

function obterEstadoHorario(
  tarefa: Tarefa,
  agoraMinutos: number
): EstadoHorario {
  if (
    tarefa.repeatMode ===
    "once"
  ) {
    return "disponivel";
  }

  const inicio =
    horaEmMinutos(
      tarefa.availableFrom
    );

  const fim =
    horaEmMinutos(
      tarefa.availableUntil
    );

  if (
    inicio !== null &&
    agoraMinutos < inicio
  ) {
    return "ainda_nao";
  }

  if (
    fim !== null &&
    agoraMinutos > fim
  ) {
    return "encerrada";
  }

  return "disponivel";
}

function textoHorario(
  tarefa: Tarefa
) {
  if (
    tarefa.repeatMode ===
    "once"
  ) {
    return "Uma vez";
  }

  const inicio =
    formatarHora(
      tarefa.availableFrom
    );

  const fim =
    formatarHora(
      tarefa.availableUntil
    );

  if (inicio && fim) {
    return `${inicio} → ${fim}`;
  }

  if (inicio) {
    return `A partir de ${inicio}`;
  }

  if (fim) {
    return `Até ${fim}`;
  }

  return "Dia todo";
}

function textoRepeticao(
  tarefa: Tarefa
) {
  if (
    tarefa.repeatMode ===
    "once"
  ) {
    return "Uma vez";
  }

  if (
    tarefa.repeatMode ===
    "daily"
  ) {
    return "Todos os dias";
  }

  if (
    tarefa.repeatMode ===
    "weekdays"
  ) {
    return "Dias da semana";
  }

  if (
    tarefa.repeatMode ===
    "custom"
  ) {
    const selecionados =
      diasSemana
        .filter((dia) =>
          tarefa.repeatDays.includes(
            dia.numero
          )
        )
        .map(
          (dia) => dia.curto
        );

    if (
      selecionados.length ===
      0
    ) {
      return "Personalizado";
    }

    return selecionados.join(
      ", "
    );
  }

  return "Uma vez";
}

export default function TarefasPage() {
  const router = useRouter();

  const [tarefas, setTarefas] =
    useState<Tarefa[]>([]);

  const [submissoes, setSubmissoes] =
    useState<Submissao[]>([]);

  const [
    jogadorAtual,
    setJogadorAtual,
  ] =
    useState<Jogador | null>(
      null
    );

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

  const [
    modoRepeticao,
    setModoRepeticao,
  ] =
    useState<ModoRepeticao>(
      "once"
    );

  const [
    diasPersonalizados,
    setDiasPersonalizados,
  ] =
    useState<number[]>([]);

  const [
    horarioInicio,
    setHorarioInicio,
  ] = useState("");

  const [
    horarioFim,
    setHorarioFim,
  ] = useState("");

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
  ] =
    useState<number | null>(
      null
    );

  const [
    tarefaSelecionada,
    setTarefaSelecionada,
  ] =
    useState<Tarefa | null>(
      null
    );

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
  ] =
    useState<Blob | null>(
      null
    );

  const [
    fotoPreview,
    setFotoPreview,
  ] =
    useState<string | null>(
      null
    );

  const [agora, setAgora] =
    useState(() =>
      Date.now()
    );

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const menuPerfilRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const intervalo =
      window.setInterval(() => {
        setAgora(Date.now());
      }, 30000);

    return () => {
      window.clearInterval(
        intervalo
      );
    };
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
          table:
            "submissions",
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          carregarDados(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        canal
      );
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
        setMenuPerfilAberto(
          false
        );
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

    if (
      erroUsuario ||
      !user
    ) {
      router.push("/login");
      return;
    }

    const gameIdSalvo =
      localStorage.getItem(
        "dotowin_game_id"
      );

    if (!gameIdSalvo) {
      router.push(
        "/partidas"
      );
      return;
    }

    const gameId =
      Number(gameIdSalvo);

    if (
      !Number.isFinite(
        gameId
      )
    ) {
      localStorage.removeItem(
        "dotowin_game_id"
      );

      router.push(
        "/partidas"
      );
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
        .maybeSingle(),

      supabase
        .from("games")
        .select(
          "id, admin_profile_id"
        )
        .eq(
          "id",
          gameId
        )
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
        nome:
          jogadorData.name,
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

    const [
      {
        data: tarefasData,
        error: erroTarefas,
      },
      {
        data: submissoesData,
        error:
          erroSubmissoes,
      },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, category, repeat_mode, repeat_days, available_from, available_until, created_at, game_id"
        )
        .eq(
          "game_id",
          jogadorFormatado.gameId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from("submissions")
        .select(
          "id, task_id, player_id, status, photo_url, occurrence_date"
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

    if (
      erroSubmissoes
    ) {
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
        (item) => {
          let repeatMode: ModoRepeticao =
            "once";

          if (
            item.repeat_mode ===
              "daily" ||
            item.repeat_mode ===
              "weekdays" ||
            item.repeat_mode ===
              "custom"
          ) {
            repeatMode =
              item.repeat_mode;
          }

          return {
            id: item.id,
            titulo:
              item.title,
            categoria:
              item.category ||
              "Geral",
            repeatMode,
            repeatDays:
              Array.isArray(
                item.repeat_days
              )
                ? item.repeat_days
                : [],
            availableFrom:
              item.available_from ||
              null,
            availableUntil:
              item.available_until ||
              null,
          };
        }
      );

    const submissoesFormatadas: Submissao[] =
      (
        submissoesData ||
        []
      ).map(
        (item) => ({
          id: item.id,
          taskId:
            item.task_id,
          playerId:
            item.player_id,
          status:
            normalizarStatus(
              item.status
            ),
          photoUrl:
            item.photo_url ||
            null,
          occurrenceDate:
            item.occurrence_date ||
            null,
        })
      );

    setTarefas(
      tarefasFormatadas
    );

    setSubmissoes(
      submissoesFormatadas
    );

    setAgora(Date.now());
    setCarregando(false);
  }

  function limparFormulario() {
    setTitulo("");
    setCategoria("");

    setModoRepeticao(
      "once"
    );

    setDiasPersonalizados(
      []
    );

    setHorarioInicio("");
    setHorarioFim("");
  }

  function trocarDiaPersonalizado(
    dia: number
  ) {
    setDiasPersonalizados(
      (diasAtuais) => {
        if (
          diasAtuais.includes(
            dia
          )
        ) {
          return diasAtuais.filter(
            (item) =>
              item !== dia
          );
        }

        return [
          ...diasAtuais,
          dia,
        ].sort(
          (a, b) =>
            a - b
        );
      }
    );

    setMensagemErro("");
  }

  function trocarPartida() {
    setMenuPerfilAberto(
      false
    );

    localStorage.removeItem(
      "dotowin_game_id"
    );

    router.push(
      "/partidas"
    );
  }

  async function sair() {
    setMenuPerfilAberto(
      false
    );

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
      setMensagemErro(
        "Digite o nome da tarefa."
      );
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

    if (
      modoRepeticao ===
        "custom" &&
      diasPersonalizados.length ===
        0
    ) {
      setMensagemErro(
        "Escolha pelo menos um dia da semana."
      );
      return;
    }

    if (
      modoRepeticao !==
        "once" &&
      horarioInicio &&
      horarioFim
    ) {
      const inicio =
        horaEmMinutos(
          horarioInicio
        );

      const fim =
        horaEmMinutos(
          horarioFim
        );

      if (
        inicio !== null &&
        fim !== null &&
        fim <= inicio
      ) {
        setMensagemErro(
          "O horário final precisa ser depois do horário inicial."
        );
        return;
      }
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

          status:
            "Pendente",

          game_id:
            jogadorAtual.gameId,

          repeat_mode:
            modoRepeticao,

          repeat_days:
            modoRepeticao ===
              "custom"
              ? diasPersonalizados
              : null,

          available_from:
            modoRepeticao !==
              "once" &&
            horarioInicio
              ? horarioInicio
              : null,

          available_until:
            modoRepeticao !==
              "once" &&
            horarioFim
              ? horarioFim
              : null,
        })
        .select(
          "id, title, category, repeat_mode, repeat_days, available_from, available_until"
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

    let repeatModeNova: ModoRepeticao =
      "once";

    if (
      data.repeat_mode ===
        "daily" ||
      data.repeat_mode ===
        "weekdays" ||
      data.repeat_mode ===
        "custom"
    ) {
      repeatModeNova =
        data.repeat_mode;
    }

    const novaTarefa: Tarefa =
      {
        id: data.id,

        titulo:
          data.title,

        categoria:
          data.category ||
          "Geral",

        repeatMode:
          repeatModeNova,

        repeatDays:
          Array.isArray(
            data.repeat_days
          )
            ? data.repeat_days
            : [],

        availableFrom:
          data.available_from ||
          null,

        availableUntil:
          data.available_until ||
          null,
      };

    setTarefas(
      (tarefasAtuais) => [
        novaTarefa,
        ...tarefasAtuais,
      ]
    );

    limparFormulario();

    setMostrarFormulario(
      false
    );

    setSalvando(false);
  }

  const agoraBrasil =
    obterAgoraBrasil(agora);

  function buscarSubmissao(
    tarefa: Tarefa
  ) {
    if (!jogadorAtual) {
      return undefined;
    }

    return submissoes.find(
      (submissao) => {
        if (
          submissao.taskId !==
            tarefa.id ||
          submissao.playerId !==
            jogadorAtual.id
        ) {
          return false;
        }

        if (
          tarefa.repeatMode !==
          "once"
        ) {
          return (
            submissao.occurrenceDate ===
            agoraBrasil.data
          );
        }

        return (
          submissao.occurrenceDate ===
          null
        );
      }
    );
  }  function abrirCamera(
    tarefa: Tarefa
  ) {
    if (!jogadorAtual) {
      setMensagemErro(
        "Não foi possível identificar seu jogador."
      );

      return;
    }

    const programadaHoje =
      tarefaProgramadaHoje(
        tarefa,
        agoraBrasil.diaSemana
      );

    if (!programadaHoje) {
      setMensagemErro(
        "Essa tarefa não está programada para hoje."
      );
      return;
    }

    const estado =
      obterEstadoHorario(
        tarefa,
        agoraBrasil.minutos
      );

    if (
      estado ===
      "ainda_nao"
    ) {
      setMensagemErro(
        `Essa tarefa ainda não está disponível. ${
          tarefa.availableFrom
            ? `Ela começa às ${formatarHora(
                tarefa.availableFrom
              )}.`
            : ""
        }`
      );
      return;
    }

    if (
      estado ===
      "encerrada"
    ) {
      setMensagemErro(
        `O prazo desta tarefa terminou hoje${
          tarefa.availableUntil
            ? ` às ${formatarHora(
                tarefa.availableUntil
              )}`
            : ""
        }.`
      );
      return;
    }

    limparFotoCapturada();

    setMensagemErro("");

    setTarefaSelecionada(
      tarefa
    );

    setCameraAberta(
      true
    );
  }

  async function iniciarCamera() {
    setIniciandoCamera(
      true
    );

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

      setIniciandoCamera(
        false
      );

      setMensagemErro(
        "Não foi possível acessar a câmera. Verifique se você permitiu o uso da câmera para o DoToWin."
      );

      setCameraAberta(
        false
      );

      setTarefaSelecionada(
        null
      );
    }
  }

  function pararCamera() {
    if (
      streamRef.current
    ) {
      streamRef.current
        .getTracks()
        .forEach(
          (track) => {
            track.stop();
          }
        );

      streamRef.current =
        null;
    }

    if (
      videoRef.current
    ) {
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

    setFotoCapturada(
      null
    );

    setFotoPreview(
      null
    );
  }

  function fecharCamera() {
    pararCamera();
    limparFotoCapturada();

    setCameraAberta(
      false
    );

    setTarefaSelecionada(
      null
    );

    setIniciandoCamera(
      false
    );
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
      canvas.getContext(
        "2d"
      );

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

        if (
          fotoPreview
        ) {
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

    const agoraAtual =
      obterAgoraBrasil(
        Date.now()
      );

    const programadaHoje =
      tarefaProgramadaHoje(
        tarefa,
        agoraAtual.diaSemana
      );

    if (!programadaHoje) {
      fecharCamera();

      setMensagemErro(
        "Essa tarefa não está programada para hoje."
      );

      return;
    }

    const estado =
      obterEstadoHorario(
        tarefa,
        agoraAtual.minutos
      );

    if (
      estado !==
      "disponivel"
    ) {
      fecharCamera();

      setMensagemErro(
        estado ===
          "ainda_nao"
          ? "Essa tarefa ainda não está disponível."
          : "O prazo desta tarefa terminou hoje."
      );

      return;
    }

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
    } =
      await supabase.storage
        .from("task-photos")
        .upload(
          caminhoArquivo,
          fotoCapturada,
          {
            cacheControl:
              "3600",
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
    } =
      supabase.storage
        .from("task-photos")
        .getPublicUrl(
          caminhoArquivo
        );

    const { error } =
      await supabase.rpc(
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
        `${
          error.message || ""
        } ${
          error.details || ""
        }`.toLowerCase();

      if (
        erroTexto.includes(
          "task already submitted today"
        )
      ) {
        mensagem =
          "Você já enviou essa tarefa hoje.";
      } else if (
        erroTexto.includes(
          "task already submitted"
        )
      ) {
        mensagem =
          "Essa tarefa já foi enviada.";
      } else if (
        erroTexto.includes(
          "task is not available yet"
        )
      ) {
        mensagem =
          "Essa tarefa ainda não está disponível.";
      } else if (
        erroTexto.includes(
          "task is no longer available today"
        )
      ) {
        mensagem =
          "O prazo dessa tarefa terminou hoje.";
      } else if (
        erroTexto.includes(
          "task is not scheduled for today"
        )
      ) {
        mensagem =
          "Essa tarefa não está programada para hoje.";
      } else if (
        erroTexto.includes(
          "player is not in this game"
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

    setTarefaEmAtualizacao(
      null
    );

    fecharCamera();

    await carregarDados(
      true
    );
  }

  const statusDasTarefas =
    tarefas.map(
      (tarefa) => {
        const submissao =
          buscarSubmissao(
            tarefa
          );

        const programadaHoje =
          tarefaProgramadaHoje(
            tarefa,
            agoraBrasil.diaSemana
          );

        const estadoHorario =
          obterEstadoHorario(
            tarefa,
            agoraBrasil.minutos
          );

        return {
          tarefa,
          submissao,
          programadaHoje,
          estadoHorario,
          status:
            submissao?.status ||
            ("Pendente" as StatusSubmissao),
        };
      }
    );

  const disponiveis =
    statusDasTarefas.filter(
      (item) =>
        item.programadaHoje &&
        item.status ===
          "Pendente" &&
        item.estadoHorario ===
          "disponivel"
    ).length;

  const aguardando =
    statusDasTarefas.filter(
      (item) =>
        item.programadaHoje &&
        item.status ===
          "Aguardando aprovação"
    ).length;

  const concluidas =
    statusDasTarefas.filter(
      (item) =>
        item.programadaHoje &&
        item.status ===
          "Concluída"
    ).length;  return (
    <main className="min-h-screen bg-[#F5F8FC] pb-24 text-[#1F2937] lg:pb-10">
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {cameraAberta &&
        tarefaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/90 p-3 backdrop-blur-md">
            <div className="flex max-h-[96vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(0,0,0,.35)]">
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#22C7D9]">
                    COMPROVAÇÃO
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black">
                    {
                      tarefaSelecionada.titulo
                    }
                  </h2>

                  {tarefaSelecionada.repeatMode !==
                    "once" && (
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Hoje •{" "}
                      {textoHorario(
                        tarefaSelecionada
                      )}
                    </p>
                  )}
                </div>

                <button
                  onClick={
                    fecharCamera
                  }
                  disabled={
                    tarefaEmAtualizacao ===
                    tarefaSelecionada.id
                  }
                  className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-lg text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
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

                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-2 border-white/30" />

                    {iniciandoCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <div className="text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#22C7D9]" />

                          <p className="mt-3 text-sm font-bold text-white">
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

              <div className="border-t border-slate-100 p-4 sm:p-5">
                {!fotoPreview ? (
                  <>
                    <p className="mb-4 text-center text-xs text-slate-500">
                      Tire a foto agora para comprovar a tarefa.
                    </p>

                    <button
                      onClick={
                        tirarFoto
                      }
                      disabled={
                        iniciandoCamera
                      }
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#22C7D9] px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="rounded-2xl bg-[#F5F8FC] px-5 py-4 text-sm font-black text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
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
                      className="rounded-2xl bg-[#22C55E] px-5 py-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(34,197,94,.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tarefaEmAtualizacao ===
                      tarefaSelecionada.id
                        ? "ENVIANDO..."
                        : "USAR FOTO"}
                    </button>
                  </div>
                )}

                <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
                  A comprovação precisa ser registrada pela câmera neste momento.
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 lg:py-6">
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
            <div
              ref={
                menuPerfilRef
              }
              className="relative"
            >
              <button
                onClick={() =>
                  setMenuPerfilAberto(
                    (aberto) =>
                      !aberto
                  )
                }
                className="flex items-center gap-3 rounded-2xl bg-[#F8FBFE] px-3 py-2.5 transition hover:bg-slate-100"
              >
                <PeaoMini
                  cor={
                    jogadorAtual.cor
                  }
                  avatar={
                    jogadorAtual.avatar
                  }
                />

                <div className="hidden text-left sm:block">
                  <p className="max-w-[150px] truncate text-xs font-black">
                    {
                      jogadorAtual.nome
                    }
                  </p>

                  <p className="text-[9px] font-bold text-slate-400">
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
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-2xl bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,.15)]">
                  <div className="border-b border-slate-100 px-3 py-3 sm:hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            jogadorAtual.cor,
                        }}
                      />

                      <p className="truncate text-sm font-black">
                        {
                          jogadorAtual.nome
                        }
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/personalizar"
                    onClick={() =>
                      setMenuPerfilAberto(
                        false
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-[#F5F8FC]"
                  >
                    <span>
                      Trocar avatar
                    </span>

                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          jogadorAtual.cor,
                      }}
                    />
                  </Link>

                  <button
                    onClick={
                      trocarPartida
                    }
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-[#F5F8FC]"
                  >
                    <span>
                      Trocar partida
                    </span>

                    <span className="text-slate-400">
                      →
                    </span>
                  </button>

                  <button
                    onClick={sair}
                    className="mt-1 w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
                  >
                    Sair da conta
                  </button>
                </div>
              )}
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
          <p className="text-[10px] font-black tracking-[0.24em] text-[#22C7D9]">
            TAREFAS
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            O que falta fazer?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            Cada tarefa vale +1 casa. Tarefas recorrentes aparecem novamente nos dias programados.
          </p>
        </section>

        {mensagemErro && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {mensagemErro}
          </div>
        )}

        {jogadorAtual && (
          <section className="mb-5 flex flex-col gap-3 rounded-[24px] bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,.05)] sm:flex-row sm:items-center sm:justify-between">
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
                  JOGANDO COMO
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <p className="font-black">
                    {
                      jogadorAtual.nome
                    }
                  </p>

                  {ehAdministrador && (
                    <span className="rounded-full bg-[#EAF8FB] px-2 py-1 text-[8px] font-black tracking-wider text-[#1594A3]">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {ehAdministrador && (
              <button
                onClick={() => {
                  setMostrarFormulario(
                    true
                  );

                  setMensagemErro(
                    ""
                  );
                }}
                className="rounded-2xl bg-[#22C7D9] px-5 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(34,199,217,.16)] transition hover:-translate-y-0.5"
              >
                + Nova tarefa
              </button>
            )}
          </section>
        )}

        {ehAdministrador &&
          mostrarFormulario && (
            <section className="mb-5 rounded-[28px] bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,.06)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#22C7D9]">
                    NOVA TAREFA
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Criar para todos
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Escolha quando esta tarefa deverá aparecer para os jogadores.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMostrarFormulario(
                      false
                    );

                    limparFormulario();

                    setMensagemErro(
                      ""
                    );
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-slate-400 transition hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                      TAREFA
                    </label>

                    <span className="text-[9px] font-black text-red-600">* obrigatório</span>
                  </div>

                  <input
                    value={titulo}
                    onChange={(
                      event
                    ) =>
                      setTitulo(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Fazer caminhada"
                    className="mt-2 w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 text-sm font-bold outline-none transition placeholder:text-slate-300 focus:border-[#22C7D9]"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                      CATEGORIA
                    </label>

                    <span className="rounded-full bg-[#F5F8FC] px-2 py-1 text-[8px] font-black text-slate-400">
                      opcional
                    </span>
                  </div>

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
                    className="mt-2 w-full rounded-2xl border-2 border-[#E8EEF5] bg-[#F8FBFE] px-4 py-4 text-sm font-bold outline-none transition placeholder:text-slate-300 focus:border-[#22C7D9]"
                  />

                  <p className="mt-2 text-[10px] text-slate-400">
                    Se deixar em branco, será usada a categoria “Geral”.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                      REPETIÇÃO
                    </label>

                    <span className="text-[9px] font-black text-red-600">* obrigatório</span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModoRepeticao(
                          "once"
                        );

                        setDiasPersonalizados(
                          []
                        );

                        setHorarioInicio(
                          ""
                        );

                        setHorarioFim(
                          ""
                        );

                        setMensagemErro(
                          ""
                        );
                      }}
                      className={`rounded-[22px] border-2 p-4 text-left transition ${
                        modoRepeticao ===
                        "once"
                          ? "border-[#22C7D9] bg-[#EAF8FB]"
                          : "border-[#E8EEF5] bg-[#F8FBFE] hover:border-[#CFE9ED]"
                      }`}
                    >
                      <p
                        className={`text-sm font-black ${
                          modoRepeticao ===
                          "once"
                            ? "text-[#1594A3]"
                            : "text-slate-600"
                        }`}
                      >
                        Uma vez
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Cada jogador conclui uma única vez.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModoRepeticao(
                          "daily"
                        );

                        setDiasPersonalizados(
                          []
                        );

                        setMensagemErro(
                          ""
                        );
                      }}
                      className={`rounded-[22px] border-2 p-4 text-left transition ${
                        modoRepeticao ===
                        "daily"
                          ? "border-[#8B5CF6] bg-[#F1ECFF]"
                          : "border-[#E8EEF5] bg-[#F8FBFE] hover:border-[#DDD3FA]"
                      }`}
                    >
                      <p
                        className={`text-sm font-black ${
                          modoRepeticao ===
                          "daily"
                            ? "text-[#7C4BE8]"
                            : "text-slate-600"
                        }`}
                      >
                        Todos os dias
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Volta automaticamente todos os dias.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModoRepeticao(
                          "weekdays"
                        );

                        setDiasPersonalizados(
                          []
                        );

                        setMensagemErro(
                          ""
                        );
                      }}
                      className={`rounded-[22px] border-2 p-4 text-left transition ${
                        modoRepeticao ===
                        "weekdays"
                          ? "border-[#22C55E] bg-[#EEFBEF]"
                          : "border-[#E8EEF5] bg-[#F8FBFE] hover:border-[#CFEDD5]"
                      }`}
                    >
                      <p
                        className={`text-sm font-black ${
                          modoRepeticao ===
                          "weekdays"
                            ? "text-[#238A3A]"
                            : "text-slate-600"
                        }`}
                      >
                        Dias da semana
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Segunda a sexta-feira.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModoRepeticao(
                          "custom"
                        );

                        setMensagemErro(
                          ""
                        );
                      }}
                      className={`rounded-[22px] border-2 p-4 text-left transition ${
                        modoRepeticao ===
                        "custom"
                          ? "border-[#F97316] bg-[#FFF3EA]"
                          : "border-[#E8EEF5] bg-[#F8FBFE] hover:border-[#F8D7BD]"
                      }`}
                    >
                      <p
                        className={`text-sm font-black ${
                          modoRepeticao ===
                          "custom"
                            ? "text-[#E46611]"
                            : "text-slate-600"
                        }`}
                      >
                        Personalizado
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Escolha os dias da semana.
                      </p>
                    </button>
                  </div>
                </div>

                {modoRepeticao ===
                  "custom" && (
                  <div className="rounded-[22px] bg-[#FFF8F1] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-black tracking-[0.18em] text-[#E46611]">
                          DIAS DA SEMANA
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Escolha pelo menos um dia.
                        </p>
                      </div>

                      <span className="text-[9px] font-black text-red-600">* obrigatório</span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {diasSemana.map(
                        (dia) => {
                          const selecionado =
                            diasPersonalizados.includes(
                              dia.numero
                            );

                          return (
                            <button
                              key={
                                dia.numero
                              }
                              type="button"
                              title={
                                dia.nome
                              }
                              onClick={() =>
                                trocarDiaPersonalizado(
                                  dia.numero
                                )
                              }
                              className={`rounded-2xl px-2 py-3 text-xs font-black transition ${
                                selecionado
                                  ? "bg-[#F97316] text-white shadow-[0_6px_14px_rgba(249,115,22,.18)]"
                                  : "bg-white text-slate-400 shadow-sm hover:text-[#E46611]"
                              }`}
                            >
                              {
                                dia.curto
                              }
                            </button>
                          );
                        }
                      )}
                    </div>

                    {diasPersonalizados.length >
                      0 && (
                      <p className="mt-3 text-xs font-bold text-[#E46611]">
                        Repete:{" "}
                        {diasSemana
                          .filter(
                            (dia) =>
                              diasPersonalizados.includes(
                                dia.numero
                              )
                          )
                          .map(
                            (dia) =>
                              dia.curto
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {modoRepeticao !==
                  "once" && (
                  <div className="rounded-[22px] bg-[#F8F6FF] p-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-black tracking-[0.18em] text-[#8B5CF6]">
                          JANELA DO DIA
                        </p>

                        <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-slate-400">
                          opcional
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Sem horário, a tarefa fica disponível durante todo o dia em que estiver programada.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-black tracking-[0.14em] text-slate-400">
                            DISPONÍVEL A PARTIR DE
                          </label>

                          <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-slate-400">
                            opcional
                          </span>
                        </div>

                        <input
                          type="time"
                          value={
                            horarioInicio
                          }
                          onChange={(
                            event
                          ) =>
                            setHorarioInicio(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border-2 border-[#E8EEF5] bg-white px-4 py-3.5 text-sm font-bold outline-none transition focus:border-[#8B5CF6]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-black tracking-[0.14em] text-slate-400">
                            ENCERRA ÀS
                          </label>

                          <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-slate-400">
                            opcional
                          </span>
                        </div>

                        <input
                          type="time"
                          value={
                            horarioFim
                          }
                          onChange={(
                            event
                          ) =>
                            setHorarioFim(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border-2 border-[#E8EEF5] bg-white px-4 py-3.5 text-sm font-bold outline-none transition focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                      Exemplo:{" "}
                      <strong className="text-slate-700">
                        Caminhar
                      </strong>{" "}
                      pode ficar disponível das{" "}
                      <strong className="text-slate-700">
                        06:00 às 09:00
                      </strong>
                      .
                    </div>
                  </div>
                )}

                <button
                  onClick={
                    adicionarTarefa
                  }
                  disabled={
                    salvando ||
                    !titulo.trim() ||
                    (
                      modoRepeticao ===
                        "custom" &&
                      diasPersonalizados.length ===
                        0
                    )
                  }
                  className="rounded-2xl bg-[#22C7D9] px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.17)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? "Salvando..."
                    : "Criar tarefa"}
                </button>
              </div>
            </section>
          )}

        <section className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,.045)]">
            <p className="text-[9px] font-black tracking-[0.12em] text-slate-400">
              DISPONÍVEIS
            </p>

            <p className="mt-2 text-2xl font-black text-[#1F2937]">
              {disponiveis}
            </p>

            <div className="mt-3 h-1.5 rounded-full bg-[#EAF8FB]">
              <div className="h-full w-full rounded-full bg-[#22C7D9]" />
            </div>
          </div>

          <div className="rounded-[22px] bg-[#FFF8E7] p-4">
            <p className="text-[9px] font-black tracking-[0.12em] text-[#C98A00]">
              AGUARDANDO
            </p>

            <p className="mt-2 text-2xl font-black text-[#D89900]">
              {aguardando}
            </p>

            <div className="mt-3 h-1.5 rounded-full bg-[#FFE7A8]">
              <div className="h-full w-full rounded-full bg-[#F4B942]" />
            </div>
          </div>

          <div className="rounded-[22px] bg-[#EEFBEF] p-4">
            <p className="text-[9px] font-black tracking-[0.12em] text-[#3A8F4A]">
              CONCLUÍDAS
            </p>

            <p className="mt-2 text-2xl font-black text-[#22A447]">
              {concluidas}
            </p>

            <div className="mt-3 h-1.5 rounded-full bg-[#CDEED4]">
              <div className="h-full w-full rounded-full bg-[#22C55E]" />
            </div>
          </div>
        </section>

        {carregando && (
          <div className="flex min-h-[220px] items-center justify-center rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,.05)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

              <p className="mt-3 text-sm font-bold text-slate-400">
                Carregando tarefas...
              </p>
            </div>
          </div>
        )}

        {!carregando &&
          jogadorAtual && (
            <section className="space-y-3">
              {tarefas.length ===
                0 && (
                <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,.05)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF8FB] text-2xl font-black text-[#22C7D9]">
                    ✓
                  </div>

                  <p className="mt-4 text-lg font-black">
                    Nenhuma tarefa por aqui
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    {ehAdministrador
                      ? "Crie a primeira tarefa para colocar a corrida em movimento."
                      : "O administrador ainda não definiu as tarefas desta partida."}
                  </p>
                </div>
              )}

              {statusDasTarefas.map(
                ({
                  tarefa,
                  status,
                  estadoHorario,
                  programadaHoje,
                }) => {
                  const atualizando =
                    tarefaEmAtualizacao ===
                    tarefa.id;

                  const concluida =
                    programadaHoje &&
                    status ===
                      "Concluída";

                  const esperando =
                    programadaHoje &&
                    status ===
                      "Aguardando aprovação";

                  const foraDoDia =
                    !programadaHoje &&
                    tarefa.repeatMode !==
                      "once";

                  const aindaNao =
                    programadaHoje &&
                    status ===
                      "Pendente" &&
                    estadoHorario ===
                      "ainda_nao";

                  const encerrada =
                    programadaHoje &&
                    status ===
                      "Pendente" &&
                    estadoHorario ===
                      "encerrada";

                  return (
                    <article
                      key={
                        tarefa.id
                      }
                      className={`rounded-[24px] p-5 shadow-[0_8px_26px_rgba(15,23,42,.045)] transition sm:flex sm:items-center sm:justify-between sm:gap-5 ${
                        concluida
                          ? "bg-[#F2FBF4]"
                          : esperando
                          ? "bg-[#FFF9EC]"
                          : foraDoDia
                          ? "bg-[#F3F5F8]"
                          : encerrada
                          ? "bg-[#F2F4F7]"
                          : aindaNao
                          ? "bg-[#F7F5FF]"
                          : "bg-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-400 shadow-sm">
                            {
                              tarefa.categoria
                            }
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                              tarefa.repeatMode ===
                                "once"
                                ? "bg-[#EEF6FF] text-[#4B7FBF]"
                                : tarefa.repeatMode ===
                                  "daily"
                                ? "bg-[#F1ECFF] text-[#7C4BE8]"
                                : tarefa.repeatMode ===
                                  "weekdays"
                                ? "bg-[#EEFBEF] text-[#238A3A]"
                                : "bg-[#FFF3EA] text-[#E46611]"
                            }`}
                          >
                            {tarefa.repeatMode !==
                              "once" &&
                              "↻ "}
                            {textoRepeticao(
                              tarefa
                            )}
                          </span>

                          {tarefa.repeatMode !==
                            "once" && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 shadow-sm">
                              ◷{" "}
                              {textoHorario(
                                tarefa
                              )}
                            </span>
                          )}

                          {foraDoDia && (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-black text-slate-500">
                              Não programada para hoje
                            </span>
                          )}

                          {esperando && (
                            <span className="rounded-full bg-[#FFE9AD] px-2.5 py-1 text-[9px] font-black text-[#B87C00]">
                              Aguardando aprovação
                            </span>
                          )}

                          {concluida && (
                            <span className="rounded-full bg-[#DDF5E3] px-2.5 py-1 text-[9px] font-black text-[#25853D]">
                              {tarefa.repeatMode !==
                              "once"
                                ? "Concluída hoje"
                                : "Aprovada"}
                            </span>
                          )}

                          {aindaNao && (
                            <span className="rounded-full bg-[#E8E1FF] px-2.5 py-1 text-[9px] font-black text-[#7250C8]">
                              Ainda não disponível
                            </span>
                          )}

                          {encerrada && (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-black text-slate-500">
                              Encerrada hoje
                            </span>
                          )}
                        </div>

                        <h2
                          className={`text-lg font-black ${
                            foraDoDia ||
                            encerrada
                              ? "text-slate-500"
                              : ""
                          }`}
                        >
                          {
                            tarefa.titulo
                          }
                        </h2>

                        {foraDoDia ? (
                          <p className="mt-1 text-xs text-slate-400">
                            Esta tarefa volta na próxima ocorrência programada.
                          </p>
                        ) : aindaNao ? (
                          <p className="mt-1 text-xs font-bold text-[#7250C8]">
                            Disponível a partir das{" "}
                            {formatarHora(
                              tarefa.availableFrom
                            )}
                          </p>
                        ) : encerrada ? (
                          <p className="mt-1 text-xs text-slate-400">
                            O prazo de hoje terminou
                            {tarefa.availableUntil
                              ? ` às ${formatarHora(
                                  tarefa.availableUntil
                                )}`
                              : ""}
                            .{" "}
                            {tarefa.repeatMode ===
                            "daily"
                              ? "Ela volta amanhã."
                              : "Ela volta na próxima ocorrência programada."}
                          </p>
                        ) : concluida &&
                          tarefa.repeatMode !==
                            "once" ? (
                          <p className="mt-1 text-xs text-slate-400">
                            +1 casa conquistada nesta ocorrência.
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">
                            +1 casa quando outro jogador aprovar sua foto
                          </p>
                        )}
                      </div>

                      <div className="mt-4 shrink-0 sm:mt-0">
                        {programadaHoje &&
                          status ===
                            "Pendente" &&
                          estadoHorario ===
                            "disponivel" && (
                            <button
                              onClick={() =>
                                abrirCamera(
                                  tarefa
                                )
                              }
                              disabled={
                                atualizando
                              }
                              className="w-full rounded-2xl bg-[#22C7D9] px-5 py-3.5 text-sm font-black text-white shadow-[0_8px_20px_rgba(34,199,217,.16)] transition hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
                            >
                              {atualizando
                                ? "Enviando..."
                                : "Concluir tarefa"}
                            </button>
                          )}

                        {foraDoDia && (
                          <div className="rounded-2xl bg-slate-200 px-5 py-3.5 text-center text-sm font-black text-slate-500">
                            Fora da programação
                          </div>
                        )}

                        {aindaNao && (
                          <div className="rounded-2xl bg-[#E8E1FF] px-5 py-3.5 text-center text-sm font-black text-[#7250C8]">
                            {tarefa.availableFrom
                              ? `Abre às ${formatarHora(
                                  tarefa.availableFrom
                                )}`
                              : "Indisponível"}
                          </div>
                        )}

                        {encerrada && (
                          <div className="rounded-2xl bg-slate-200 px-5 py-3.5 text-center text-sm font-black text-slate-500">
                            Encerrada hoje
                          </div>
                        )}

                        {esperando && (
                          <div className="rounded-2xl bg-[#FFECC0] px-5 py-3.5 text-center text-sm font-black text-[#B87C00]">
                            Em análise
                          </div>
                        )}

                        {concluida && (
                          <div className="rounded-2xl bg-[#DDF5E3] px-5 py-3.5 text-center text-sm font-black text-[#25853D]">
                            ✓ +1 casa
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </section>
          )}

        <section className="mt-6 rounded-[26px] bg-[#F1ECFF] p-5 sm:p-6">
          <p className="text-[10px] font-black tracking-[0.18em] text-[#8B5CF6]">
            COMO FUNCIONA
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            O administrador escolhe quando cada tarefa se repete. Ela pode acontecer uma única vez, todos os dias, de segunda a sexta ou apenas em dias específicos. Nas tarefas recorrentes, cada jogador pode conquistar +1 casa em cada ocorrência programada.
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
            className="flex flex-col items-center justify-center rounded-2xl bg-[#EAF8FB] px-2 py-2.5 text-[#1594A3]"
          >
            <span className="text-lg">
              ▣
            </span>

            <span className="mt-1 text-[10px] font-black">
              Tarefas
            </span>
          </Link>

          <Link
            href="/aprovacoes"
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-slate-400"
          >
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