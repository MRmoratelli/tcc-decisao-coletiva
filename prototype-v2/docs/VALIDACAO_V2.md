# Validação técnica e entrega V2
Data-base: 17/11/2026. Repositório MRmoratelli/tcc-decisao-coletiva.
Branch exclusiva: feat/vite-typescript-decisao-generica. Base: 6e444ab202262eef08839e5310345d04aa0d7293.

## Resultado executado
| Verificação | Resultado | Limite da evidência |
|---|---|---|
| Dependências | Instalação concluída; package-lock versionado | Não é auditoria completa de dependências |
| npm test | 39 testes passaram; zero falhas, cancelados ou ignorados | A contagem do runner inclui o teste agregador da integração e seus subtestes |
| TypeScript frontend | Aprovado, modo estrito | Parte de npm run build |
| TypeScript backend | Aprovado, modo estrito | Parte de npm run build |
| Vite | Build concluída; 118 módulos | Não é implantação |
| API | HTTP real com três identidades sintéticas, V1→V2, consenso e restauração | Servidor local |
| PostgreSQL | Migrações, persistência, autorização e restauração testadas em PGlite | PostgreSQL embarcado, não Neon remoto |
| IA | Contratos, JSON inválido, falhas e cobertura com respostas sintéticas | Nenhuma chamada real ao Gemini |
| React | Cinco testes de componentes, edição, avaliação, permissões visuais e carregamento | react-test-renderer; não houve ensaio de navegador/mobile real |
| Documentação Google Docs | Aba prospectiva criada e conteúdo conferido | Não é aprovação acadêmica nem certificação final de paginação |
| Histórico Python | Nenhuma alteração em arquivos Python | Preservação do código, sem repetir sua auditoria |

Ambiente local: Node.js v24.22.1, Windows. CI V2 foi preparado para Node.js 22/Linux.
O runner React emite aviso de depreciação de react-test-renderer; os testes passaram. Migrar esses testes para abordagem DOM/navegador é evolução recomendada.
O log da build está em BUILD_V2.txt.

## Cobertura dos vinte itens solicitados
1. Proposta genérica: schema, campos opcionais e componente de edição.
2. Parecer inicial: contrato validado, sem afirmação de verificação externa.
3. Sala: criação com três credenciais e parecer assinado ou opção de ignorar.
4. Credenciais/permissões: moderador, participante e recusas de acesso.
5. Isolamento: credencial válida de outra sala recusada; segredos ausentes das views.
6. Pertinência: parecer de contribuição e alegações que precisam de fonte.
7. Contestação: original, texto enviado e contestação inicial/posterior preservados.
8. Rejeição: justificativa obrigatória no domínio e na API.
9. Abstenção/silêncio: ausência de consenso e estado PENDENTE.
10. Versionamento: V1 conservada e V2 criada com parentId.
11. Novas manifestações: votos antigos não contam, versão antiga e revisão concorrente recusadas.
12. Objeções: todas as rejeições avaliadas, citações e IDs conferidos.
13. Síntese: cobertura explícita e rascunho sem publicação automática.
14. Revisão humana: confirmação, razão e cobertura humana opcional.
15. Consenso: exatamente três aceites na mesma V2 encerram o processo sintético.
16. Sem consenso: encerramento exige razão e não altera outras salas.
17. Gemini: JSON inválido, schema inválido, transporte/falha consultiva; envio e revisão manual continuam.
18. JSON: formato versionado, dados/histórico presentes, sem credenciais.
19. Recuperação: sala nova, acessos novos, vínculos inválidos recusados, origem preservada.
20. DSR: 22 itens e A1–A4, pós-sessão, N/A separado de ausências, exportação e estatísticas.

Testes adicionais: comprovante adulterado/expirado, migração idempotente, rascunho original, repetições textuais sem exclusão, análise desatualizada e deduplicação de coorte.

## Arquivos de teste
- server/domain.test.ts: invariantes, versões, recuperação e avaliações.
- server/ai.test.ts: contratos do adaptador.
- server/api.test.ts: integração HTTP/PostgreSQL e controles de acesso.
- server/cohort.test.ts: taxa de consenso e deduplicação.
- server/receipts.test.ts: vínculo, integridade e expiração.
- src/components.test.tsx: componentes principais.

## Preservado
Backup confirmado antes da implementação: b1ccffdbfcbcd638da56026b89adeabbcdd70c9d.
Main observada: b342030bb80eb4d03ff0ee39cb5d7751bfc88336.
Não houve operação dirigida a main, backup, PR #4 ou deploy Streamlit. Não foram copiados segredos anteriores nem acessadas bases históricas.
A monografia recebeu uma aba adicional; o texto acadêmico anterior permanece na aba original.

## Pendências técnicas
Não estavam disponíveis DATABASE_URL_V2, GEMINI_API_KEY, AUTH_PEPPER, REVIEW_SIGNING_KEY ou confirmação de base isolada no ambiente de execução.
É indispensável provisionar uma base Neon V2 nova e credenciais novas, executar as migrações somente nela e validar chamadas reais dos quatro contratos Gemini.
Hospedagem Node, HTTPS, proxy /api, PUBLIC_ORIGIN, monitoramento e teste remoto por dispositivos ainda precisam ser configurados. Não há preview público ou deploy V2 nesta entrega.
Ensaios de carga, navegador real, acessibilidade assistiva e segurança independente não foram realizados.
Histórico por acréscimo é garantido pelo código da aplicação; permissões SQL contra alteração direta, retenção/exclusão e recuperação de credenciais de produção requerem definição.

## Pendências acadêmicas
Ratificação do novo recorte e protocolo, cenário, amostra, condições de avaliação, consentimento, pré-teste e rubrica humana independente.
O instrumento é preliminar, sem validação psicométrica demonstrada. A avaliação humana do moderador não substitui avaliação independente.
Qualidade argumentativa permanece sem escore enquanto não houver procedimento definido.
Não foram coletados resultados de usuários ou fabricados dados científicos.
Os capítulos 1–5 receberam texto prospectivo, e 6–8 receberam estrutura para preenchimento posterior. A consolidação final no modelo UVA ainda requer revisão editorial.

## Documentos entregues
- ESPECIFICACAO_V2.md: requisitos, arquitetura, modelo, contratos, casos de uso e matriz problema→requisito→funcionalidade→componente→teste→critério.
- ACADEMICO_V2_PROSPECTIVO.md: capítulos prospectivos e referências preservadas.
- README.md: execução local, configuração isolada, limites e avaliação.
- Aba “V2 prospectiva — 17-11-2026” na monografia oficial:
  https://docs.google.com/document/d/1ZGCZ-e4j87chplYk364C8eU5qUbcmH-fXIhdd6cqFx4/edit?tab=t.r4nlbwyv6bs0

## Próximas ações indispensáveis
1. Provisionar os serviços V2 isolados e executar a integração real, sem reutilizar dados ou credenciais históricas.
2. Configurar hospedagem e testar acesso remoto por computador/celular.
3. Ratificar o procedimento DSR e executar pré-teste antes da avaliação exploratória com participantes.
