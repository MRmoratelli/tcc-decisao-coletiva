"""Configuração controlada do modo experimental do TCC.

Este módulo concentra apenas constantes não secretas do protocolo.
"""

EXPERIMENT_CONFIG_VERSION = "experimento-v1"
EXPERIMENT_RELEASE = "experimental-v1"
TAXONOMY_VERSION = "taxonomia-v1"
CLASSIFICATION_VERSION = "classificacao-v1"
MEDIATION_VERSION = "mediacao-v1"
MAX_MEDIATION_EXECUTIONS = 2
CLASSIFICATION_FAILURE_CODES = (
    "SEM_CHAVE", "COTA_OU_LIMITE", "MODELO_INDISPONIVEL", "ACESSO_API",
    "RESPOSTA_INVALIDA", "SERVICO_INDISPONIVEL", "TEMPO_ESGOTADO", "FALHA_IA",
)
TECHNICAL_CANCEL_REASON = (
    "Falha técnica persistente da mediação IA após tentativas previstas no protocolo experimental."
)

TAXONOMY = {
    "CAT01": {"label": "Impacto pedagógico", "description": "Contribuição para ensino e aprendizagem."},
    "CAT02": {"label": "Abrangência de beneficiários", "description": "Quantidade ou grupos beneficiados ou prejudicados."},
    "CAT03": {"label": "Urgência e prioridade", "description": "Necessidade temporal, gravidade ou ordem de atendimento."},
    "CAT04": {"label": "Viabilidade de implementação", "description": "Possibilidade prática de executar a melhoria."},
    "CAT05": {"label": "Inclusão e acessibilidade", "description": "Equidade, inclusão e necessidades de acessibilidade."},
    "CAT06": {"label": "Sustentabilidade do investimento", "description": "Duração do benefício, manutenção ou efeitos de médio e longo prazo."},
    "CAT07": {"label": "Adequação orçamentária", "description": "Valor insuficiente ou excessivo, redistribuição, equilíbrio ou incompatibilidade financeira."},
    "CAT08": {"label": "Informação ou justificativa insuficiente", "description": "Falta de informação necessária para avaliar ou aceitar a proposta."},
    "CAT09": {"label": "Conflito entre múltiplos critérios", "description": "Dois ou mais critérios igualmente essenciais, sem predominância segura de um deles."},
}

TAXONOMY_CODES = tuple(TAXONOMY)


def taxonomy_display(code):
    item = TAXONOMY.get(code)
    return f"{code} — {item['label']}" if item else code


def taxonomy_prompt():
    return "\n".join(
        f"{code} — {item['label']}: {item['description']}"
        for code, item in TAXONOMY.items()
    )
