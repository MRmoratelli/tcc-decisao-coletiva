# Decisão Coletiva — V2 congelada

Frontend React, TypeScript e Vite. API Express e TypeScript, persistência PostgreSQL e integração consultiva com o Gemini.

- [Documentação de engenharia da entrega](docs/entrega-academica/README.md)
- [Manual e roteiro com dois participantes](docs/entrega-academica/08-manual-demonstracao.md)
- [Prompt e apêndice para a monografia](docs/entrega-academica/09-prompt-gemini.md)
- [Serviço de validação no Render](https://tcc-decisao-v2-validacao.onrender.com/)

## Executar

Requer Node.js 22.12 ou superior, npm e PostgreSQL isolado. A partir deste diretório:

```sh
npm ci
# Configure o ambiente conforme .env.example, usando um banco de teste isolado.
npm run migrate
npm test
npm run build
npm run dev
```

Em desenvolvimento, o frontend usa a porta 5173 e encaminha a API. Em produção, `npm start` serve o frontend já compilado e a API na mesma origem. Consulte a [documentação da configuração](docs/entrega-academica/06-implementacao-api.md#configuração-e-reprodução).

## Referência da entrega

O código documentado é o commit `ea225a5`. Para consultar os resultados da sessão acadêmica, use a referência `63189e5` e a branch histórica [`entrega-academica-2026`](https://github.com/MRmoratelli/tcc-decisao-coletiva/tree/entrega-academica-2026).
