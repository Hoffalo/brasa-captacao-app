# Captação BRASA (web app)

App do time de captação nas conferências BRASA. Cada pessoa vê as gravações dela, com a pergunta exata, onde e quando gravar, e sobe o vídeo direto do celular para a pasta certa no Drive. A planilha de captação continua sendo a fonte da verdade: o app só lê as abas e escreve **Status** e **Link do Drive**.

## O que faz

- **Login com Google**, só contas verificadas do domínio (`gobrasa.org`).
- **Minhas / Todas:** cartões ordenados por dia e horário. Âncoras (vídeo da Monking) não aparecem para o time.
- **Subir vídeo:** cria a pasta da pessoa dentro da pasta da série se ainda não existir, renomeia para `SÉRIE_Nome_Sobrenome_n.ext` e envia em pedaços direto para o Google, retomando se a conexão cair. No fim grava `Gravado` e o link do arquivo na linha.
- **Duplicados:** o mesmo vídeo do celular (nome original, tamanho e data) não sobe duas vezes.
- **Colar link, Não veio, Desfazer.**
- **Painel:** gravados por série contra a meta, pendências por pessoa e prioridades altas em aberto.

## Estrutura

```
src/
  domain/      regras puras: parsing das células, nome de arquivo, layout da planilha, painel
  contracts.ts interfaces que os serviços usam (planilha e Drive)
  adapters/    implementações sobre Google Sheets v4 e Drive v3
  services/    casos de uso: carregar o quadro, mudar status, preparar e concluir upload
  composition.ts  único lugar onde os adaptadores concretos são escolhidos
  web/         cola HTTP das rotas, cliente da API e upload em pedaços no navegador
  app/         Next.js (páginas, rotas de API e componentes)
tests/         Vitest: domínio, serviços com fakes em memória
```

O formato da planilha é o da "Captacao BSA26": abas `Palestrantes e Reps`, `Bolsistas`, `BLs` e `Séries de conteúdo`, cabeçalho na linha 4. As colunas são achadas pelo texto do cabeçalho; mudar a ordem não quebra nada. Uma aba nova entra em `RECORDING_TABS` (`src/domain/sheetLayout.ts`).

## Configuração (variáveis de ambiente)

| Variável | O que é |
|---|---|
| `SHEET_ID` | ID da planilha de captação da conferência |
| `SERIES_FOLDER_ID` | Pasta `Vídeos > Séries` no Drive (com as pastas `[Campanha] Série`) |
| `CONFERENCE_NAME` | Nome que aparece no topo, ex.: `BRASA Summit Europa 2026` |
| `ALLOWED_DOMAIN` | Domínio do Google Workspace (padrão `gobrasa.org`) |
| `AUTH_SECRET` | Segredo da sessão (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Cliente OAuth do Google (abaixo) |

Para outra conferência, troque `SHEET_ID`, `SERIES_FOLDER_ID` e `CONFERENCE_NAME`.

## Cliente OAuth do Google (uma vez)

1. No Google Cloud Console, com a conta @gobrasa.org, crie um projeto (ex.: "Captação BRASA").
2. Ative **Google Sheets API** e **Google Drive API**.
3. Tela de consentimento OAuth: tipo **Interno** (só contas da BRASA; não precisa de verificação do Google).
4. Credenciais > Criar ID do cliente OAuth > **Aplicativo da Web**. URI de redirecionamento: `https://SEU-DOMINIO/api/auth/callback/google`.
5. Coloque o ID e o segredo em `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` no Vercel.

Quem usa o app precisa ter acesso de edição à planilha e à pasta da conferência no drive compartilhado.

## Rodar e testar

```
npm install --legacy-peer-deps
npm test
npm run dev
```

Antes de cada conferência, teste com uma **cópia** da planilha (aponte `SHEET_ID` para a cópia).
