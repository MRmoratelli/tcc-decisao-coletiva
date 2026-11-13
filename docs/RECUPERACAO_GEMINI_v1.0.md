# Recuperação técnica Gemini — candidato de 13/11/2026

Configuração candidata para novas sessões sintéticas A: `gemini-3.5-flash-lite`, SDK `google-genai==2.34.0`, temperatura omitida da requisição (`temperature=null`, `temperature_policy=provider_default` no registro). `GEMINI_MODEL` explícito tem prioridade; conferir o valor efetivo no primeiro export da sala. Não usar a sala anteriormente cancelada.

Os testes externos informados pelo responsável mostraram 504 com 3.8 sem temperatura e sucesso com 3.5 Flash-Lite. Isso sustenta investigar disponibilidade/latência do modelo/caminho, sem afirmar que temperature=0 causou o erro. Catálogo e parâmetros oficiais: [modelo](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [parâmetros depreciados](https://aistudio.google.com/docs/whats-new-gemini-3.6#api-changes-and-parameter-updates), [SDK](https://googleapis.github.io/python-genai/).

Preservados: prompts classificacao-v1/mediacao-v1, CAT01–CAT09, JSON estruturado, M01…Mn e remapeamento para pseudônimos, três tentativas internas transitórias por execução, duas execuções de mediação, modelo único, fallback humano somente de classificação, revisão humana e cancelamento técnico. Orçamento, condições de acordo, votação, B, instrumentos e critérios científicos não mudam. O padrão do provedor não significa determinismo.

A configuração fixa inclui a política de temperatura. Uma sala antiga com modelo/temperatura anteriores não é convertida para o candidato. Exportação histórica conserva o que foi registrado; divergência bloqueia a continuidade. Não reescrever eventos, reaproveitar mediação antiga ou fabricar saída para contornar falha.

Rastreabilidade adicional: SDK/duração de classificação e diagnóstico seguro no JSON/evento; SDK de mediação em sucesso; checkout_commit observado com Git quando disponível, separado de APP_COMMIT declarado. Nenhum segredo, corpo integral de exceção ou chave é registrado. O CSV mantém o formato anterior. Sem Git verificável, o campo observado é null.

Validação exigida: suíte completa Python 3.12 + PostgreSQL temporário no CI do SHA exato; testes reais da API por nova sala com cinco participantes sintéticos; leitura da sugestão, conferência financeira, nota de revisão, publicação, novos votos e encerramento; auditoria de JSON/CSV/eventos. Mocks não comprovam disponibilidade ou qualidade semântica. Registrar falhas como falhas, sem substituição por mediação manual em A.

Este documento não é um resultado de teste nem aprovação acadêmica. Relatório da execução deve informar commit, ambiente, contagens, evidências reais e limites. G06/G10 permanecem no estado formal anterior; D16 continua pendente. Nenhum experimento científico ou alteração de capítulos/D19/D20 é autorizado por este documento.
