# Integração real e preparação da V2
Data-base: 17/11/2026, America/Sao_Paulo. Timestamps das evidências em UTC.
Base protegida: af2f8097317326b29b222e23257f64d663aa90d8.
Código de inicialização preparado em 5aa0fd2a085233abc2c42c6ad823928f2d356a7e.

## Situação executiva
| Serviço / etapa | Estado | Evidência e limite |
|---|---|---|
| Neon | VALIDADO | Projeto novo, migrações, API local real, três identidades sintéticas, duas rodadas, exportação, restauração e reconexão em novo processo |
| Gemini | BLOQUEADO | Projeto tcc-decisao-v2 criado no AI Studio; nova chave ainda não configurada. Zero chamadas reais dos contratos nesta etapa |
| Deploy HTTPS | PREPARADO | Serviço Render criado no plano gratuito, build/inicialização iniciados; inicialização não concluiu por falta de configuração privada. Não há aplicação pública funcional |
| Simulação remota completa | NÃO EXECUTADA | O ensaio concluído é HTTP local com Neon remoto real, sem Gemini |
| Protocolo DSR | PROSPECTIVO | Documento preparado; cenário, amostra e procedimentos sujeitos à ratificação |
| Revisão acadêmica | PARCIAL VERIFICADA | Correções na aba V2, comentários preservados; escopo da âncora de indentação ainda pendente |

## Ambiente Neon novo
Projeto: polished-star-08552333 (tcc-decisao-v2-dev).
Organização: Matheus, conexão Neon autorizada na tarefa, plano free.
Branch: br-nameless-bird-bdw8qntw (v2-development). Banco: decisao_v2.
Região: aws-us-east-2. PostgreSQL 17.
A lista inicial de tabelas de usuário estava vazia. Não foi copiada branch histórica nem acessado o banco Streamlit.
Migrações 001_remote_rooms e 002_consensus aplicadas e conferidas.
Migração: dc2_owner, conexão direta. Aplicação: dc2_app, conexão pooled, validação TLS verify-full.
dc2_app foi criada como read_only, com INSERT somente nas tabelas operacionais e UPDATE(id) em rooms para o bloqueio transacional. Não possui UPDATE ou DELETE em snapshots.
As URLs completas, senhas e segredos não constam deste relatório nem dos arquivos versionados.

## Ensaio Neon real concluído
Sala sintética BDC9792AF0; três participantes fictícios.
V1: rejeição justificada, abstenção e posição pendente; sem consenso.
Revisão operacional manual, explicitamente sintética; publicação de V2 e posições reiniciadas.
V2: três ACEITO e CONSENSUS.
Instrumento DSR armazenado com 22 respostas N/A e quatro textos explicitamente sintéticos por identidade, sem opiniões ou dados de pessoas reais.
Verificados: credenciais, permissão de moderador, isolamento entre salas, votos, versões, encerramento sem consenso em sala adicional, exportação e recuperação.
Restauração em sala nova 0FC4CB0F22, com credenciais novas.
Um novo processo Node reconectou ao Neon e confirmou o estado completo, duas rodadas e resultado persistido.
Não houve Gemini nesse ensaio; a revisão operacional não é avaliação humana científica de fidelidade.

Evidências:
- evidence/NEON_REAL.json.
- evidence/NEON_SESSION_SYNTHETIC.json.
- server/live-neon.ts, com etapa --verify-restart.
O acesso necessário à reconexão está somente em .private, ignorado pelo Git; não acompanha a exportação.

## Gemini
A única chave pré-existente observada era antiga e não foi utilizada ou copiada.
Foi criado o projeto tcc-decisao-v2 e preparado o nome tcc-decisao-v2-desenvolvimento para a chave nova. A criação da credencial requer confirmação específica.
O verificador server/live-gemini.ts está preparado para quatro contratos reais, consulta de disponibilidade do modelo, validação de cobertura e síntese sem publicação automática.
Executado sem chave: resultado BLOQUEADO, NEW_API_KEY_NOT_CONFIGURED e calls=[].
Autenticação, cotas, disponibilidade efetiva e qualidade semântica real não foram certificadas. O modelo configurado é apenas o candidato a testar, não uma disponibilidade comprovada.
Foram acrescentadas categorias saneadas para 401/403, 404, 429 e timeout; os testes dessas falhas são simulados, não chamadas ao provedor.

## Render e bloqueio de publicação
Workspace explicitamente escolhido pelo usuário: My Workspace, tea-dbug9kkipgvc738rb21g.
Serviço: srv-dbugi3dg1s2s73bpt3f0, tcc-decisao-v2-test.
Região Ohio; plano free; autoDeploy desativado; branch exclusiva V2.
Dashboard: https://dashboard.render.com/web/srv-dbugi3dg1s2s73bpt3f0
Endereço reservado, ainda não funcional: https://tcc-decisao-v2-test.onrender.com
Deploy dep-dbugi3tg1s2s73bpt5t0: update_failed. Inicialização bloqueada por configuração privada ausente; o serviço recebeu apenas NODE_ENV, NODE_VERSION e API_HOST.
A revisão automática rejeitou o envio ao Render da senha do Neon e dos segredos de autenticação por exigir autorização específica para esse destino. Essa transmissão não foi repetida por outra via.
A continuação precisa de autorização explícita para guardar DATABASE_URL_V2 com a senha de dc2_app, AUTH_PEPPER, REVIEW_SIGNING_KEY e a nova GEMINI_API_KEY exclusivamente nesse backend V2.
A conexão administrativa de migração não deve ser enviada ao runtime Render.
Configuração reproduzível sem segredos: deploy/render-service.json. Health check desejado /api/health ainda deve ser configurado no provedor.
O backend já suporta PORT, 0.0.0.0, frontend dist, /api na mesma origem e PUBLIC_ORIGIN HTTPS, incluindo a origem injetada pelo Render. Build não é comprovação de deploy funcional.

## Validação desta alteração
Os 39 testes anteriores foram mantidos como base e não repetidos como diagnóstico.
Novos testes de deploy: dois aprovados.
Regressão da API afetada: 16 testes do runner aprovados, com PostgreSQL embarcado e IA sintética.
Regressão do adaptador alterado: cinco testes aprovados, incluindo categorização de falhas simuladas.
Build final e resultados do CI da branch devem ser identificados na entrega; contagens de execuções não são somadas como testes distintos.

## Incidentes e limites
Uma tentativa de conceder duas permissões em um único comando preparado foi recusada pelo serviço; as concessões foram aplicadas como duas instruções separadas.
A primeira verificação do ensaio comparou uma view de moderador sem respostas DSR com o snapshot completo, gerando divergência no verificador. O comparador foi corrigido para o estado exportado completo e serialização canônica; a reconexão do mesmo processo decisório passou, sem repetir a sessão ou alterar seus dados.
A tentativa de conferir visualmente a âncora truncada de “Identar” não concluiu por timeout. Não foi inferida uma seleção exata nem alterado indiscriminadamente o texto original.
Não houve participantes reais, cenário científico fixado, resultados experimentais, auditoria ampla, alteração de regras de consenso ou acesso a dados históricos.

## Menor conjunto de ações para pré-teste
1. Confirmar criação da chave Gemini nova e autorização do armazenamento dos quatro segredos no backend V2 Render.
2. Executar quatro contratos Gemini reais, configurar modelo disponível, origem e health check; publicar e verificar HTTPS e API.
3. Executar sessão remota sintética completa, conferindo exportações e persistência.
4. Ratificar cenário, perfil/amostra, consentimento e procedimento DSR antes do pré-teste com pessoas.
