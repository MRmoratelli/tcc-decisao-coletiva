"""Interface web do sistema de decisão coletiva."""
from __future__ import annotations

import json
import os
from collections import Counter
from pathlib import Path

import streamlit as st

from ai_service import AIService, DEFAULT_MODEL, FAILURE_MESSAGES, failure_message
from experiment_config import (
    CLASSIFICATION_FAILURE_CODES, TAXONOMY_CODES, TECHNICAL_CANCEL_REASON, taxonomy_display,
    SCENARIO_THEME, SCENARIO_CONTEXT, SCENARIO_INITIAL_TEXT, validate_scenario_allocation,
)
from decision import (
    COVERAGE_STATES, MANUAL_MEDIATION_FIELDS, MANUAL_RESTRICTION_CHECKS,
    UNCHANGED_REVIEW_NOTE, DecisionError, NO_OBJECTION, POSITIONS, Repository, UNCLASSIFIED,
    consensus, csv_export, current_proposal, current_responses, mediation_attempt_state, research_export,
    proposal_financial_state, session_scenario,
)


def setting(name, default=""):
    value = os.getenv(name)
    if value is not None:
        return value
    try:
        return str(st.secrets.get(name, default))
    except (FileNotFoundError, st.errors.StreamlitSecretNotFoundError):
        return default


@st.cache_resource
def repository(database_url, sqlite_path, experimental_mode, app_commit=None):
    # Compartilha apenas a configuração. Conexões são abertas por transação.
    return Repository(database_url=database_url, sqlite_path=sqlite_path, experimental_mode=experimental_mode, app_commit=app_commit)


def notify(message):
    st.session_state["notice"] = message


def execute(action):
    try:
        return True, action()
    except DecisionError as error:
        st.error(str(error))
    except Exception:
        st.error("Não foi possível salvar ou ler os dados. Tente novamente; o moderador pode conferir a conexão do app.")
    return False, None


def participant_has_current_response(snapshot):
    """Somente a manifestação do próprio participante na proposta ativa libera a visão."""
    actor = snapshot["actor"]
    return actor["role"] == "participant" and any(
        response["participant_id"] == actor["id"]
        for response in current_responses(snapshot)
    )


def participant_visibility_blocked(snapshot, experimental_mode):
    return (experimental_mode and snapshot["actor"]["role"] == "participant"
            and not participant_has_current_response(snapshot))


def experimental_storage_ready(repo):
    return not repo.experimental_mode or repo.postgres


def money(value):
    return "R$ " + f"{value:,}".replace(",", ".")


def financial_proposal_view(snapshot, proposal_id=None):
    financial = proposal_financial_state(snapshot, proposal_id)
    if financial["scenario"] is None:
        return
    st.subheader("Distribuição financeira da proposta vigente" if proposal_id is None else "Distribuição financeira registrada")
    if financial["status"] != "VALID":
        st.error("Esta proposta não possui distribuição financeira que possa ser validada automaticamente.")
        return
    allocation, scenario = financial["allocation"], financial["scenario"]
    st.table([{"Item de investimento": item["name"], "Valor alocado": money(allocation["items"][code]),
               "Teto da demanda": money(item["ceiling"])} for code, item in scenario["allocation_items"].items()])
    st.caption("Orçamento: " + money(scenario["budget"]) + " · Total distribuído: " + money(allocation["total"]) +
               " · Saldo não alocado: " + money(allocation["unallocated"]))
    st.caption("O saldo pertence ao mesmo orçamento, não é recurso adicional. Os valores estruturados são a referência financeira; a decisão substantiva permanece humana.")


def allocation_editor(snapshot):
    financial = proposal_financial_state(snapshot)
    if financial["scenario"] is None:
        return None, True
    st.subheader("Distribuição financeira da proposta")
    if financial["status"] != "VALID":
        st.error("A configuração ou distribuição vigente não pode ser validada automaticamente; publicação financeira bloqueada.")
        return None, False
    st.caption("Informe primeiro os valores; depois finalize o texto e a revisão. Valores em reais inteiros, sem centavos. "
               "O sistema não interpreta números do texto nem avalia se a distribuição é justa ou ótima.")
    st.caption("Estes campos se referem à próxima versão; a proposta vigente só muda após publicação.")
    scenario, previous = financial["scenario"], financial["allocation"]
    proposal = current_proposal(snapshot)
    values = {code: st.number_input(item["name"] + " — valor em R$", min_value=0, max_value=item["ceiling"],
                                   value=previous["items"][code], step=1, key="allocation_" + proposal["id"] + "_" + code)
              for code, item in scenario["allocation_items"].items()}
    total = sum(values.values())
    st.caption("Orçamento: " + money(scenario["budget"]) + " · Total distribuído: " + money(total) +
               " · Saldo não alocado: " + money(scenario["budget"] - total))
    try:
        validate_scenario_allocation(values, scenario)
    except ValueError as error:
        st.error(str(error))
        return values, False
    return values, True


