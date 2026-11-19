# Brasil em Jogo — v2.2.3

Atualização incremental sobre a 2.2.2. Preserva Google Apps Script, URL `/exec`, planilha, abas, cartas, regras e dados existentes. Não reconstrói o aplicativo.

## O que muda nesta versão

1. **Jogador em primeiro lugar:** o cadastro/identificação do participante aparece primeiro; a escolha/criação da mesa vem logo depois e a rodada fica em seguida. O botão de entrada só habilita depois de selecionar uma mesa.
2. **Identidade do jogador:** depois de entrar, nome, avatar, estado “Jogando” e pontos ganham destaque visual.
3. **Cards equilibrados:** duas colunas de mesma largura no desktop; no Android os blocos empilham em ordem simples e os botões de criar/entrar ocupam a largura toda, sem disputar espaço.
4. **Administração identificada:** a aba `PARTIDAS` ganha `admin_nome` e `admin_contato`. Quando o criador entra como jogador, o sistema registra seu nome e contato; o lobby mostra `Mesa · ADM · Contato`. As ações administrativas continuam protegidas pela chave exclusiva da mesa.
5. **Orientação em áudio:** botões “Ouvir instruções” e “Ouvir manual” usam a voz do navegador (texto para fala, pt-BR quando disponível). Não grava arquivo de áudio nem envia voz ao servidor.
6. **Teste demonstrativo:** `criarTesteRealBrasilEmJogo()` cria uma mesa `JOGO 01 — TESTE`, seis participantes `TESTE 01` a `TESTE 06`, uma rodada demonstrativa e pontuação com `TESTE 03` como vencedor.
7. **Limpeza segura de teste:** `zerarDadosTesteBrasilEmJogo()` apaga apenas mesas e registros marcados internamente como teste (`BJ_TESTE=SIM`). Não apaga mesas reais, cartas, fontes ou configurações.
8. **Versão:** Apps Script e interface identificam `2.2.3`; cache da PWA atualizado para evitar reaproveitar a tela antiga.

## Atualização

1. Faça backup da planilha e do projeto Apps Script.
2. Substitua `Backend.gs` pelo arquivo `apps-script/Backend.gs`.
3. Substitua o conteúdo do arquivo HTML `Index` por `apps-script/Index.html`.
4. Execute `inicializarSistemaBrasilEmJogo()` uma vez e autorize as permissões, se solicitado. A rotina acrescenta somente as colunas ausentes.
5. Execute `diagnosticarBrasilEmJogo()` e confira os avisos no Registro de execução.
6. Para validar os dados demonstrativos, execute `criarTesteRealBrasilEmJogo()`. Abra o `/exec`, selecione `JOGO 01 — TESTE` e confira os seis participantes e o vencedor.
7. Para remover somente o cenário demonstrativo, execute `zerarDadosTesteBrasilEmJogo()`.
8. Publique em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**, mantendo a implantação atual e o mesmo endereço `/exec`.

**Atenção:** `criarTesteRealBrasilEmJogo()` substitui qualquer teste anterior criado por essa mesma rotina, mas preserva mesas reais. `zerarDadosTesteBrasilEmJogo()` também remove somente esses registros marcados como teste.

## Administração e contato

O criador continua sendo administrador exclusivo da própria mesa. O nome e contato administrativo só são preenchidos depois que o criador entra na mesa com seu nome e telefone. Não são inferidos nem inventados. O telefone fica visível no lobby como contato informado pelo administrador; os telefones dos demais jogadores não são exibidos.

Se o criador limpar os dados locais do navegador, a chave administrativa da mesa pode ser perdida. A recuperação/transferência do administrador não faz parte desta atualização.

## Áudio

A leitura é feita localmente pelo recurso `SpeechSynthesis` do navegador/dispositivo. A disponibilidade e a voz em português dependem do navegador e do sistema operacional. Não é gravação de voz nem geração de MP3.

## Validação realizada nesta entrega

- Sintaxe JavaScript do `Index.html` e `Backend.gs` verificada localmente com Node.js.
- Arquivos de interface sincronizados entre Apps Script e `docs/`.
- Estrutura do pacote ZIP verificada.
- Não foi possível executar o Apps Script contra a planilha real nem testar Androids/contas Google nesta sessão. O teste demonstrativo deve ser executado na sua planilha após a atualização.
