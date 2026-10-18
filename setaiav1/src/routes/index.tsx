import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analisarIdeia, type Analise } from "@/lib/ai.functions";
import {
  AREAS,
  detalhesComFaltas,
  detectarArea,
  montarPrompt,
  montarRefinamento,
  type Comentario,
  type FeedbackTipo,
} from "@/lib/prompt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seta IA: gerador de prompt - Seta Soluções" },
      { name: "description", content: "Transforme sua ideia em um prompt claro que a IA entende, comente a resposta e refine em rodadas." },
      { property: "og:title", content: "Seta IA: gerador de prompt" },
      { property: "og:description", content: "Ideia, detalhes e o que evitar viram um prompt humano e preciso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const URL_APPS_SCRIPT =
  "https://script.google.com/macros/s/AKfycbwAFjbqPdEk5rcgQahgsOn35tPXpTIj9vjSIA63LgyYDPj2QOvMB4K-kNGrkqscmYzp/exec";

const FILTROS = [
  ["Sem enrolação", "Texto longo ou enrolação."],
  ["Foco prático", "Teoria excessiva; foque em passos práticos."],
  ["Uso no celular", "Soluções que dependam de computador, opero apenas pelo celular."],
  ["Linguagem simples", "Termos técnicos complexos."],
  ["Sem análise baixa", "Análises de baixo nível desnecessárias."],
  ["Sem floreios", "Floreios e frases de efeito."],
] as const;

const FB: Record<FeedbackTipo, { label: string; pergunta: string; cls: string }> = {
  acertou: { label: "👍 Acertou", pergunta: "O que deve ser mantido?", cls: "bg-ok" },
  errou: { label: "👎 Errou", pergunta: "O que está errado e como deveria ser?", cls: "bg-bad" },
  faltou: { label: "⚠️ Faltou contexto", pergunta: "Qual informação faltou?", cls: "bg-warn" },
};

interface Rodada { n: number; data: string; prompt: string; comentarios: Comentario[] }

function Index() {
  const [tel, setTel] = useState<string | null>(null);
  const [telInput, setTelInput] = useState("");
  const [ideia, setIdeia] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [filtros, setFiltros] = useState<string[]>([]);
  const [evitarLivre, setEvitarLivre] = useState("");
  const [areaManual, setAreaManual] = useState<string>("auto");
  const [prompt, setPrompt] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [respostasIA, setRespostasIA] = useState<Record<number, string>>({});
  const analisarFn = useServerFn(analisarIdeia);

  async function analisarComIA(det?: string) {
    if (!ideia.trim()) return flash("Escreva a ideia principal");
    setAnalisando(true);
    try {
      const r = await analisarFn({ data: { ideia, detalhes: det ?? detalhes, evitar: [...filtros, evitarLivre].filter(Boolean).join(" ") } });
      if (!r.ok) return flash(r.erro);
      setAnalise(r.analise);
      setPrompt(r.analise.prompt);
    } catch {
      flash("Falha ao falar com a IA");
    } finally {
      setAnalisando(false);
    }
  }
  const [resposta, setResposta] = useState("");
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [aberto, setAberto] = useState<FeedbackTipo | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [aviso, setAviso] = useState("");
  const [gravando, setGravando] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setTel(localStorage.getItem("promptTelefone"));
    try { setRodadas(JSON.parse(localStorage.getItem("setaRodadas") || "[]")); } catch {}
  }, []);

  const areaAuto = useMemo(() => detectarArea(`${ideia} ${detalhes}`), [ideia, detalhes]);
  const area = areaManual === "auto" ? areaAuto : areaManual;
  const entrada = { ideia, detalhes, evitar: [...filtros, evitarLivre], area };

  const flash = (m: string) => { setAviso(m); setTimeout(() => setAviso(""), 2500); };
  const copiar = async (t: string) => { await navigator.clipboard.writeText(t); flash("Copiado ✅"); };

  function login() {
    if (telInput.replace(/\D/g, "").length < 10) return flash("Digite um telefone válido");
    localStorage.setItem("promptTelefone", telInput);
    setTel(telInput);
  }
  function mascara(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  }

  function audio(campo: "ideia" | "detalhes") {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return flash("Seu navegador não suporta gravação de voz");
    if (gravando) { recRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "pt-BR";
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      const set = campo === "ideia" ? setIdeia : setDetalhes;
      set((v) => (v ? v + " " : "") + t);
    };
    r.onend = r.onerror = () => setGravando(null);
    recRef.current = r;
    setGravando(campo);
    r.start();
  }

  function salvar(extra: Record<string, unknown> = {}) {
    if (!tel) return flash("Faça login para salvar na planilha");
    fetch(URL_APPS_SCRIPT, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        data: new Date().toLocaleString("pt-BR"),
        email: tel, contato: tel, loguinho: tel.replace(/\D/g, ""),
        acao: "Diagnostico", userAgent: navigator.userAgent,
        solicitacao: ideia, detalhe: detalhes, evitar: entrada.evitar.filter(Boolean).join(" "),
        classificacao: area, objetivoImagem: "", promptGerado: prompt, respostaIA: resposta,
        statusFeedback: comentarios.map((c) => c.tipo).join(","),
        comentarios: comentarios.map((c) => `${c.tipo}: ${c.texto}`).join(" | "),
        rodada: rodadas.length,
        ...extra,
      }),
    }).then(() => flash("Salvo na planilha ✅")).catch(() => flash("Não foi possível salvar"));
  }

  function addComentario() {
    if (!aberto || !rascunho.trim()) return;
    setComentarios((c) => [...c, { tipo: aberto, texto: rascunho.trim() }]);
    setRascunho("");
    setAberto(null);
  }

  function continuar() {
    if (!comentarios.length) return flash("Comente a resposta antes de continuar");
    const novo = montarRefinamento(entrada, resposta, comentarios);
    const r: Rodada = { n: rodadas.length + 1, data: new Date().toLocaleString("pt-BR"), prompt: novo, comentarios };
    const lista = [r, ...rodadas].slice(0, 20);
    setRodadas(lista);
    localStorage.setItem("setaRodadas", JSON.stringify(lista));
    setDetalhes(detalhesComFaltas(detalhes, comentarios));
    setPrompt(novo);
    salvar({ promptGerado: novo, rodada: r.n, acao: "Refinamento" });
    setComentarios([]);
    setResposta("");
    document.getElementById("saida")?.scrollIntoView({ behavior: "smooth" });
  }

  const relatorio = `Relatório Seta IA\nÁrea: ${area}\nPedido: ${ideia}\n` +
    comentarios.map((c) => `- ${FB[c.tipo].label}: ${c.texto}`).join("\n");

  const card = "rounded-2xl bg-card p-5 shadow-xl";
  const lbl = "mb-2 block text-sm font-bold text-navy";
  const ta = "w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange";
  const btn = "rounded-lg px-3 py-3 text-sm font-bold text-on-color transition active:scale-95";

  return (
    <main className="min-h-screen px-3 py-5">
      <div className={`${card} mx-auto max-w-xl space-y-6`}>
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Seta IA · Seta Soluções</p>
          <h1 className="mt-1 text-2xl font-extrabold text-navy">Estamos juntos nisso.</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Sua ideia vira um pedido claro que a IA entende.</p>
        </header>

        <section className="no-print rounded-xl bg-surface p-3">
          {tel ? (
            <div className="flex items-center justify-between gap-2 text-sm font-bold text-ok">
              ✅ {tel}
              <button className={`${btn} bg-bad py-1.5`} onClick={() => { localStorage.removeItem("promptTelefone"); setTel(null); }}>Sair</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className={ta} placeholder="(xx) xxxxx-xxxx" inputMode="tel" value={telInput} onChange={(e) => setTelInput(mascara(e.target.value))} />
              <button className={`${btn} bg-ok`} onClick={login}>Entrar</button>
            </div>
          )}
        </section>

        {(["ideia", "detalhes"] as const).map((campo, i) => (
          <section key={campo}>
            <div className="mb-2 flex items-center justify-between">
              <label className={lbl + " mb-0"}>{i + 1}. {campo === "ideia" ? "Ideia principal" : "Detalhes"}</label>
              <button className={`no-print ${btn} py-1.5 ${gravando === campo ? "animate-pulse bg-bad" : "bg-navy-deep"}`} onClick={() => audio(campo)}>
                {gravando === campo ? "🛑 Parar" : "🎤 Áudio"}
              </button>
            </div>
            <textarea rows={3} className={ta}
              placeholder={campo === "ideia" ? "O que você quer que a IA faça? Ex: escrever uma mensagem de incentivo para minha filha" : "Contexto, fatos e histórico que ajudam a entender o cenário"}
              value={campo === "ideia" ? ideia : detalhes}
              onChange={(e) => (campo === "ideia" ? setIdeia : setDetalhes)(e.target.value)} />
          </section>
        ))}

        <section>
          <label className={lbl}>3. O que evitar</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {FILTROS.map(([nome, frase]) => {
              const on = filtros.includes(frase);
              return (
                <button key={nome} onClick={() => setFiltros((f) => (on ? f.filter((x) => x !== frase) : [...f, frase]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${on ? "bg-orange text-on-color" : "bg-surface text-navy"}`}>
                  {on ? "✓ " : ""}{nome}
                </button>
              );
            })}
          </div>
          <textarea rows={2} className={ta} placeholder="Outra coisa fora de cogitação..." value={evitarLivre} onChange={(e) => setEvitarLivre(e.target.value)} />
        </section>

        <section className="flex items-center gap-2 text-sm">
          <span className="font-bold text-navy">Área:</span>
          <select className="flex-1 rounded-lg border border-input bg-background p-2" value={areaManual} onChange={(e) => setAreaManual(e.target.value)}>
            <option value="auto">Automática ({areaAuto})</option>
            {[...Object.keys(AREAS), "geral"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </section>

        <div className="no-print grid grid-cols-2 gap-2">
          <button className={`${btn} bg-orange`} onClick={() => { if (!ideia.trim()) return flash("Escreva a ideia principal"); setPrompt(montarPrompt(entrada)); }}>Gerar prompt</button>
          <button className={`${btn} bg-orange`} disabled={!prompt} onClick={() => copiar(prompt)}>Copiar</button>
          <button className={`${btn} bg-navy-deep`} onClick={() => window.print()}>PDF</button>
          <button className={`${btn} bg-navy-deep`} onClick={() => salvar()}>Salvar na planilha</button>
        </div>

        <section className="no-print space-y-3 rounded-xl border-2 border-orange p-4">
          <button className={`${btn} w-full bg-orange`} disabled={analisando} onClick={() => analisarComIA()}>
            {analisando ? "Analisando sua ideia..." : "✨ Me ajuda com isso (IA analisa e completa)"}
          </button>
          {analise && (
            <div className="space-y-3 text-sm">
              <p><b className="text-navy">Área:</b> {analise.area} · <b className="text-navy">Clareza da ideia:</b> {analise.nota}/10</p>
              {analise.faltando.length > 0 && (
                <div>
                  <p className="mb-1 font-bold text-navy">Responda para melhorar o prompt:</p>
                  {analise.faltando.map((f, i) => (
                    <div key={i} className="mb-2">
                      <p className="font-semibold">{f.pergunta}</p>
                      <p className="text-xs text-muted-foreground">{f.motivo}</p>
                      <input className={ta + " mt-1"} placeholder="Sua resposta" value={respostasIA[i] ?? ""}
                        onChange={(e) => setRespostasIA((r) => ({ ...r, [i]: e.target.value }))} />
                    </div>
                  ))}
                  <button className={`${btn} w-full bg-navy`} disabled={analisando} onClick={() => {
                    const add = analise.faltando.map((f, i) => respostasIA[i]?.trim() ? `${f.pergunta} ${respostasIA[i].trim()}` : "").filter(Boolean);
                    if (!add.length) return flash("Responda pelo menos uma pergunta");
                    const novo = [detalhes.trim(), ...add].filter(Boolean).join("\n");
                    setDetalhes(novo);
                    setRespostasIA({});
                    analisarComIA(novo);
                  }}>Usar respostas e gerar de novo</button>
                </div>
              )}
            </div>
          )}
        </section>

        {prompt && (
          <pre id="saida" className="whitespace-pre-wrap font-sans rounded-lg border-l-4 border-orange bg-surface p-4 text-sm leading-relaxed">{prompt}</pre>
        )}

        <section className="no-print space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className={lbl}>5. Comente a resposta da IA {rodadas.length > 0 && <span className="text-orange">· Rodada {rodadas.length + 1}</span>}</label>
          <textarea rows={4} className={ta} placeholder="Cole aqui a resposta que a IA te deu..." value={resposta} onChange={(e) => setResposta(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FB) as FeedbackTipo[]).map((t) => (
              <button key={t} className={`${btn} ${FB[t].cls} px-1 text-xs ${aberto === t ? "ring-2 ring-navy ring-offset-2" : ""}`} onClick={() => setAberto(aberto === t ? null : t)}>{FB[t].label}</button>
            ))}
          </div>
          {aberto && (
            <div className="flex gap-2">
              <input autoFocus className={ta} placeholder={FB[aberto].pergunta} value={rascunho} onChange={(e) => setRascunho(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComentario()} />
              <button className={`${btn} bg-navy`} onClick={addComentario}>Adicionar</button>
            </div>
          )}
          {comentarios.length > 0 && (
            <ul className="space-y-1 text-sm">
              {comentarios.map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-2 rounded-md bg-card p-2">
                  <span><b>{FB[c.tipo].label}:</b> {c.texto}</span>
                  <button aria-label="Remover" className="text-bad" onClick={() => setComentarios((l) => l.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <button className={`${btn} w-full bg-orange`} onClick={continuar}>Continuar interação (gerar prompt refinado)</button>
          <button className={`${btn} w-full bg-navy-deep`} onClick={() => copiar(relatorio)}>Copiar relatório de feedback</button>
        </section>

        {rodadas.length > 0 && (
          <details className="no-print text-sm">
            <summary className="cursor-pointer font-bold text-navy">Histórico de rodadas ({rodadas.length})</summary>
            <div className="mt-2 space-y-2">
              {rodadas.map((r) => (
                <button key={r.n + r.data} className="block w-full rounded-md bg-surface p-2 text-left" onClick={() => setPrompt(r.prompt)}>
                  <b>Rodada {r.n}</b> · {r.data} · {r.comentarios.length} comentário(s)
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
      {aviso && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-navy-deep px-4 py-2 text-sm font-bold text-on-color shadow-lg">{aviso}</div>}
    </main>
  );
}