def login_screen(repo):
    st.write("Discuta uma proposta, revise o texto e registre a aceitação do grupo em até três rodadas.")
    join, create = st.tabs(["Entrar na sala", "Criar sala"])
    with join:
        with st.form("login"):
            code = st.text_input("Código da sala", value=str(st.query_params.get("sala", "")), max_chars=10)
            token = st.text_input("Credencial individual", type="password", help="Recebida do moderador da sala.")
            submitted = st.form_submit_button("Entrar", type="primary")
        if submitted:
            ok, _ = execute(lambda: repo.snapshot(code, token.strip()))
            if ok:
                st.session_state["auth"] = {"code": code.strip().upper(), "token": token.strip()}
                st.query_params["sala"] = code.strip().upper()
                st.rerun()
    with create:
        storage_ready = experimental_storage_ready(repo)
        if not storage_ready:
            st.error("Modo experimental requer PostgreSQL persistente. Configure DATABASE_URL antes de iniciar uma sessão.")
        scenario_enabled = repo.experimental_mode and st.checkbox("Usar cenário experimental de orçamento escolar", value=True)
        if scenario_enabled:
            st.caption("Cenário simulado oficial: R$ 80.000 para cinco demandas de R$ 145.000 no total. "
                       "V1 usa a distribuição fixa de R$ 25.000 / 25.000 / 10.000 / 15.000 / 5.000.")
        st.caption("O tema é livre. Descreva uma proposta concreta e as restrições conhecidas antes de convidar o grupo.")
        with st.form("create"):
            theme = st.text_input("Tema da decisão", value=SCENARIO_THEME if scenario_enabled else "", max_chars=300)
            context = st.text_area("Contexto e restrições conhecidas", value=SCENARIO_CONTEXT if scenario_enabled else "", max_chars=6000)
            proposal = st.text_area("Texto da proposta inicial", value=SCENARIO_INITIAL_TEXT if scenario_enabled else "", height=180, max_chars=12000)
            if repo.experimental_mode:
                roster = st.number_input("Número de participantes", min_value=2, max_value=30, value=5, step=1)
            else:
                roster = st.text_area("Participantes: um nome ou apelido por linha", help="Lista fixa da sala. Para seu experimento, cadastre as 3 a 5 pessoas disponíveis.")
            enabled = st.checkbox("Usar IA para sugerir categorias e revisões", value=True)
            if repo.experimental_mode:
                st.caption("As manifestações dos demais ficam ocultas até sua resposta em cada versão. Com IA ativa, textos sanitizados são enviados ao Gemini; a mediação usa identificadores temporários M01, M02 etc. Evite dados pessoais no texto.")
            else:
                st.caption("As manifestações ficam visíveis aos membros da sala. Com IA ativa, tema, proposta e justificativas serão enviados ao Gemini com identificadores P01, P02 etc. Evite dados pessoais no texto.")
            submitted = st.form_submit_button("Criar sala e gerar acessos", type="primary", disabled=not storage_ready)
        if submitted and storage_ready:
            aliases = int(roster) if repo.experimental_mode else [line.strip() for line in roster.splitlines() if line.strip()]
            ok, invitation = execute(lambda: repo.create_room(theme, context, proposal, aliases, enabled, scenario_enabled=scenario_enabled))
            if ok:
                st.session_state["invitation"] = invitation
                st.session_state["auth"] = {"code": invitation["code"], "token": invitation["moderator_token"]}
                st.query_params["sala"] = invitation["code"]
                notify("Sala criada. Salve as credenciais antes de distribuir os acessos.")
                st.rerun()


def invitation_panel():
    invitation = st.session_state.get("invitation")
    if not invitation:
        return
    with st.expander("Credenciais da sala recém-criada — salve agora", expanded=True):
        st.write("Código da sala:", invitation["code"])
        st.write("Sua credencial de moderador:")
        st.code(invitation["moderator_token"], language=None)
        st.caption("Guarde a credencial de moderador. Envie a cada participante somente sua credencial individual e o código da sala. Quem possui uma credencial pode agir como seu titular.")
        for person in invitation["invitations"]:
            st.write(person["alias"], "·", person["pseudonym"])
            st.code(person["token"], language=None)
        st.download_button("Baixar acessos (arquivo confidencial)",
                           json.dumps(invitation, ensure_ascii=False, indent=2),
                           file_name=f"acessos_{invitation['code']}.json", mime="application/json")
        if st.button("Já salvei: ocultar credenciais"):
            del st.session_state["invitation"]
            st.rerun()


