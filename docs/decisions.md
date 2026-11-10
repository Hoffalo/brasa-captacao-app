# Decisões

## 1. O app age como a pessoa logada, não como conta de serviço

**Contexto.** A skill de captação previa uma conta de serviço com acesso à planilha e à pasta. Organizações Google Workspace costumam bloquear a criação de chaves de conta de serviço, e uma chave JSON no Vercel é mais um segredo para proteger.

**Decisão.** Login com Google (Auth.js) com os escopos de Sheets e Drive, `access_type=offline`, e o app chama as APIs com o token de quem está logado. O token nunca vai para o navegador: as rotas leem o JWT da sessão no servidor e renovam o token quando expira (a conferência dura o dia todo e o token do Google dura uma hora).

**Consequências.** Só é preciso um cliente OAuth do tipo Interno. O histórico de versões da planilha mostra quem mudou cada status. Cada pessoa do time precisa ter acesso de edição à planilha e à pasta.

## 2. Os vídeos não passam pelo servidor

**Contexto.** Os vídeos têm de 100 a 400 MB; o corpo de uma função do Vercel tem limite de poucos MB.

**Decisão.** O servidor abre uma sessão de upload resumable no Drive, informando o Origin do app, e devolve a URL. O navegador envia pedaços de 8 MiB direto para o Google e retoma a partir do último byte confirmado quando a conexão cai.

## 3. A linha é achada pelo nome, na hora de escrever

**Contexto.** O formato BSA26 não tem coluna de ID, e o time edita e ordena as abas durante o evento.

**Decisão.** A chave é aba + nome da primeira coluna. Toda escrita relê a aba e localiza a linha imediatamente antes de gravar; se a pessoa sumiu da aba, a escrita falha com uma mensagem em vez de cair na linha errada (o erro da BSA26).

## Considerado e não usado

- **Pacote `googleapis`:** pesado para três chamadas REST; `fetch` com timeout resolve.
- **Google Apps Script:** evitaria o Vercel, mas o limite de payload do `google.script.run` não aguenta vídeo e o deploy fica preso à conta de uma pessoa.
