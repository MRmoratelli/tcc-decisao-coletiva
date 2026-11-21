# Participação e moderação simplificadas — V2
Base: branch feat/vite-typescript-decisao-generica, commit da17ed77d4237191474bb4d7438bef982e8c0509.

## Comportamento
- Novas salas: título, 2–15 participantes e proposta inicial obrigatórios; contexto opcional.
- Convite único /?sala=CODIGO. Identidade criptograficamente aleatória gerada no navegador, guardada antes da inscrição e associada sob bloqueio transacional a uma vaga predefinida. A mesma credencial retorna à mesma identidade; o servidor conserva somente seu hash.
- Termo integral v1.1, adaptado da informação e concordância v1.0 de 20/11/2026. Alteração somente do procedimento para registro eletrônico; texto, fonte e versão são conservados por sala. Caixa desmarcada; aceite explícito antes de acessar a discussão. Concordância, horário ISO com fuso UTC, versão e identificador ficam em researchConsents, separados dos votos, sem credenciais.
- Quantidade de habilitados é fixa. Participantes ainda não inscritos continuam pendentes; nenhum silêncio, ressalva ou abstenção produz consenso.
- Após todos os votos, havendo divergência, análise e síntese são preparadas automaticamente. Rascunhos e estado da preparação são privados do moderador; não existe publicação automática.
- Falha da IA fica registrada, oferece nova tentativa e mantém edição manual. Revisão e publicação humanas continuam obrigatórias.
- Rascunho chega ao editor do moderador automaticamente quando não há edição humana em andamento. Edições em andamento são preservadas; o rascunho pode ser carregado explicitamente.
- Argumentos: Revisar meu argumento com IA; Analisando seu argumento…; Revisar novamente com IA. Usar reformulação da IA ou Descartar parecer da IA precedem Registrar [posição]. O descarte também conserva o parecer, a reformulação e a escolha no histórico.
- Proposta publicada mantém original da IA, versão publicada, justificativa e alterações do moderador.
- Salas antigas e importações conservam seus acessos individuais, histórico, votos e formatos anteriores. O novo consentimento e a inscrição automática são ativados em novas salas criadas pelo fluxo simplificado; não se inventam consentimentos históricos.

## Limites operacionais
A recuperação automática depende do mesmo navegador e de seu armazenamento. Outro navegador ou limpeza de dados não recupera automaticamente a identidade. O acesso por credencial existente permanece disponível. A retomada da preparação após reinício usa estado persistido e uma janela de 3 minutos para uma tarefa interrompida; falhas terminadas requerem tentativa explícita. As consultas externas opcionais preservam sua autorização própria.

## Validação
Compilação TypeScript e Vite. Suíte existente e novos testes de servidor/interface cobrem autenticação, inscrição concorrente, limite, consentimento, retorno idempotente, síntese privada, publicação, consenso, exportação/importação histórica, indisponibilidade da IA e voto único.
O ambiente local bloqueia conexões TCP de loopback: testes de integração foram executados com um transporte HTTP em memória temporário, preservando os handlers Express e o PostgreSQL PGlite reais. Esse transporte não integra o produto e não é publicado. CI executa os mesmos testes com HTTP normal.

Resultado local final: 97 testes aprovados, 0 falhas; TypeScript e Vite aprovados.

A inscrição usa INSERT em dc2_participants, apenas ao ocupar a vaga reservada no estado. Não altera hashes existentes, não amplia permissões e não requer migração de esquema.