def response_form(repo, ai, snapshot, code, token):
    actor, room = snapshot["actor"], snapshot["room"]
    if actor["role"] != "participant":
        st.info("Você está no acesso de moderador. Se também participar da decisão, use sua credencial individual em outro navegador ou saia e entre como participante.")
        return
    if room["state"] != "COLETA":
        st.info("O moderador pausou a coleta para revisar a proposta ou encerrar a sala.")
        return
    proposal = current_proposal(snapshot)
    old = next((r for r in current_responses(snapshot) if r["participant_id"] == actor["id"]), None)
    prefix = f"response_{room['id']}_{proposal['id']}_{actor['id']}"
    edit_key = prefix + "_expected"
    if st.button("Carregar minha manifestação salva", key=prefix + "_reload"):
        for key in (edit_key, prefix + "_position", prefix + "_argument"):
            st.session_state.pop(key, None)
        st.rerun()
    if edit_key not in st.session_state:
        st.session_state[edit_key] = old["edit"] if old else 0
    st.caption("Aceitar com ressalvas significa aceitar esta versão, registrando preocupações. Se uma alteração for obrigatória para aceitar, escolha ‘Não aceito’.")
    with st.form(prefix):
        position = st.radio("Minha posição sobre esta versão", list(POSITIONS),
                            format_func=POSITIONS.get, index=list(POSITIONS).index(old["position"]) if old else 0,
                            key=prefix + "_position")
        if repo.experimental_mode:
            st.caption("Não informe nome, e-mail, telefone, matrícula, documento ou outros dados pessoais na justificativa.")
        argument = st.text_area("Justificativa e ressalvas", value=old["argument"] if old else "",
                                max_chars=6000, height=130, key=prefix + "_argument")
        submitted = st.form_submit_button("Salvar manifestação", type="primary")
    if submitted:
        ok, saved = execute(lambda: repo.submit_response(code, token, proposal["id"], position, argument,
                                                       st.session_state[edit_key]))
        if not ok:
            return
        st.session_state[edit_key] = saved["edit"]
        # O voto é persistido antes da chamada externa.
        notice = "Manifestação salva."
        if argument.strip() and room["ai_enabled"]:
            with st.spinner("Manifestação salva. A IA está sugerindo uma categoria..."):
                classification = ai.classify(snapshot, position, argument.strip())
                execute(lambda: repo.apply_classification(code, token, proposal["id"], saved["id"], saved["edit"], classification))
            if not classification["ok"]:
                notice += " " + failure_message(classification["failure_code"], repo.experimental_mode)
        notify(notice)
        st.rerun()

    if repo.experimental_mode and old:
        contest = next((c for c in snapshot["category_contests"]
                        if c["response_id"] == old["id"] and c["response_edit"] == old["edit"]), None)
        if old["category"] == UNCLASSIFIED:
            st.caption("Sua categoria ainda não foi definida. Aguarde a classificação/revisão.")
        elif old["category"] in TAXONOMY_CODES or old["category"] == NO_OBJECTION:
            st.caption("Categoria atribuída à sua manifestação: " + taxonomy_display(old["category"]))
            if contest:
                suggestion = taxonomy_display(contest["suggested_category"])
                if contest["status"] == "PENDENTE":
                    st.info("Contestação registrada. Você sugeriu " + suggestion +
                            ". O moderador definirá a categoria final.")
                else:
                    st.success("Contestação revisada. Sugestão do participante: " + suggestion +
                               " · Categoria final: " + taxonomy_display(contest["resolved_category"]))
            else:
                alternatives = [code for code in TAXONOMY_CODES if code != old["category"]]
                if alternatives:
                    with st.form(prefix + "_contest"):
                        suggested = st.selectbox(
                            "Categoria que considero mais adequada",
                            alternatives,
                            format_func=taxonomy_display,
                            key=prefix + "_suggested_category",
                        )
                        contest_submitted = st.form_submit_button("Contestar categoria")
                    if contest_submitted:
                        ok, _ = execute(lambda: repo.suggest_category(
                            code, token, proposal["id"], old["id"], suggested, old["edit"]
                        ))
                        if ok:
                            notify("Contestação registrada. A categoria só muda após revisão do moderador.")
                            st.rerun()


def pareto(snapshot):
    responses = current_responses(snapshot)
    counts = Counter(r["category"] for r in responses if r["category"] not in (NO_OBJECTION, UNCLASSIFIED))
    pending = sum(r["category"] == UNCLASSIFIED for r in responses)
    if pending:
        st.info(f"{pending} manifestação(ões) ainda sem categoria. Os textos completos continuam disponíveis abaixo.")
    if not counts:
        st.caption("Ainda não há objeções categorizadas para o gráfico.")
        return
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    ordered = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    labels, frequencies = zip(*ordered)
    display_labels = [taxonomy_display(label) for label in labels]
    accumulated, running, total = [], 0, sum(frequencies)
    for frequency in frequencies:
        running += frequency
        accumulated.append(100 * running / total)
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Bar(x=display_labels, y=frequencies, name="Frequência", marker_color="#2563eb"), secondary_y=False)
    fig.add_trace(go.Scatter(x=display_labels, y=accumulated, name="Acumulado (%)", mode="lines+markers",
                             line={"color": "#dc2626"}), secondary_y=True)
    fig.add_shape(type="line", x0=-0.5, x1=len(labels) - 0.5, y0=80, y1=80,
                  xref="x", yref="y2", line={"color": "#16a34a", "dash": "dash"})
    fig.update_yaxes(title_text="Manifestações", dtick=1, secondary_y=False)
    fig.update_yaxes(title_text="Acumulado (%)", range=[0, 105], secondary_y=True)
    fig.update_layout(title="Frequência das objeções na versão atual", hovermode="x unified")
    st.plotly_chart(fig, use_container_width=True, key="pareto_" + snapshot["room"]["id"])
    st.caption("A linha de 80% é uma referência descritiva. Frequência não mede gravidade nem garante solução de 80% dos conflitos. Uma categoria principal é contada por manifestação; todas as justificativas devem ser consideradas.")


