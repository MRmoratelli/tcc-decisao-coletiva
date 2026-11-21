# Congelamento operacional V2 — 21/11/2026

Código implantado: `63189e5f21dd2794f5677894dc6cae04597095f5`.
Referência: `freeze/v2-coleta-20261121-final`.
Render: `dep-dc0utut6e07s73bnuh2g`, live às 16:21:15 BRT. Auto deploy desativado.
Modelo `gemini-3.5-flash-lite`; prompt `consensus-consultive-v2.9-decision-progress`; termo `1.4-2026-11-21`.

## Verificação técnica

- Build, TypeScript e 130 testes aprovados, zero falhas: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44940268869
- Gate remoto do questionário integrado PASS: https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44940537150
- Health confirmou SHA exato e limites: teto global de 14 chamadas em janela móvel de 60 s e intervalo individual de 60 s.
- Questionário indisponível durante deliberação, disponível após encerramento legítimo em uma rodada, com e sem consenso.
- Três respostas sintéticas distintas; duplicidade recusada; cada participante visualiza somente sua própria avaliação; resultados restritos ao moderador.
- Persistência/exportação validadas; notas, N/A, omissões e não respondentes distintos; validação de importação preserva metadados históricos.
- Salas exclusivamente sintéticas: A2BA43CF38 e 3412D5720C. Não são dados científicos.
- SHA-256 do JSON sintético: `fd71182b534d6326381e786e6b707622e2e9d48c9a101bfb10593f068433bf10`.

## Uso na coleta

Canal único: DSR-1.1-NATURALISTICO integrado, uma resposta voluntária após encerramento legítimo. Os 22 itens, A1–A3 e a escala foram preservados; A4 continua explicitamente adaptada para usos futuros. Sem validação psicométrica demonstrada. Forms anterior somente histórico. A revisão pela equipe e a conferência de compreensão foram relatadas pelo responsável em 21/11/2026, sem alegar aprovação formal do orientador.

Criar sala científica nova; obter concordâncias antes da participação; registrar fatos e incidentes; após recebimento, exportar processo JSON completo e resultados da avaliação para área privada. Não alterar código/prompt/modelo durante a coleta. Testes técnicos não demonstram eficácia científica e não garantem disponibilidade futura de provedores. Main, backup, PR #4, V1 e registros históricos permanecem preservados.
