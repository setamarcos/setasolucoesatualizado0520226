# Brasil em Jogo — v2.0

Jogo de cartas em grupo (4 a 12 jogadores). A planilha Google é o banco de dados.
Roda no **Android** (Chrome), **Windows** (Chrome/Edge) e qualquer navegador moderno.

```
brasil-em-jogo/
├── apps-script/          → cole no editor do Apps Script
│   ├── Backend.gs        (substitui o Backend.gs antigo INTEIRO)
│   ├── Index.html        (arquivo HTML chamado "Index")
│   ├── appsscript.json   (manifesto, opcional; usado pelo clasp)
│   └── .clasp.json.exemplo
└── docs/                 → GitHub Pages (opcional, app instalável)
    ├── index.html        (mesma tela, conecta na URL /exec)
    ├── manifest.webmanifest, sw.js, icon.svg, icon-192.png, icon-512.png
```

## 1. Correção do erro no `doGet` (linha 374)

O `Backend.gs` antigo tinha 326 linhas e o `doGet` estava na linha 121. Um erro **no doGet na linha 374**
significa que existe **outro `doGet` em outro arquivo** (ex.: `Código.gs` ou `Estrutura.gs`), e o Apps Script
executa o último carregado.

1. No editor, use **Ctrl+F** em cada arquivo `.gs` e procure `function doGet` e `function doPost`.
2. **Apague** todos, exceto os do novo `Backend.gs`.
3. Se o projeto tiver dois arquivos com `const BJ =`, apague o antigo (erro *"Identifier 'BJ' has already been declared"*).

## 2. Instalar no Apps Script (5 min)

1. Abra o projeto Apps Script já vinculado à implantação.
2. `Backend.gs` → apague todo o conteúdo e cole `apps-script/Backend.gs`.
3. Arquivo HTML **Index** (nome exato, I maiúsculo) → apague tudo e cole `apps-script/Index.html`.
4. Mantenha `Estrutura.gs` (sem `doGet`).
5. Salve. Selecione `inicializarSistemaBrasilEmJogo` → **Executar** → autorize.
   - Não apaga nada. Só acrescenta colunas que faltarem e as chaves de CONFIG ausentes
     (`MAX_JOGADORES`, `MIN_JOGADORES`, `TEMPO_PADRAO_RODADA`, `ADMIN_PIN`).
6. Na aba **CONFIG**, preencha `ADMIN_PIN` (ex.: `2580`). É o PIN da aba **Mesa**.
7. Rode `diagnosticarBrasilEmJogo` → em *Registro de execução* `avisos` deve vir vazio.

## 3. Publicar (onde o cadastro costuma "não funcionar")

**Implantar → Gerenciar implantações → lápis (editar) → Versão: _Nova versão_ → Implantar.**

- Executar como: **Eu**
- Quem tem acesso: **Qualquer pessoa**

> Salvar o código **não** atualiza a URL `/exec`. Sem "Nova versão", os celulares continuam no HTML antigo.
> A URL `/dev` só funciona para o dono logado.

## 4. Como jogar

| Aba | Quem usa | O que faz |
|---|---|---|
| **Jogar** | cada jogador no celular | cadastro (nome + telefone), vê a carta, quem responde e o cronômetro |
| **Placar** | todos | ranking da partida |
| **Mesa** | administrador (PIN) | cria/inicia/pausa/encerra partida, sorteia carta, dinâmica, troca respondente, revela resposta, pontua 0–3 |

Regras implementadas no servidor:
- Telefone repetido = **reentrada** (não duplica cadastro). Telefone nunca é exibido.
- Máximo 12 presentes; mínimo `MIN_JOGADORES` para iniciar.
- Carta não se repete na mesma partida.
- Respondente automático: quem respondeu menos vezes (empate = sorteio).
- Resposta, explicação e fontes ficam ocultas para jogadores até a Mesa revelar.
- Pontuação 0–3 por jogador/rodada; repetir **substitui** (não soma em dobro).
- Pausar congela o cronômetro; retomar continua de onde parou.
- Tudo registrado em HISTORICO. Escritas com trava (LockService) para vários celulares ao mesmo tempo.

## 5. GitHub Pages (opcional — app instalável no Android/Windows)

1. Suba esta pasta para um repositório no GitHub.
2. **Settings → Pages → Branch: main → Folder: /docs → Save.**
3. Abra `https://SEU-USUARIO.github.io/SEU-REPO/` e cole a URL `/exec` quando pedir
   (ou deixe fixa em `API_URL_PADRAO` no `docs/index.html`, ou use `?api=URL_EXEC` no link).
4. **Android:** Chrome → menu ⋮ → *Instalar app*. **Windows:** Chrome/Edge → ícone de instalar na barra de endereço.

O link direto do Apps Script (`/exec`) também funciona no celular e no PC, sem GitHub.

## 6. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| Erro no doGet em linha que não existe no Backend.gs | `doGet` duplicado | item 1 |
| Cadastro não aparece | implantação sem "Nova versão" | item 3 |
| "Não há arquivo HTML Index" | nome do arquivo HTML errado | renomeie para `Index` |
| Tela branca / não carrega com várias contas Google no PC | limitação do Google com múltiplas contas | janela anônima ou use o link do GitHub Pages |
| "PIN da mesa inválido" | `ADMIN_PIN` diferente na CONFIG | confira a aba CONFIG |
| "Coluna X ausente" | estrutura antiga | rode `inicializarSistemaBrasilEmJogo` |

## Segurança
- Deixe a planilha **privada** (só o administrador). O Web App acessa como "Eu".
- Defina `ADMIN_PIN`. Sem PIN, qualquer pessoa com o link controla a Mesa.
