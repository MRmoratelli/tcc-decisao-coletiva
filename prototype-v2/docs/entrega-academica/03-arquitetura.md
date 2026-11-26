# ENG-D03 — Arquitetura do sistema

| Componente | Responsabilidade |
|---|---|
| Cliente React, TypeScript e Vite | Apresentar os fluxos do moderador e do participante, manter o acesso no navegador e sincronizar a sala pela API. |
| API Express e TypeScript | Autenticar, validar contratos, aplicar o domínio e projetar os dados de acordo com o papel. Em produção, o mesmo serviço entrega o frontend e a API. |
| Domínio | Controlar elegibilidade, prazos, votos, consenso, histórico e publicação. |
| Repositório PostgreSQL | Consultar credenciais por hash e persistir revisões do estado em JSONB. |
| Adaptador Gemini | Montar a requisição, validar a resposta estruturada e comunicar falhas do provedor à aplicação. |
| Mediação automática | Coordenar análise e síntese quando a rodada termina, proteger contra resultados desatualizados e disponibilizar o rascunho para revisão. |

A V2 congelada foi publicada no serviço Node do [Render de validação](https://tcc-decisao-v2-validacao.onrender.com/), com banco Neon separado da sessão acadêmica. O acesso externo usa HTTPS. O frontend e `/api` compartilham a mesma origem. Segredos do banco, autenticação, assinatura e Gemini são configurados no servidor.

A requisição ao Gemini parte do backend quando o fluxo de autorização aplicável permite. A mediação utiliza propostas e manifestações pseudonimizadas. As credenciais de sala e de provedor ficam fora do conteúdo do prompt. A disponibilidade da integração depende do serviço externo e de suas cotas.

O cliente sincroniza o estado pela revisão da sala. O servidor verifica consistência sob bloqueio ao gravar. O papel do solicitante determina a projeção recebida, inclusive a ocultação de análises ainda privadas.

Figuras [F03–F05](figuras/CATALOGO.md). Fontes: [entrada do servidor](../../server/index.ts), [configuração](../../server/runtime.ts), [persistência](../../server/db.ts) e [mediação](../../server/automatic.ts).