def manifestations(repo, snapshot, code, token):
    for response in current_responses(snapshot):
        label = f"{response['pseudonym']} · {response['alias']} · {POSITIONS[response['position']]}"
        with st.expander(label, expanded=True):
            st.text(response["argument"] or "Sem justificativa adicional.")
            st.caption(f"Categoria: {response['category']} · Classificação: {response['classification_status']}")
            if response["category_manual"]:
                st.caption("Categoria revisada pelo moderador. Sugestão original da IA: " + (response["category_ai"] or "indisponível"))
            if response["classification_status"] == "FALLBACK_HUMANO":
                st.caption("Esta classificação foi realizada manualmente devido a falha técnica da IA. "
                           "Isso não transforma a condição A em condição B.")
            if snapshot["actor"]["role"] == "moderator" and snapshot["room"]["state"] == "COLETA":
                fallback = (repo.experimental_mode and snapshot["room"]["ai_enabled"]
                            and response["classification_status"] in CLASSIFICATION_FAILURE_CODES)
                if fallback:
                    st.warning(failure_message(response["classification_status"], True))
                    st.caption("Use CAT01–CAT09 como fallback técnico de classificação; a falha da IA será preservada no histórico.")
                contest = next((c for c in snapshot["category_contests"]
                                if c["response_id"] == response["id"] and c["response_edit"] == response["edit"]), None)
                if contest:
                    st.caption("Contestação do participante: " + taxonomy_display(contest["suggested_category"]) +
                               " · Status: " + contest["status"].lower())
                    if contest["status"] == "RESOLVIDA":
                        st.caption("Categoria final registrada: " + taxonomy_display(contest["resolved_category"]))
                with st.form("category_" + response["id"] + "_" + str(response["edit"])):
                    if repo.experimental_mode:
                        choices = list(TAXONOMY_CODES)
                        if response["position"] == "ACEITO" and not fallback:
                            choices = [NO_OBJECTION] + choices
                        if contest and contest["status"] == "PENDENTE":
                            default = contest["suggested_category"]
                        elif response["category"] in choices:
                            default = response["category"]
                        else:
                            default = TAXONOMY_CODES[0]
                        category = st.selectbox(
                            "Revisar categoria",
                            choices,
                            index=choices.index(default),
                            format_func=taxonomy_display,
                        )
                    else:
                        category = st.text_input("Revisar categoria", value=response["category"], max_chars=120)
                    button_label = ("Classificar como fallback técnico" if fallback else
                                    "Salvar categoria final" if contest and contest["status"] == "PENDENTE" else "Salvar categoria")
                    submitted = st.form_submit_button(button_label)
                if submitted:
                    ok, _ = execute(lambda: repo.set_category(code, token, response["proposal_id"], response["id"], category,
                                                             response["edit"], technical_fallback=fallback))
                    if ok:
                        notify("Categoria revisada. O texto, a posição e a trilha de contestação foram preservados.")
                        st.rerun()


def manual_mediation_form(repo, snapshot, code, token):
    """Contrapartida manual padronizada, sem chamar o serviço de IA."""
    room, proposal = snapshot["room"], current_proposal(snapshot)
    st.subheader("Mediação manual estruturada — condição B")
    st.info("Preserve explicitamente pedidos incompatíveis. Busque uma proposta viável que incorpore "
            "as condições registradas, sem favorecer participantes por preferência pessoal ou aplicar "
            "maioria/frequência automaticamente. Não invente argumentos, critérios ou prioridades. "
            "Registre a razão operacional do atendimento parcial ou não atendimento e respeite as restrições.")
    st.caption("Classifique as manifestações durante a coleta antes de preencher a mediação. "
               "Se um bloco não tiver pontos identificados, registre isso explicitamente, sem inventar conteúdo.")
    st.caption("As confirmações registram conferência manual; não há validação automática de orçamento ou otimização.")
    with st.form("manual_mediation_" + proposal["id"] + "_" + str(room["revision"])):
        details = {key: st.text_area(label, max_chars=2500) for key, label in MANUAL_MEDIATION_FIELDS}
        details["restriction_checks"] = {key: st.checkbox(label) for key, label in MANUAL_RESTRICTION_CHECKS}
        suggested = st.text_area("Proposta revisada sugerida", height=180, max_chars=12000)
        st.write("Cobertura por manifestação — não é pontuação de qualidade")
        coverage = []
        for response in current_responses(snapshot):
            st.caption(response["pseudonym"] + " · " + POSITIONS[response["position"]] +
                       " · " + taxonomy_display(response["category"]))
            no_objection = response["category"] == NO_OBJECTION
            choices = ["SEM_OBJECAO"] if no_objection else [s for s in COVERAGE_STATES if s != "SEM_OBJECAO"]
            treatment = st.selectbox("Cobertura de " + response["pseudonym"], choices,
                                     index=0 if no_objection else choices.index("NAO_CONTEMPLADA"),
                                     key="coverage_" + response["id"] + "_" + str(response["edit"]))
            note = "" if no_objection else st.text_area("Razão operacional — " + response["pseudonym"], max_chars=2000)
            coverage.append({"response_id": response["id"], "treatment": treatment, "note": note})
        details["coverage"] = coverage
        submitted = st.form_submit_button("Salvar mediação manual")
    if submitted:
        ok, _ = execute(lambda: repo.save_mediation(code, token, proposal["id"], room["revision"], {
            "origin": "HUMANA", "ok": True, "suggested_text": suggested, "details": details,
        }))
        if ok:
            notify("Mediação manual estruturada registrada para revisão e publicação.")
            st.rerun()


