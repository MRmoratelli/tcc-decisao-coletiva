# Decisão Coletiva — Protótipo V2

Nova frente de desenvolvimento independente da versão experimental Streamlit.

## Estado real
Incremento inicial NÃO implantado, NÃO testado com usuários e NÃO equivalente em funcionalidades à versão experimental do backup. Este projeto não deve substituir o deploy anterior nesta fase.

Implementado nesta primeira entrega:
- Vite 8 + React 19 + TypeScript para o navegador.
- API Express/TypeScript no servidor, com Gemini via SDK @google/genai.
- Proposta livre: assunto e texto sem orçamento escolar obrigatório.
- Parecer consultivo da IA antes de criar a sala, com perguntas e observações, não bloqueante.
- Sala com código aleatório, acesso exclusivo do moderador e credenciais por participante P01...Pn (armazenadas apenas como HMAC).
- Revisão de pertinência antes de publicar contribuições. O autor pode rever o texto ou publicar mesmo discordando da IA; o original e o parecer são armazenados.
- Marcação de alegações que exigem evidência; NÃO é verificação factual independente nem prova de neutralidade.
- Banco PostgreSQL separado, com tabelas prefixadas dc2_, sem alterar o esquema anterior.
- Visibilidade inicial limitada: um participante só vê contribuições de outros após registrar a sua primeira contribuição válida.

Ainda NÃO portado da implementação anterior:
- Propostas iterativas V2/V3, revisão por moderador, estados formais de acordo e fechamento.
- Eventos/auditoria detalhada e exportações JSON/CSV.
- Testes de interface e testes de integração com Neon/Gemini.
- Autorização de uso real, consentimento e avaliação acadêmica revista.
- A política de visibilidade completa por versões da implementação original.
Não excluir o código Python antigo desta branch até confirmar paridade funcional e decidir sobre a transição.

## Rodar em desenvolvimento
Requer Node.js 22.12+ ou versão 20.19+ compatível com Vite 8, PostgreSQL dedicado e credencial Gemini de teste no servidor.

1. Entre em prototype-v2 e instale as dependências com npm install.
2. Copie .env.example para .env (não publicar no Git).
3. Configure DATABASE_URL_V2 para um banco de desenvolvimento NOVO; AUTH_PEPPER e REVIEW_SIGNING_KEY distintos, fortes (32+ caracteres); GEMINI_API_KEY válida no servidor.
4. Execute server/schema.sql SOMENTE nesse banco de desenvolvimento.
5. Execute npm run test e npm run build; corrija qualquer falha antes de avançar.
6. Execute npm run dev e abra http://localhost:5173.
7. A API fica em 127.0.0.1:8787, e o proxy Vite encaminha /api no desenvolvimento.

## Deploy posterior (não realizado)
Vite gera arquivos estáticos, NÃO hospeda a API Node. Em produção, hospede a API separadamente atrás de HTTPS e use proxy reverso /api na mesma origem ou defina uma política CORS restrita. Nunca configure GEMINI_API_KEY, DATABASE_URL_V2, AUTH_PEPPER ou REVIEW_SIGNING_KEY como VITE_*: todo VITE_* é exposto ao browser.

O limitador de requisições atual é local ao processo e não substitui proteção distribuída, política de retenção de dados e monitoramento em produção. Os dados de texto livre não são anônimos por garantia; estabeleça consentimento, política de exclusão e privacidade antes de coletar dados reais.

## Escopo científico
Esta V2 altera o objeto e a intervenção experimental: não reutilize sem revisão as métricas, D19/D20, resultados ou regras do protocolo A/B da versão anterior. O código da sala e credenciais permanecem como conceito, mas dados e esquema são separados.

## Segurança da versão anterior
A branch backup aponta para o commit b1ccffdbfcbcd638da56026b89adeabbcdd70c9d (13/11/2026). NÃO mover essa branch. A main, o PR #4 e o deploy Streamlit anterior não fazem parte desta migração.
