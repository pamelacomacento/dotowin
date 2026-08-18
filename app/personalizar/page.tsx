"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";

type Jogador = {
  id: number;
  nome: string;
  cor: string;
  gameId: number;
  avatar: string | null;
};

type Partida = {
  id: number;
  nome: string;
};

const CORES = [
  {
    nome: "Céu",
    valor: "#38BDF8",
  },
  {
    nome: "Violeta",
    valor: "#8B5CF6",
  },
  {
    nome: "Laranja",
    valor: "#F97316",
  },
  {
    nome: "Verde",
    valor: "#22C55E",
  },
  {
    nome: "Rosa",
    valor: "#EC4899",
  },
  {
    nome: "Amarelo",
    valor: "#EAB308",
  },
  {
    nome: "Turquesa",
    valor: "#14B8A6",
  },
  {
    nome: "Vermelho",
    valor: "#EF4444",
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

function Peao({
  cor,
  avatar,
}: {
  cor: string;
  avatar: string | null;
}) {
  return (
    <div className="relative h-[118px] w-[92px]">
      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          backgroundColor: cor,
          opacity: 0.2,
        }}
      />

      <div
        className="absolute left-1/2 top-0 z-20 h-12 w-12 -translate-x-1/2 overflow-hidden rounded-full border-[5px] border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 8px 18px rgba(15,23,42,.12)",
        }}
      >
        {avatar && (
          <img
            src={avatar}
            alt="Foto do jogador"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div
        className="absolute bottom-[18px] left-1/2 h-14 w-[68px] -translate-x-1/2 rounded-t-full border-x-[5px] border-white"
        style={{
          backgroundColor: cor,
        }}
      />

      <div
        className="absolute bottom-0 left-1/2 h-7 w-[88px] -translate-x-1/2 rounded-full border-[5px] border-white"
        style={{
          backgroundColor: cor,
          boxShadow:
            "0 8px 18px rgba(15,23,42,.12)",
        }}
      />
    </div>
  );
}

function carregarImagem(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = (error) =>
        reject(error);

      image.src = src;
    }
  );
}

async function criarFotoRecortada(
  imageSrc: string,
  pixelCrop: Area
): Promise<File> {
  const image =
    await carregarImagem(
      imageSrc
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  const tamanhoSaida =
    512;

  canvas.width =
    tamanhoSaida;

  canvas.height =
    tamanhoSaida;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Não foi possível preparar a imagem."
    );
  }

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    tamanhoSaida,
    tamanhoSaida
  );

  const blob =
    await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.9
        );
      }
    );

  if (!blob) {
    throw new Error(
      "Não foi possível recortar a foto."
    );
  }

  return new File(
    [
      blob,
    ],
    `avatar-${Date.now()}.jpg`,
    {
      type:
        "image/jpeg",
    }
  );
}