def mediator_panel(repo, ai, snapshot, code, token):
    if participant_visibility_blocked(snapshot, repo.experimental_mode):
        st.info("O processo de mediação desta rodada ficará disponível após sua manifestação nesta versão.")
        return
    room, proposal, state = snapshot["room"], current_proposal(snapshot), consensus(snapshot)
    is_moderator = snapshot["actor"]["role"] == "moderator"
    if is_moderator and not repo.postgres:
        st.warning("Esta sala usa armazenamento local. No Streamlit Community Cloud ele pode ser perdido. Configure DATABASE_URL para guardar os dados do experimento em PostgreSQL e baixe os históricos.")
    if room["state"] == "COLETA":
        st.write("A coleta está aberta. O moderador pode revisar categorias e pausar a coleta antes de analisar uma revisão.")
        if is_moderator and st.button("Pausar coleta e revisar", key="freeze_" + proposal["id"]):
            ok, _ = execute(lambda: repo.set_phase(code, token, proposal["id"], "REVISAO"))
            if ok:
                st.rerun()
        return
    if room["state"] == "ENCERRADA":
        st.write("Sala encerrada. Consulte as versões e exporte o histórico.")
        return
    if not is_moderator:
        st.info("A proposta está em revisão pelo moderador. As manifestações desta versão estão preservadas.")
        return
    st.write("As manifestações estão congeladas. Revise os argumentos antes de publicar outra versão.")
    protocol = mediation_attempt_state(snapshot) if repo.experimental_mode and room["ai_enabled"] else None
    if protocol and protocol["persistent_failure"]:
        st.error("Falha técnica persistente. Esta sessão experimental não pode continuar na condição A.")
        st.caption("Mediação humana não pode substituir a IA nesta condição. Os registros serão preservados.")
        if st.button("Cancelar sessão por falha técnica"):
            ok, _ = execute(lambda: repo.finish(code, token, proposal["id"], TECHNICAL_CANCEL_REASON, cancel=True))
            if ok:
                st.rerun()
        return
    if protocol and protocol["in_progress"]:
        st.warning("Há uma execução de mediação IA registrada como em andamento. Atualize para conferir o resultado. "
                   "Não repita chamadas com estado incerto; se não for recuperável, cancele a sessão.")
        return
    if state["missing"]:
        st.warning("Faltam respostas: " + ", ".join(state["missing"]) + ". Isso impede encerrar por acordo.")
    if st.button("Reabrir coleta desta versão", key="reopen_" + proposal["id"],
                 disabled=bool(protocol and protocol["retry"])):
        ok, _ = execute(lambda: repo.set_phase(code, token, proposal["id"], "COLETA"))
        if ok:
            st.rerun()
    if room["ai_enabled"]:
        if not ai.api_key:
            st.info(FAILURE_MESSAGES["SEM_CHAVE"])
        if protocol and protocol["retry"]:
            st.warning("A primeira execução falhou. O protocolo permite uma última execução controlada, "
                       "com a mesma configuração e as mesmas manifestações congeladas.")
        label = "Tentar mediação IA novamente" if protocol and protocol["retry"] else "Gerar sugestão com IA"
        disabled = (not bool(current_responses(snapshot)) or
                    (not ai.api_key and not repo.experimental_mode) or bool(protocol and not protocol["can_start"]))
        if st.button(label, disabled=disabled):
            attempt_id = None
            if repo.experimental_mode:
                ok, attempt_id = execute(lambda: repo.begin_ai_mediation(code, token, proposal["id"], room["revision"],
                                                                         ai.experimental_configuration()))
                if not ok:
                    return
            with st.spinner("A IA está analisando as manifestações desta versão..."):
                result = ai.mediate(snapshot)
                ok, _ = execute(lambda: repo.save_mediation(code, token, proposal["id"], room["revision"], result,
                                                          attempt_id=attempt_id))
            if ok:
                notify("Sugestão registrada para revisão humana." if result["ok"] else failure_message(result["failure_code"], repo.experimental_mode))
                st.rerun()
            else:
                return
    else:
        st.caption("Sala sem IA. Categorias e revisões são feitas pelo moderador.")
        if repo.experimental_mode:
            manual_mediation_form(repo, snapshot, code, token)
    valid = [m for m in snapshot["mediations"] if m["proposal_id"] == proposal["id"]
             and m["revision"] == room["revision"] and m["status"] == "OK"]
    if repo.experimental_mode:
        expected_origin = "IA" if room["ai_enabled"] else "HUMANA"
        valid = [m for m in valid if m["origin"] == expected_origin]
    options = ([] if repo.experimental_mode else [None]) + [m["id"] for m in reversed(valid)]
    by_id = {m["id"]: m for m in valid}
    base_key = "base_" + proposal["id"]
    if repo.experimental_mode and options and st.session_state.get(base_key) not in options:
        st.session_state[base_key] = options[0]
    selected = st.selectbox("Base para a revisão", options,
                            format_func=lambda key: "Redação humana" if key is None else
                            by_id[key]["origin"] + " · " + by_id[key]["created_at"],
                            disabled=not options, key=base_key)
    if repo.experimental_mode and not valid:
        st.info("Registre uma mediação válida desta condição antes de publicar uma nova versão.")
    mediation = by_id.get(selected)
    if mediation:
        st.subheader("Sugestão consultiva")
        st.text(mediation["summary"])
        coverage = json.loads(mediation["details_json"]).get("coverage", [])
        if coverage:
            st.dataframe(coverage, use_container_width=True, hide_index=True)
        st.caption("O registro de cobertura é uma análise da mediação; não comprova atendimento da objeção.")
    if proposal["round"] < 3:
        allocation, financial_ok = allocation_editor(snapshot)
        financial_scenario = session_scenario(snapshot) is not None
        revision_key = "revision_" + proposal["id"] + "_" + str(selected)
        # No cenário, widgets reativos preservam o rascunho ao recalcular os valores.
        revision_context = st.container() if financial_scenario else st.form(revision_key)
        with revision_context:
            revised = st.text_area("Texto revisado a ser apresentado ao grupo",
                                   value=mediation["suggested_text"] if mediation else proposal["text"],
                                   height=220, max_chars=12000,
                                   **({"key": revision_key + "_text"} if financial_scenario else {}))
            human_summary = st.text_area("Justificativa da revisão humana", max_chars=6000) if not mediation and not repo.experimental_mode else ""
            review_note, unchanged = "", False
            if repo.experimental_mode and mediation and mediation["origin"] == "IA":
                st.caption("Revise a sugestão sem substituí-la por uma mediação humana independente. "
                           "Vincule ajustes às manifestações/restrições, sem inserir preferência pessoal.")
                review_note = st.text_area("Nota de revisão humana da sugestão da IA", max_chars=2000,
                                           **({"key": revision_key + "_note"} if financial_scenario else {}))
                unchanged = st.checkbox("Confirmo a publicação sem alteração de conteúdo.",
                                        **({"key": revision_key + "_unchanged"} if financial_scenario else {}))
                if financial_scenario:
                    st.caption("Sem alteração refere-se ao texto da sugestão; os valores estruturados são confirmados separadamente.")
            financial_confirmed = st.checkbox("Conferi os cinco valores estruturados e sua coerência com o texto publicado.",
                                             key=revision_key + "_finance_" + str(tuple((allocation or {}).values()))) if financial_scenario else True
            confirm = st.checkbox("Revisei este texto e quero solicitar novas manifestações de todos.",
                                  **({"key": revision_key + "_confirm"} if financial_scenario else {}))
            submit_button = st.button if financial_scenario else st.form_submit_button
            submitted = submit_button("Publicar nova versão", type="primary",
                                      disabled=(repo.experimental_mode and not mediation) or not financial_ok,
                                      **({"key": revision_key + "_publish"} if financial_scenario else {}))
        if submitted:
            if not confirm:
                st.error("Confirme a revisão humana antes de publicar.")
            elif not financial_confirmed:
                st.error("Confirme os valores financeiros antes de publicar.")
            elif not mediation and not repo.experimental_mode and not human_summary.strip():
                st.error("Registre a justificativa da revisão humana para preservar o histórico.")
            else:
                def publish():
                    if revised.strip() == proposal["text"] and not financial_scenario:
                        raise DecisionError("A nova versão deve conter uma alteração na proposta.")
                    source = selected
                    if source is None:
                        if repo.experimental_mode:
                            raise DecisionError("Selecione a mediação registrada da condição experimental.")
                        source = repo.save_mediation(code, token, proposal["id"], room["revision"], {
                            "origin": "HUMANA", "ok": True, "summary": human_summary.strip(),
                            "suggested_text": revised.strip(),
                        })
                    note = review_note.strip()
                    if mediation and revised.strip() == mediation["suggested_text"] and unchanged and not note:
                        note = UNCHANGED_REVIEW_NOTE
                    return repo.publish_revision(code, token, proposal["id"], revised, source, review_note=note, allocation=allocation)
                ok, _ = execute(publish)
                if ok:
                    notify("Nova versão publicada. Todos precisam se manifestar novamente.")
                    st.rerun()
    else:
        st.info("Terceira rodada: reabra a coleta para completar respostas ou encerre com o resultado disponível.")
    if state["accepted"]:
        st.success("Todos aceitam esta versão. Ressalvas registradas serão mantidas no histórico.")
    can_finish = state["accepted"] or proposal["round"] == 3
    with st.form("finish_" + proposal["id"]):
        confirmed = st.checkbox("Conferi as manifestações e confirmo o encerramento desta sala.")
        submitted = st.form_submit_button("Encerrar com resultado do grupo", disabled=not can_finish)
    if submitted:
        if not confirmed:
            st.error("Confirme a conferência das manifestações.")
        else:
            ok, result = execute(lambda: repo.finish(code, token, proposal["id"]))
            if ok:
                notify("Sala encerrada: " + result.replace("_", " ").lower() + ".")
                st.rerun()


