# Gemini HTTP 503 — diagnóstico e correção
## Evidência
Os logs do serviço V2 registraram respostas HTTP 503 do modelo gemini-3.5-flash-lite às 03:42:54 e 03:43:16 de 21/11/2026 (America/Sao_Paulo). O backend e o banco permaneceram disponíveis. O adaptador categorizava o 503 como TRANSPORT e a API devolvia uma mensagem genérica.

A versão instalada do SDK JavaScript é 1.52.0. Seu código apiCall faz fetch direto quando httpOptions.retryOptions não é definido. Portanto, o suporte de retry existente no SDK não estava ativado nesta configuração.

## Correção
- Até três tentativas no mesmo modelo e no mesmo contrato, com espera exponencial de 1s e 2s mais jitter de até 249ms.
- Prazo total de 60s; cada requisição mantém no máximo os 30s anteriores e é limitada pelo tempo restante.
- Somente HTTP 408, 500, 502, 503 e 504 são repetidos. Quota 429, autenticação, contrato inválido, JSON inválido e parâmetros incorretos não são repetidos automaticamente.
- O controle é feito no adaptador. O retry interno opcional do SDK não é habilitado, evitando multiplicação de chamadas.
- Falha 503 persistente é categorizada como PROVIDER_UNAVAILABLE e devolvida como HTTP 503 com número de tentativas. A revisão inicial informa que o Gemini está indisponível e conserva o rascunho.
- Logs de tentativa/recuperação registram somente modo, modelo, status, código e duração; não registram prompts, chaves ou mensagem privada do provedor.
- Não há troca automática de modelo nem alteração de credenciais. Falha nunca gera parecer fictício, publica proposta ou registra voto.

## Limite
Esta correção melhora a recuperação de falhas transitórias. Ela não garante disponibilidade do serviço externo quando o próprio Gemini continua retornando 503.

## Referências oficiais
https://aistudio.google.com/docs/troubleshooting#retry-strategy
https://aistudio.google.com/docs/api-errors

Validação local: 109 testes aprovados; TypeScript e Vite aprovados. Inclui SDK real com HTTP simulado, recuperação após dois 503, limite de tentativas, orçamento de tempo, resposta HTTP e preservação do rascunho.