export default function PersonalizarPage() {
  const router = useRouter();

  const inputGaleriaRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const inputCameraRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    jogador,
    setJogador,
  ] = useState<Jogador | null>(
    null
  );

  const [
    partida,
    setPartida,
  ] = useState<Partida | null>(
    null
  );

  const [
    corSelecionada,
    setCorSelecionada,
  ] = useState("#38BDF8");

  const [
    avatarAtual,
    setAvatarAtual,
  ] = useState<string | null>(
    null
  );

  const [
    avatarPreview,
    setAvatarPreview,
  ] = useState<string | null>(
    null
  );

  const [
    arquivoAvatar,
    setArquivoAvatar,
  ] = useState<File | null>(
    null
  );

  const [
    removerAvatar,
    setRemoverAvatar,
  ] = useState(false);

  const [
    imagemParaCortar,
    setImagemParaCortar,
  ] = useState<string | null>(
    null
  );

  const [
    crop,
    setCrop,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    zoom,
    setZoom,
  ] = useState(1);

  const [
    areaRecortadaPixels,
    setAreaRecortadaPixels,
  ] = useState<Area | null>(
    null
  );

  const [
    recortando,
    setRecortando,
  ] = useState(false);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    return () => {
      if (
        avatarPreview &&
        avatarPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }

      if (
        imagemParaCortar &&
        imagemParaCortar.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          imagemParaCortar
        );
      }
    };
  }, [
    avatarPreview,
    imagemParaCortar,
  ]);

  async function carregarDados() {
    setCarregando(true);
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
      router.push("/partidas");
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
          "id, name, color, game_id, avatar"
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
          "id, name"
        )
        .eq(
          "id",
          gameId
        )
        .maybeSingle(),
    ]);

    if (
      erroJogador ||
      !jogadorData
    ) {
      console.error(
        "Erro ao carregar jogador:",
        erroJogador
      );

      setMensagemErro(
        "Não foi possível identificar seu jogador nesta partida."
      );

      setCarregando(false);
      return;
    }

    if (
      erroPartida ||
      !partidaData
    ) {
      console.error(
        "Erro ao carregar partida:",
        erroPartida
      );

      setMensagemErro(
        "Não foi possível carregar a partida."
      );

      setCarregando(false);
      return;
    }

    const avatarSalvo =
      jogadorData.avatar &&
      (
        jogadorData.avatar.startsWith(
          "http://"
        ) ||
        jogadorData.avatar.startsWith(
          "https://"
        )
      )
        ? jogadorData.avatar
        : null;

    const jogadorFormatado: Jogador =
      {
        id:
          jogadorData.id,

        nome:
          jogadorData.name ||
          "Jogador",

        cor:
          jogadorData.color ||
          "#38BDF8",

        gameId:
          jogadorData.game_id,

        avatar:
          avatarSalvo,
      };

    setJogador(
      jogadorFormatado
    );

    setPartida({
      id:
        partidaData.id,

      nome:
        partidaData.name,
    });

    setCorSelecionada(
      jogadorFormatado.cor
    );

    setAvatarAtual(
      avatarSalvo
    );

    setAvatarPreview(
      avatarSalvo
    );

    setCarregando(false);
  }

  function selecionarFoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo =
      event.target.files?.[0];

    event.target.value = "";

    if (!arquivo) {
      return;
    }

    if (
      !arquivo.type.startsWith(
        "image/"
      )
    ) {
      setMensagemErro(
        "Escolha um arquivo de imagem."
      );
      return;
    }

    const limite =
      12 * 1024 * 1024;

    if (
      arquivo.size >
      limite
    ) {
      setMensagemErro(
        "A foto precisa ter no máximo 12 MB."
      );
      return;
    }

    if (
      imagemParaCortar &&
      imagemParaCortar.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        imagemParaCortar
      );
    }

    const url =
      URL.createObjectURL(
        arquivo
      );

    setImagemParaCortar(
      url
    );

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);

    setAreaRecortadaPixels(
      null
    );

    setMensagemErro("");
  }

  function cancelarRecorte() {
    if (
      imagemParaCortar &&
      imagemParaCortar.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        imagemParaCortar
      );
    }

    setImagemParaCortar(
      null
    );

    setAreaRecortadaPixels(
      null
    );

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);
  }

  async function usarFotoRecortada() {
    if (
      !imagemParaCortar ||
      !areaRecortadaPixels
    ) {
      return;
    }

    setRecortando(true);
    setMensagemErro("");

    try {
      const arquivo =
        await criarFotoRecortada(
          imagemParaCortar,
          areaRecortadaPixels
        );

      if (
        avatarPreview &&
        avatarPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }

      const preview =
        URL.createObjectURL(
          arquivo
        );

      setArquivoAvatar(
        arquivo
      );

      setAvatarPreview(
        preview
      );

      setRemoverAvatar(
        false
      );

      cancelarRecorte();
    } catch (error) {
      console.error(
        "Erro ao recortar foto:",
        error
      );

      setMensagemErro(
        "Não foi possível recortar essa foto. Tente outra imagem."
      );
    } finally {
      setRecortando(false);
    }
  }

  function removerFoto() {
    if (
      avatarPreview &&
      avatarPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setArquivoAvatar(
      null
    );

    setAvatarPreview(
      null
    );

    setRemoverAvatar(
      true
    );

    setMensagemErro("");
  }

  async function salvarPersonalizacao() {
    if (!jogador) {
      return;
    }

    setSalvando(true);
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
      setMensagemErro(
        "Sua sessão expirou. Entre novamente."
      );

      setSalvando(false);
      return;
    }

    let avatarFinal:
      | string
      | null =
      removerAvatar
        ? null
        : avatarAtual;

    if (arquivoAvatar) {
      const nomeArquivo =
        `avatar-${jogador.id}-${Date.now()}.jpg`;

      const caminhoArquivo =
        `avatars/${user.id}/${nomeArquivo}`;

      const {
        error: erroUpload,
      } =
        await supabase.storage
          .from("task-photos")
          .upload(
            caminhoArquivo,
            arquivoAvatar,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                "image/jpeg",
            }
          );

      if (erroUpload) {
        console.error(
          "Erro ao enviar avatar:",
          erroUpload
        );

        setMensagemErro(
          "Não foi possível enviar sua foto."
        );

        setSalvando(false);
        return;
      }

      const {
        data: avatarPublico,
      } =
        supabase.storage
          .from("task-photos")
          .getPublicUrl(
            caminhoArquivo
          );

      avatarFinal =
        avatarPublico.publicUrl;
    }

    const {
      error,
    } = await supabase.rpc(
      "update_my_player_style",
      {
        p_game_id:
          jogador.gameId,

        p_color:
          corSelecionada,

        p_avatar:
          avatarFinal,
      }
    );

    if (error) {
      console.error(
        "Erro ao salvar personalização:",
        error
      );

      setMensagemErro(
        "Não foi possível salvar sua personalização."
      );

      setSalvando(false);
      return;
    }

    setSalvando(false);

    router.push("/jogo");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#1F2937]">
      <input
        ref={
          inputGaleriaRef
        }
        type="file"
        accept="image/*"
        onChange={
          selecionarFoto
        }
        className="hidden"
      />

      <input
        ref={
          inputCameraRef
        }
        type="file"
        accept="image/*"
        capture="user"
        onChange={
          selecionarFoto
        }
        className="hidden"
      />

      <div className="mx-auto max-w-[980px] px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:px-5">
          <div className="flex items-center gap-5">
            <Logo />

            <div className="hidden h-11 w-px bg-slate-200 sm:block" />

            <Link
              href="/jogo"
              className="hidden rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-[#F5F8FC] hover:text-slate-600 sm:block"
            >
              ← Jogo
            </Link>
          </div>

          {partida && (
            <div className="hidden rounded-2xl bg-[#F5F8FC] px-4 py-2.5 text-right sm:block">
              <p className="text-[8px] font-black tracking-[0.18em] text-slate-400">
                PARTIDA
              </p>

              <p className="mt-0.5 max-w-[180px] truncate text-xs font-black">
                {partida.nome}
              </p>
            </div>
          )}
        </header>

        {carregando ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[30px] bg-white shadow-[0_12px_35px_rgba(15,23,42,.05)]">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-[#22C7D9]" />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Preparando seu jogador...
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-7">
              <p className="text-[10px] font-black tracking-[0.24em] text-[#8B5CF6]">
                SEU JOGADOR
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Deixe seu peão com a sua cara
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
                Escolha uma cor e, se quiser, coloque sua foto na cabeça do peão.
              </p>
            </section>

            {mensagemErro && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {mensagemErro}
              </div>
            )}

            <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-[30px] bg-white p-8 text-center shadow-[0_12px_35px_rgba(15,23,42,.05)]">
                <p className="text-[9px] font-black tracking-[0.2em] text-slate-400">
                  SUA PEÇA
                </p>

                <div className="mt-7 flex min-h-[155px] items-center justify-center">
                  <Peao
                    cor={
                      corSelecionada
                    }
                    avatar={
                      avatarPreview
                    }
                  />
                </div>

                <h2 className="mt-5 text-xl font-black">
                  {jogador?.nome ||
                    "Jogador"}
                </h2>

                <div className="mt-3 flex items-center gap-2 rounded-full bg-[#F5F8FC] px-4 py-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        corSelecionada,
                    }}
                  />

                  <span className="text-xs font-black text-slate-500">
                    {
                      CORES.find(
                        (cor) =>
                          cor.valor ===
                          corSelecionada
                      )?.nome ||
                      "Sua cor"
                    }
                  </span>
                </div>

                <div className="mt-6 w-full">
                  <p className="text-[9px] font-black tracking-[0.18em] text-slate-400">
                    FOTO
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        inputCameraRef.current?.click()
                      }
                      className="rounded-2xl bg-[#EAF8FB] px-3 py-3 text-xs font-black text-[#1594A3] transition hover:bg-[#DDF5F8]"
                    >
                      Tirar foto
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        inputGaleriaRef.current?.click()
                      }
                      className="rounded-2xl bg-[#F1ECFF] px-3 py-3 text-xs font-black text-[#8B5CF6] transition hover:bg-[#E9DEFF]"
                    >
                      Escolher foto
                    </button>
                  </div>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={
                        removerFoto
                      }
                      className="mt-2 w-full rounded-2xl px-3 py-2.5 text-xs font-black text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      Remover foto
                    </button>
                  )}

                  <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                    Depois de escolher, você pode ajustar o enquadramento antes de usar.
                  </p>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
                <p className="text-[10px] font-black tracking-[0.18em] text-slate-400">
                  CORES DISPONÍVEIS
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CORES.map(
                    (cor) => {
                      const selecionada =
                        cor.valor ===
                        corSelecionada;

                      return (
                        <button
                          key={
                            cor.valor
                          }
                          type="button"
                          onClick={() => {
                            setCorSelecionada(
                              cor.valor
                            );

                            setMensagemErro(
                              ""
                            );
                          }}
                          className={`relative rounded-[22px] border-2 p-4 text-center transition hover:-translate-y-0.5 ${
                            selecionada
                              ? "border-[#1F2937] bg-[#F8FBFE] shadow-[0_8px_18px_rgba(15,23,42,.08)]"
                              : "border-[#EDF2F7] bg-white hover:border-slate-200"
                          }`}
                        >
                          {selecionada && (
                            <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1F2937] text-[10px] font-black text-white">
                              ✓
                            </div>
                          )}

                          <div
                            className="mx-auto h-12 w-12 rounded-full border-4 border-white shadow-[0_5px_14px_rgba(15,23,42,.12)]"
                            style={{
                              backgroundColor:
                                cor.valor,
                            }}
                          />

                          <p className="mt-3 text-xs font-black">
                            {cor.nome}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-7 rounded-[22px] bg-[#F5F8FC] p-4">
                  <p className="text-[9px] font-black tracking-[0.16em] text-slate-400">
                    SUA IDENTIDADE NO JOGO
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Sua cor continua identificando o peão no tabuleiro. A foto serve como um detalhe extra para reconhecer rapidamente cada jogador.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/jogo"
                    className="rounded-2xl bg-[#F5F8FC] px-5 py-3.5 text-center text-sm font-black text-slate-500 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="button"
                    onClick={
                      salvarPersonalizacao
                    }
                    disabled={
                      salvando
                    }
                    className="rounded-2xl bg-[#22C7D9] px-7 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvando
                      ? "Salvando..."
                      : "Salvar e jogar →"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {imagemParaCortar && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-5">
          <div className="w-full overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:max-w-[520px] sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-black tracking-[0.2em] text-[#8B5CF6]">
                  AJUSTAR FOTO
                </p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                  Enquadre seu rosto
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Arraste a foto e use o zoom até ficar do jeito que você quer.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cancelarRecorte
                }
                disabled={
                  recortando
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-lg font-black text-slate-400 transition hover:bg-slate-100"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="relative h-[360px] w-full bg-slate-950 sm:h-[420px]">
              <Cropper
                image={
                  imagemParaCortar
                }
                crop={
                  crop
                }
                zoom={
                  zoom
                }
                aspect={
                  1
                }
                cropShape="round"
                showGrid={
                  false
                }
                objectFit="contain"
                minZoom={
                  1
                }
                maxZoom={
                  4
                }
                onCropChange={
                  setCrop
                }
                onZoomChange={
                  setZoom
                }
                onCropComplete={(
                  _,
                  croppedAreaPixels
                ) => {
                  setAreaRecortadaPixels(
                    croppedAreaPixels
                  );
                }}
              />
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-slate-400">
                  −
                </span>

                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.01"
                  value={
                    zoom
                  }
                  onChange={(
                    event
                  ) =>
                    setZoom(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="h-2 w-full cursor-pointer accent-[#22C7D9]"
                  aria-label="Zoom da foto"
                />

                <span className="text-xs font-black text-slate-400">
                  +
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    cancelarRecorte
                  }
                  disabled={
                    recortando
                  }
                  className="rounded-2xl bg-[#F5F8FC] px-5 py-3.5 text-sm font-black text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    usarFotoRecortada
                  }
                  disabled={
                    recortando ||
                    !areaRecortadaPixels
                  }
                  className="rounded-2xl bg-[#22C7D9] px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,199,217,.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {recortando
                    ? "Preparando..."
                    : "Usar foto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}