def history_panel(snapshot, experimental_mode=False):
    if participant_visibility_blocked(snapshot, experimental_mode):
        st.info("Histórico detalhado disponível após sua manifestação nesta versão.")
        return
    for proposal in reversed(snapshot["proposals"]):
        with st.expander(f"Rodada {proposal['round']} · {proposal['origin']}", expanded=proposal["id"] == snapshot["room"]["active_proposal_id"]):
            st.caption(proposal["created_at"] + " · horários em UTC")
            st.text(proposal["text"])
            financial_proposal_view(snapshot, proposal["id"])
            publication = next((event for event in snapshot["events"]
                                if event["action"] == "PROPOSTA_PUBLICADA" and event["proposal_id"] == proposal["id"]), None)
            if publication:
                review = json.loads(publication["payload_json"])
                if review.get("review_note"):
                    st.caption("Revisão humana: " + review["review_note"])
                if review.get("source_mediation_id"):
                    st.caption("Mediação de origem: " + review["source_mediation_id"] +
                               " · Texto alterado: " + ("sim" if review.get("changed_from_source") else "não"))
            rows = [{"Participante": r["pseudonym"], "Posição": POSITIONS[r["position"]],
                     "Justificativa": r["argument"], "Categoria": r["category"]}
                    for r in snapshot["responses"] if r["proposal_id"] == proposal["id"]]
            if rows:
                st.dataframe(rows, use_container_width=True, hide_index=True)
    if snapshot["mediations"]:
        st.subheader("Histórico das sugestões")
        for mediation in reversed(snapshot["mediations"]):
            with st.expander(mediation["origin"] + " · " + mediation["status"] + " · " + mediation["created_at"]):
                if mediation["status"] == "FALHA":
                    st.write(failure_message(mediation["failure_code"], experimental_mode))
                elif mediation["status"] == "EM_EXECUCAO":
                    st.write("Execução registrada como em andamento; resultado ainda não confirmado.")
                else:
                    st.text(mediation["summary"])
                    st.text(mediation["suggested_text"])
                st.caption("Modelo: " + (mediation["model"] or "não se aplica") + " · Prompt: " + (mediation["prompt_version"] or "não se aplica"))


