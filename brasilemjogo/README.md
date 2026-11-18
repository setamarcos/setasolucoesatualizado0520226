# Brasil em Jogo — v2.2.1

Atualização incremental do projeto original. Mantém Google Apps Script, planilha e abas existentes; acrescenta seleção e criação de várias mesas independentes.

## Conteúdo

- `apps-script/Backend.gs` — API e regras do jogo.
- `apps-script/Index.html` — interface para o HTML `Index` no Apps Script.
- `apps-script/appsscript.json` — manifesto opcional do Apps Script.
- `docs/` — versão da mesma interface para GitHub Pages/PWA.

## O que mudou na 2.2.1

1. **Várias mesas simultâneas:** cada mesa é uma linha independente na aba `PARTIDAS`, com ID, nome, status, criação e início.
2. **Participantes por mesa:** a aba `PARTICIPANTES` recebe a coluna `partida_id`; jogadores, presença e pontuação ficam vinculados à mesa escolhida.
3. **Lobby:** lista as mesas existentes, mostra participantes presentes, limite, vagas que faltam e status. O jogador escolhe uma mesa ou cria outra.
4. **Criação:** `Criar nova mesa` acrescenta uma linha em `PARTIDAS`. A primeira mesa também recebe participantes antigos sem associação, para preservar cadastros legados.
5. **Mínimo de 2:** O mínimo para liberar o início é fixo em 2 participantes.
6. **Sem PIN:** o PIN não é mais solicitado nem validado pela interface/API. **Atenção:** qualquer pessoa que tenha o endereço do jogo pode usar os controles da Mesa (iniciar, pausar, sortear, pontuar e encerrar). O link não deve ser divulgado publicamente se isso não for desejado.
7. **URL única:** trocar de mesa retorna ao lobby e não altera o endereço `/exec`.
8. **Cartas leves:** imagens de Drive usam miniatura `w480` e continuam com carregamento `lazy`; imagens externas continuam dependendo do tamanho da URL cadastrada.

## Atualização segura no Apps Script

1. Faça uma cópia de segurança da planilha e do projeto Apps Script.
2. No projeto já vinculado ao Web App, substitua o conteúdo de `Backend.gs` pelo arquivo desta versão.
3. Substitua o conteúdo do arquivo HTML chamado exatamente `Index` por `apps-script/Index.html`.
4. Não apague nem recrie a planilha. Não remova as abas `CONFIG`, `PARTICIPANTES`, `PARTIDAS`, `RODADAS`, `PONTUACAO` ou `HISTORICO`.
5. Salve e execute manualmente `inicializarSistemaBrasilEmJogo` uma vez. Autorize o acesso quando solicitado. A função acrescenta a coluna `partida_id` se estiver faltando e ajusta `MIN_JOGADORES` de 4 para 2 somente se ainda estiver no padrão antigo.
6. Execute `diagnosticarBrasilEmJogo` e confira `avisos` no Registro de execução.
7. Vá a **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. A URL `/exec` existente permanece a mesma.

> Não crie uma implantação nova se quiser manter o endereço já compartilhado. Edite a implantação atual e publique uma nova versão.

## Uso

- Todos acessam o mesmo endereço `/exec`.
- No lobby, escolha uma mesa existente ou crie uma nova.
- Cada pessoa entra com nome e telefone; o telefone serve para reconhecer reentrada naquela mesa.
- Com 2 participantes presentes, a mesa fica liberada para o organizador iniciar.
- `Trocar de mesa` volta ao lobby; não troca URL.

## Dados e compatibilidade

- A planilha continua sendo o banco de dados. A atualização não apaga cartas, fontes, dinâmicas, pontuações ou histórico.
- A coluna nova `PARTICIPANTES.partida_id` associa o cadastro à mesa. Cadastros antigos sem associação são vinculados à mesa ativa mais recente durante a inicialização; se ainda não existir partida, ficam sem vínculo até a primeira mesa ser criada.
- A aba `PARTIDAS` recebe uma linha por mesa criada. Rodadas, pontuação e histórico continuam associados por `partida_id`.
- O PIN antigo `ADMIN_PIN` pode permanecer na aba `CONFIG`, mas deixa de ser usado pela versão 2.2.1.

## Limitações de validação

A sintaxe JavaScript foi verificada localmente. A execução efetiva depende da planilha e das permissões do seu Apps Script; não foi possível executar uma partida real na sua conta Google nesta sessão. Faça um teste com duas contas/dispositivos antes de considerar a atualização concluída.
