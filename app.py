"""Interface web do sistema de decisão coletiva."""
from __future__ import annotations

import json
import os
from collections import Counter
from pathlib import Path

import streamlit as st

from ai_service import AIService, DEFAULT_MODEL, FAILURE_MESSAGES
from decision import (
    DecisionError, NO_OBJECTION, POSITIONS, Repository, UNCLASSIFIED,
    consensus, csv_export, current_proposal, current_responses, research_export,
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
def repository(database_url, sqlite_path):
    # Compartilha apenas a configuração. Conexões são abertas por transação.
    return Repository(database_url=database_url, sqlite_path=sqlite_path)


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
        st.caption("O tema é livre. Descreva uma proposta concreta e as restrições conhecidas antes de convidar o grupo.")
        with st.form("create"):
            theme = st.text_input("Tema da decisão", max_chars=300)
            context = st.text_area("Contexto e restrições conhecidas", max_chars=6000)
            proposal = st.text_area("Texto da proposta inicial", height=180, max_chars=12000)
            roster = st.text_area("Participantes: um nome ou apelido por linha", help="Lista fixa da sala. Para seu experimento, cadastre as 3 a 5 pessoas disponíveis.")
            enabled = st.checkbox("Usar IA para sugerir categorias e revisões", value=True)
            st.caption("As manifestações ficam visíveis aos membros da sala. Com IA ativa, tema, proposta e justificativas serão enviados ao Gemini com identificadores P01, P02 etc. Evite dados pessoais no texto.")
            submitted = st.form_submit_button("Criar sala e gerar acessos", type="primary")
        if submitted:
            aliases = [line.strip() for line in roster.splitlines() if line.strip()]
            ok, invitation = execute(lambda: repo.create_room(theme, context, proposal, aliases, enabled))
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
                notice += " " + FAILURE_MESSAGES.get(classification["failure_code"], FAILURE_MESSAGES["FALHA_IA"])
        notify(notice)
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
    accumulated, running, total = [], 0, sum(frequencies)
    for frequency in frequencies:
        running += frequency
        accumulated.append(100 * running / total)
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Bar(x=labels, y=frequencies, name="Frequência", marker_color="#2563eb"), secondary_y=False)
    fig.add_trace(go.Scatter(x=labels, y=accumulated, name="Acumulado (%)", mode="lines+markers",
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
            if snapshot["actor"]["role"] == "moderator" and snapshot["room"]["state"] == "COLETA":
                with st.form("category_" + response["id"] + "_" + str(response["edit"])):
                    category = st.text_input("Revisar categoria", value=response["category"], max_chars=120)
                    submitted = st.form_submit_button("Salvar categoria")
                if submitted:
                    ok, _ = execute(lambda: repo.set_category(code, token, response["proposal_id"], response["id"], category, response["edit"]))
                    if ok:
                        notify("Categoria revisada. O texto e a posição do participante foram preservados.")
                        st.rerun()


def mediator_panel(repo, ai, snapshot, code, token):
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
    if state["missing"]:
        st.warning("Faltam respostas: " + ", ".join(state["missing"]) + ". Isso impede encerrar por acordo.")
    if st.button("Reabrir coleta desta versão", key="reopen_" + proposal["id"]):
        ok, _ = execute(lambda: repo.set_phase(code, token, proposal["id"], "COLETA"))
        if ok:
            st.rerun()
    if room["ai_enabled"]:
        if not ai.api_key:
            st.info(FAILURE_MESSAGES["SEM_CHAVE"])
        if st.button("Gerar sugestão com IA", disabled=not bool(current_responses(snapshot)) or not ai.api_key):
            with st.spinner("A IA está analisando as manifestações desta versão..."):
                result = ai.mediate(snapshot)
                ok, _ = execute(lambda: repo.save_mediation(code, token, proposal["id"], room["revision"], result))
            if ok:
                notify("Sugestão registrada para revisão humana." if result["ok"] else FAILURE_MESSAGES.get(result["failure_code"], FAILURE_MESSAGES["FALHA_IA"]))
                st.rerun()
    else:
        st.caption("Sala sem IA. Categorias e revisões são feitas pelo moderador.")
    valid = [m for m in snapshot["mediations"] if m["proposal_id"] == proposal["id"]
             and m["revision"] == room["revision"] and m["status"] == "OK"]
    options = [None] + [m["id"] for m in reversed(valid)]
    by_id = {m["id"]: m for m in valid}
    selected = st.selectbox("Base para a revisão", options,
                            format_func=lambda key: "Redação humana" if key is None else
                            by_id[key]["origin"] + " · " + by_id[key]["created_at"], key="base_" + proposal["id"])
    mediation = by_id.get(selected)
    if mediation:
        st.subheader("Sugestão consultiva")
        st.text(mediation["summary"])
        coverage = json.loads(mediation["details_json"]).get("coverage", [])
        if coverage:
            st.dataframe(coverage, use_container_width=True, hide_index=True)
        st.caption("O registro de cobertura é uma análise da IA e precisa de revisão humana; não comprova atendimento da objeção.")
    if proposal["round"] < 3:
        with st.form("revision_" + proposal["id"] + "_" + str(selected)):
            revised = st.text_area("Texto revisado a ser apresentado ao grupo",
                                   value=mediation["suggested_text"] if mediation else proposal["text"],
                                   height=220, max_chars=12000)
            human_summary = st.text_area("Justificativa da revisão humana", max_chars=6000) if not mediation else ""
            confirm = st.checkbox("Revisei este texto e quero solicitar novas manifestações de todos.")
            submitted = st.form_submit_button("Publicar nova versão", type="primary")
        if submitted:
            if not confirm:
                st.error("Confirme a revisão humana antes de publicar.")
            elif not mediation and not human_summary.strip():
                st.error("Registre a justificativa da revisão humana para preservar o histórico.")
            else:
                def publish():
                    if revised.strip() == proposal["text"]:
                        raise DecisionError("A nova versão deve conter uma alteração na proposta.")
                    source = selected
                    if source is None:
                        source = repo.save_mediation(code, token, proposal["id"], room["revision"], {
                            "origin": "HUMANA", "ok": True, "summary": human_summary.strip(),
                            "suggested_text": revised.strip(),
                        })
                    return repo.publish_revision(code, token, proposal["id"], revised, source)
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


def history_panel(snapshot):
    for proposal in reversed(snapshot["proposals"]):
        with st.expander(f"Rodada {proposal['round']} · {proposal['origin']}", expanded=proposal["id"] == snapshot["room"]["active_proposal_id"]):
            st.caption(proposal["created_at"] + " · horários em UTC")
            st.text(proposal["text"])
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
                    st.write(FAILURE_MESSAGES.get(mediation["failure_code"], FAILURE_MESSAGES["FALHA_IA"]))
                else:
                    st.text(mediation["summary"])
                    st.text(mediation["suggested_text"])
                st.caption("Modelo: " + (mediation["model"] or "não se aplica") + " · Prompt: " + (mediation["prompt_version"] or "não se aplica"))


def export_panel(snapshot):
    if snapshot["actor"]["role"] != "moderator":
        st.info("O moderador pode exportar os registros para a avaliação do projeto.")
        return
    code = snapshot["room"]["code"]
    st.write("JSON inclui versões, manifestações atuais, edições anteriores e eventos. CSV reúne a manifestação final de cada participante em cada versão.")
    st.caption("Os arquivos usam P01, P02 etc. e excluem credenciais e nomes de cadastro. Justificativas podem conter dados pessoais inseridos pelos próprios participantes; revise antes de compartilhar.")
    st.download_button("Baixar histórico completo (JSON)",
                       json.dumps(research_export(snapshot), ensure_ascii=False, indent=2),
                       file_name=f"historico_{code}.json", mime="application/json", key="json_" + code)
    st.download_button("Baixar manifestações (CSV)", csv_export(snapshot),
                       file_name=f"manifestacoes_{code}.csv", mime="text/csv", key="csv_" + code)


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
def room_view(repo, ai, code, token):
    ok, snapshot = execute(lambda: repo.snapshot(code, token))
    if not ok:
        return
    room, actor = snapshot["room"], snapshot["actor"]
    proposal, state = current_proposal(snapshot), consensus(snapshot)
    notice = st.session_state.pop("notice", None)
    if notice:
        st.info(notice)
    st.subheader(room["theme"])
    st.caption(f"Sala {code} · {actor.get('alias', 'Moderador')} · {room['state'].lower()} · {'com IA' if room['ai_enabled'] else 'sem IA'}")
    if room["context"]:
        with st.expander("Contexto e restrições"):
            st.text(room["context"])
    a, b, c = st.columns(3)
    a.metric("Rodada", f"{proposal['round']} / 3")
    b.metric("Manifestações", f"{state['responded']} / {state['expected']}")
    c.metric("Não aceites", len(state["rejects"]))
    st.subheader("Proposta atual")
    st.text(proposal["text"])
    if room["state"] == "ENCERRADA":
        st.info("Resultado: " + room["result"].replace("_", " ").lower())
        if room["close_reason"]:
            st.text(room["close_reason"])
    elif state["accepted"]:
        st.success("Todos os participantes aceitam esta versão. O moderador pode conferir e encerrar.")
    elif state["missing"]:
        st.caption("Aguardando: " + ", ".join(state["missing"]))
    if room["state"] != "ENCERRADA":
        response_form(repo, ai, snapshot, code, token)
    overview, mediation, history, exports = st.tabs(["Objeções e posições", "Mediação e encerramento", "Versões e histórico", "Exportação"])
    with overview:
        pareto(snapshot)
        manifestations(repo, snapshot, code, token)
    with mediation:
        mediator_panel(repo, ai, snapshot, code, token)
    with history:
        history_panel(snapshot)
    with exports:
        export_panel(snapshot)
    room_settings(repo, snapshot, code, token)
    st.caption("O painel atualiza a cada 5 segundos enquanto a página está aberta. Alterações de proposta exigem novas manifestações.")


def main():
    st.set_page_config(page_title="Decisão Coletiva com IA", page_icon="🏛️", layout="wide")
    st.title("🏛️ Decisão Coletiva com IA")
    sqlite_path = setting("SQLITE_PATH", str(Path(__file__).resolve().parent / "data" / "decisoes.sqlite3"))
    try:
        repo = repository(setting("DATABASE_URL"), sqlite_path)
    except Exception:
        st.error("O armazenamento não está disponível. Confira DATABASE_URL e as dependências nas configurações da implantação.")
        return
    models = [setting("GEMINI_MODEL", DEFAULT_MODEL)] + [m.strip() for m in setting("GEMINI_FALLBACK_MODELS").split(",") if m.strip()]
    ai = AIService(setting("GEMINI_API_KEY"), models=models)
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