def export_panel(snapshot):
    if snapshot["actor"]["role"] != "moderator":
        st.info("O moderador pode exportar os registros para a avaliação do projeto.")
        return
    code = snapshot["room"]["code"]
    dataset = research_export(snapshot)
    experimental = dataset["experiment"]["experimental_mode"]
    if experimental:
        st.caption("Versão experimental: " + (dataset["experiment"]["experiment_release"] or "não registrada nesta sessão"))
        st.caption("Build: " + (dataset["experiment"]["app_commit"] or "não informado"))
        if dataset["exporter"]["app_commit"] != dataset["experiment"]["app_commit"]:
            st.caption("Build do exportador: " + (dataset["exporter"]["app_commit"] or "não informado"))
        st.caption("APP_COMMIT é declarado na configuração da implantação; não comprova por si só qual código foi implantado.")
    stamp = dataset["exported_at"].replace("-", "").replace(":", "").replace(".", "").replace("+0000", "Z")
    json_name = f"experimento_{code}_{stamp}.json" if experimental else f"historico_{code}.json"
    csv_name = f"manifestacoes_{code}_{stamp}.csv" if experimental else f"manifestacoes_{code}.csv"
    st.write("JSON inclui manifesto, versões, manifestações vigentes por versão, metadados de edição e eventos. CSV é uma visão simplificada das manifestações.")
    st.caption("Os arquivos usam P01, P02 etc. e excluem credenciais e nomes de cadastro. Justificativas podem conter dados pessoais inseridos pelos próprios participantes; revise antes de compartilhar.")
    st.download_button("Baixar histórico completo (JSON)",
                       json.dumps(dataset, ensure_ascii=False, indent=2),
                       file_name=json_name, mime="application/json", key="json_" + code)
    st.download_button("Baixar manifestações (CSV)", csv_export(snapshot),
                       file_name=csv_name, mime="text/csv", key="csv_" + code)


def room_settings(repo, snapshot, code, token):
    if snapshot["actor"]["role"] != "moderator" or snapshot["room"]["state"] == "ENCERRADA":
        return
    with st.expander("Acessos e interrupção da sessão"):
        people = {p["id"]: p for p in snapshot["participants"]}
        person_id = st.selectbox("Participante que precisa de novo acesso", list(people),
                                 format_func=lambda key: people[key]["alias"] + " · " + people[key]["pseudonym"])
        if st.button("Gerar nova credencial individual"):
            ok, replacement = execute(lambda: repo.reset_invitation(code, token, person_id))
            if ok:
                st.session_state["replacement"] = {"code": code, "person": people[person_id]["alias"], "token": replacement}
        replacement = st.session_state.get("replacement")
        if replacement and replacement["code"] == code:
            st.write("Novo acesso para", replacement["person"])
            st.code(replacement["token"], language=None)
            st.caption("A credencial anterior foi invalidada; manifestações e versões foram preservadas.")
        with st.form("cancel_" + code):
            reason = st.text_area("Motivo de interrupção antecipada", max_chars=2000)
            confirmed = st.checkbox("Quero encerrar como cancelada, preservando o histórico.")
            submitted = st.form_submit_button("Cancelar sessão")
        if submitted:
            if not confirmed:
                st.error("Confirme o cancelamento.")
            else:
                ok, _ = execute(lambda: repo.finish(code, token, snapshot["room"]["active_proposal_id"], reason, cancel=True))
                if ok:
                    st.rerun()


@st.fragment(run_every="5s")
def live_consensus(repo, code, token, expected_proposal, expected_phase):
    """Atualiza dados de leitura sem reconstruir os formulários em edição."""
    ok, snapshot = execute(lambda: repo.snapshot(code, token))
    if not ok:
        return
    room = snapshot["room"]
    proposal = current_proposal(snapshot)
    if proposal["id"] != expected_proposal or room["state"] != expected_phase:
        st.rerun(scope="app")
    if participant_visibility_blocked(snapshot, repo.experimental_mode):
        st.metric("Rodada", f"{proposal['round']} / 3")
        st.info("Registre sua manifestação antes de visualizar informações agregadas desta rodada.")
        return
    state = consensus(snapshot)
    a, b, c = st.columns(3)
    a.metric("Rodada", f"{proposal['round']} / 3")
    b.metric("Manifestações", f"{state['responded']} / {state['expected']}")
    c.metric("Não aceites", len(state["rejects"]))
    if room["state"] == "ENCERRADA":
        st.info("Resultado: " + room["result"].replace("_", " ").lower())
        if room["close_reason"]:
            st.text(room["close_reason"])
    elif state["accepted"]:
        st.success("Todos os participantes aceitam esta versão. O moderador pode conferir e encerrar.")
    elif state["missing"]:
        st.caption("Aguardando: " + ", ".join(state["missing"]))


