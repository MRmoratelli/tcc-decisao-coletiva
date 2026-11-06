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

# Itens de investimento do cenário; não são categorias de objeção CAT01–CAT09.
EXPERIMENT_SCENARIO_VERSION = "cenario-escola-v1"
SCENARIO_BUDGET = 80000
SCENARIO_ITEMS = {
    "CAT_INV01": {"code": "CAT_INV01", "name": "Melhoria das salas de aula", "ceiling": 40000, "currency": "BRL"},
    "CAT_INV02": {"code": "CAT_INV02", "name": "Computadores/equipamentos de informática", "ceiling": 35000, "currency": "BRL"},
    "CAT_INV03": {"code": "CAT_INV03", "name": "Biblioteca/material de estudo", "ceiling": 20000, "currency": "BRL"},
    "CAT_INV04": {"code": "CAT_INV04", "name": "Climatização", "ceiling": 30000, "currency": "BRL"},
    "CAT_INV05": {"code": "CAT_INV05", "name": "Acessibilidade", "ceiling": 20000, "currency": "BRL"},
}
SCENARIO_INITIAL_ALLOCATION = {"CAT_INV01": 25000, "CAT_INV02": 25000, "CAT_INV03": 10000,
                               "CAT_INV04": 15000, "CAT_INV05": 5000}
SCENARIO_THEME = "Distribuição de orçamento para melhorias em uma escola pública"
SCENARIO_CONTEXT = (
    "Cenário simulado: uma escola pública dispõe de R$ 80.000 extraordinários. "
    "Demandas máximas: salas de aula R$ 40.000; computadores R$ 35.000; biblioteca R$ 20.000; "
    "climatização R$ 30.000; acessibilidade R$ 20.000. Demandas totais: R$ 145.000. "
    "Não há orçamento adicional. As condições mínimas obrigatórias de segurança e acessibilidade "
    "são pressupostas; o item acessibilidade representa melhorias adicionais. "
    "Critérios qualitativos comuns, sem pesos automáticos: impacto pedagógico, abrangência de beneficiários, "
    "urgência, viabilidade, inclusão e sustentabilidade. A distribuição estruturada é a referência financeira; "
    "acordo não equivale a uma distribuição ótima ou justa."
)
SCENARIO_INITIAL_TEXT = (
    "Distribuir os R$ 80.000: R$ 25.000 para salas de aula; R$ 25.000 para computadores; "
    "R$ 10.000 para biblioteca; R$ 15.000 para climatização; R$ 5.000 para acessibilidade."
)


def scenario_definition():
    return {"scenario_version": EXPERIMENT_SCENARIO_VERSION, "budget": SCENARIO_BUDGET, "currency": "BRL",
            "allocation_items": {code: dict(item) for code, item in SCENARIO_ITEMS.items()},
            "initial_allocation": dict(SCENARIO_INITIAL_ALLOCATION)}


def validate_scenario_allocation(items, scenario=None):
    """Valida limites objetivos em reais inteiros; não otimiza nem interpreta texto."""
    if scenario is not None and scenario != scenario_definition():
        raise ValueError("Configuração do cenário não reconhecida; não é possível validar automaticamente.")
    if not isinstance(items, dict) or set(items) != set(SCENARIO_ITEMS):
        raise ValueError("Informe exatamente os cinco itens financeiros do cenário, sem itens desconhecidos ou recursos adicionais.")
    for code, item in SCENARIO_ITEMS.items():
        value = items[code]
        if type(value) is not int:
            raise ValueError("Os valores financeiros devem ser números inteiros finitos em reais, sem centavos.")
        if value < 0:
            raise ValueError("Os valores financeiros não podem ser negativos.")
        if value > item["ceiling"]:
            raise ValueError("Valor acima do teto da demanda: " + item["name"] + ".")
    total = sum(items.values())
    if total > SCENARIO_BUDGET:
        raise ValueError("O total distribuído não pode ultrapassar R$ 80.000.")
    return {"items": {code: items[code] for code in SCENARIO_ITEMS}, "total": total,
            "unallocated": SCENARIO_BUDGET - total, "currency": "BRL"}

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
