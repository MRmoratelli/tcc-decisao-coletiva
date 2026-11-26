# ENG-D06 — Implementação e API

A API responde JSON, com rotas sob `/api`. Nas rotas autenticadas da sala, o corpo inclui `credential`. As gravações que exigem uma referência vigente verificam identificadores de rodada e proposta, revisão esperada ou contagem confirmada de votos pendentes, conforme a operação.

| Rota | Operação |
|---|---|
| `GET /health` | Conferir banco, versão, commit e presença da configuração de IA. |
| `POST /ai/proposal-review` | Revisar proposta mediante consentimento e emitir recibo assinado. |
| `POST /rooms` | Criar sala com proposta, quantidade e confirmação do fluxo de revisão inicial. |
| `POST /rooms/:code/invitation`, `/join` | Consultar condições de ingresso, registrar aceite e obter vínculo a um pseudônimo. |
| `POST /rooms/:code/view` | Projetar a sala por papel. Pode retornar apenas a revisão e `unchanged` quando o cliente já tem a versão. |
| `POST /rooms/:code/contribution-review` | Revisar a justificativa de rejeição mediante autorização. |
| `POST /rooms/:code/votes` | Registrar posição. No caso de rejeição, persiste justificativa e metadados do parecer quando aplicável, na mesma mutação. |
| `POST /rooms/:code/round-close`, `/participant-remove` | Confirmar encerramento da rodada ou registrar saída. |
| `POST /rooms/:code/prepare-mediation`, `/analyze-objections`, `/synthesize` | Solicitar preparação ou suas etapas para a moderação. |
| `POST /rooms/:code/publish`, `/close` | Publicar a nova proposta ou encerrar o processo sem consenso. |
| `POST /rooms/:code/contest`, `/evaluation` | Registrar contestação e avaliação individual, conforme a etapa e o papel. |
| `POST /rooms/:code/export`, `/evaluation-results`, `POST /import` | Exportar o processo, consultar estatísticas ou restaurar uma cópia. |

As rotas abreviadas herdam o prefixo `/rooms/:code`. O endpoint `/contributions` permanece disponível no código, embora a tela de votação tenha retirado a ação avulsa. O código também preserva contratos para registros factuais históricos. A revisão do Gemini opera sobre o texto recebido pela aplicação.

## Configuração e reprodução

**Requisitos:** Node.js 22.12 ou superior, npm e PostgreSQL isolado. Em uma cópia de trabalho, entre em `prototype-v2`, execute `npm ci`, configure o ambiente conforme [`.env.example`](../../.env.example), execute `npm run migrate` no banco isolado e use `npm run dev`. O frontend local usa a porta 5173 e o servidor usa 8787 por padrão. Para produção, execute `npm run build` e `npm start`. Instale as dependências de desenvolvimento na etapa de build e preserve `tsx` no ambiente usado pelo script de inicialização.

| Variável | Uso |
|---|---|
| `DATABASE_URL_V2`, `DATABASE_URL_V2_DIRECT` | Banco isolado. A conexão direta é usada pelas migrações quando definida. |
| `V2_DATABASE_ISOLATED` | Confirmação operacional exigida pelo servidor. Valor `true` depois de conferir o destino. |
| `AUTH_PEPPER`, `REVIEW_SIGNING_KEY` | Segredos distintos com pelo menos 32 caracteres. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Credencial da API e configuração opcional do modelo. |
| `NODE_ENV`, `PORT`, `PUBLIC_ORIGIN` | Modo, porta de serviço e origem da interface. Em produção, a origem HTTPS pode vir de `RENDER_EXTERNAL_URL`. |

O adaptador aplica fila e orçamento persistente. A configuração padrão do código prevê até 14 chamadas por janela de 60 segundos, orçamento diário de 250 e concorrência 1. São limites internos do artefato. O esquema de resposta e os quatro modos estão documentados no [apêndice do Gemini](09-prompt-gemini.md).

Fontes: [rotas](../../server/app.ts), [scripts](../../package.json), [runtime](../../server/runtime.ts), [fila](../../server/gemini-queue.ts) e [adaptador](../../server/ai.ts).