def room_view(repo, ai, code, token):
    ok, snapshot = execute(lambda: repo.snapshot(code, token))
    if not ok:
        return
    room, actor = snapshot["room"], snapshot["actor"]
    if repo.experimental_mode and room["ai_enabled"]:
        ok, _ = execute(lambda: repo.ensure_ai_configuration(code, token, ai.experimental_configuration()))
        if not ok:
            # Leitura e cancelamento continuam possíveis; não prossiga com outra configuração.
            export_panel(snapshot)
            room_settings(repo, snapshot, code, token)
            return
        # Inclui no pacote a configuração que pode ter sido fixada neste primeiro acesso.
        ok, snapshot = execute(lambda: repo.snapshot(code, token))
        if not ok:
            return
        room, actor = snapshot["room"], snapshot["actor"]
    proposal = current_proposal(snapshot)
    notice = st.session_state.pop("notice", None)
    if notice:
        st.info(notice)
    st.subheader(room["theme"])
    st.caption(f"Sala {code} · {actor.get('alias', 'Moderador')} · {room['state'].lower()} · {'com IA' if room['ai_enabled'] else 'sem IA'}")
    if room["context"]:
        with st.expander("Contexto e restrições"):
            st.text(room["context"])
    live_consensus(repo, code, token, proposal["id"], room["state"])
    if st.button("Atualizar painel", key="refresh_" + room["id"],
                 help="Carrega os detalhes mais recentes. Envie ou salve os textos em edição antes de atualizar."):
        st.rerun()
    st.subheader("Proposta atual")
    st.text(proposal["text"])
    financial_proposal_view(snapshot)
    if repo.experimental_mode and session_scenario(snapshot) is None:
        st.caption("Cenário financeiro não habilitado nesta sessão; propostas em texto livre não são validadas financeiramente de forma automática.")
    if room["state"] != "ENCERRADA":
        response_form(repo, ai, snapshot, code, token)
    overview, mediation, history, exports = st.tabs(["Objeções e posições", "Mediação e encerramento", "Versões e histórico", "Exportação"])
    with overview:
        if participant_visibility_blocked(snapshot, repo.experimental_mode):
            st.info("As manifestações dos demais ficam ocultas até você registrar sua posição nesta versão.")
        else:
            pareto(snapshot)
            manifestations(repo, snapshot, code, token)
    with mediation:
        mediator_panel(repo, ai, snapshot, code, token)
    with history:
        history_panel(snapshot, repo.experimental_mode)
    with exports:
        export_panel(snapshot)
    room_settings(repo, snapshot, code, token)
    st.caption("Os indicadores atualizam a cada 5 segundos. Use Atualizar painel para carregar os detalhes mais recentes. Uma mudança de versão ou de etapa é carregada automaticamente.")


def main():
    st.set_page_config(page_title="Decisão Coletiva com IA", page_icon="🏛️", layout="wide")
    st.title("🏛️ Decisão Coletiva com IA")
    sqlite_path = setting("SQLITE_PATH", str(Path(__file__).resolve().parent / "data" / "decisoes.sqlite3"))
    experimental_mode = setting("EXPERIMENT_MODE", "").strip().lower() in ("1", "true", "yes", "on")
    database_url = setting("DATABASE_URL")
    if experimental_mode and not database_url:
        st.error("O armazenamento não está disponível: DATABASE_URL não foi encontrada nos Secrets/ambiente.")
        return
    if database_url and not database_url.strip().startswith(("postgres://", "postgresql://")):
        st.error("O armazenamento não está disponível: DATABASE_URL não está no formato PostgreSQL esperado.")
        return
    try:
        repo = repository(database_url, sqlite_path, experimental_mode, setting("APP_COMMIT"))
    except Exception as error:
        error_type = type(error).__name__
        sqlstate = getattr(error, "sqlstate", None)
        st.error("O armazenamento não está disponível. A conexão PostgreSQL falhou.")
        st.caption(f"Diagnóstico seguro: {error_type}" + (f" | SQLSTATE {sqlstate}" if sqlstate else ""))
        return
    models = [setting("GEMINI_MODEL", DEFAULT_MODEL)]
    if not experimental_mode:
        models += [m.strip() for m in setting("GEMINI_FALLBACK_MODELS").split(",") if m.strip()]
    ai = AIService(setting("GEMINI_API_KEY"), models=models, experimental_mode=experimental_mode)
    auth = st.session_state.get("auth")
    if not auth:
        login_screen(repo)
        return
    if st.button("Sair da sala"):
        for key in list(st.session_state):
            del st.session_state[key]
        st.query_params.clear()
        st.rerun()
    invitation_panel()
    room_view(repo, ai, auth["code"], auth["token"])


if __name__ == "__main__":
    main()
