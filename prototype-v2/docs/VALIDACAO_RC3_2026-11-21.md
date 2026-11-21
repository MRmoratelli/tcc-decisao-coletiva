# RC3 validation — 2026-11-21
Technical pre-collection validation. Synthetic sessions are not research results.

Candidate: 640aa8626b6a9c8080cb4af2ce86fca1d7e776ac.
Prompt: consensus-consultive-v2.8-linked-quotes.
Render deployment: dep-dc0t7u2vcj2c73bmm16g, live 17:26:09 UTC.
Auto-deploy remains off. Existing release tag unchanged.

## Corrections
Literal quotations can refer to submitted text or its authoritative linked original. Binding requires the same source, participant, proposal and round. Unknown sources, mismatched kinds, nonliteral quotations, missing/duplicate coverage and invented rejection IDs remain invalid. Quote origin is derived by the server and retained in exports. Historical submitted quotes without metadata remain readable.

Individual contribution instructions now target only the participant statement, in personal voice; no collective-proposal rewrite, generalized preferences or invented concessions. Review-cache keys bind to model and prompt.

Moderator publication fields require an explicit review action once synthesis is ready. Manual intervention remains optional. The UI displays RC3 and HTML uses no-store.

## Verification
Build and 122 tests passed:
https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44929844161

Real-Gemini accepted-rewrite regression passed:
https://github.com/MRmoratelli/tcc-decisao-coletiva/actions/runs/44930014754

Synthetic room 0EF9E63850 used three synthetic identities, two signed AI rewrites actually submitted (support and rejection) plus an unchanged rejection. All three sources were assessed and synthesized; private draft required explicit publication. Second-round votes started pending. Six votes in two rounds ended in unanimous acceptance. Export/import validated and operational cache/credentials were absent.

JSON SHA-256:
8aa419baa441f3f2fd62f48b9b4927a6bd3459f0efe4aa91da5fd7614c376639

Gate script/workflow: validation/v2-linkedquotes-20261121 at 98daf7f301eedfcae7761dbb0ca193ae4260ba26.
Actions artifact: v2-linked-rewrites-synthetic-evidence (30-day retention).

## Remaining release gates
Complete moderator's human rehearsal through review/publication/new votes, assess semantic fidelity and unresolved preferences, align external consent/academic/operational documents, then record final release. A successful run does not guarantee future provider availability. No retrospective claim about the exact contents of previously rejected unretained provider responses.
