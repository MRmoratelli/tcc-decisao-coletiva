"""Piloto técnico no aplicativo publicado; pessoas e argumentos são fictícios.

Não grava screenshots, vídeos, traces nem credenciais em artefatos públicos.
Cria somente uma sala nova por execução, identificada como teste automatizado.
"""
import collections
import importlib.metadata
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


APP_URL = "https://tcc-decisao-coletiva-eoiv3pcb5csadiolmfiios.streamlit.app/"
SOURCE_COMMIT = "034c600b20d8b90e48cbfc9d56950162aed0c717"
MASKS = []
REPORT = {
    "kind": "PILOTO_TECNICO_AUTOMATIZADO_NAO_EXPERIMENTO",
    "app_url": APP_URL,
    "source_reference_commit": SOURCE_COMMIT,
    "started_at": datetime.now(timezone.utc).isoformat(),
    "simulated_participants": 3,
    "checks": [],
    "real_group_evaluation": "NAO_REALIZADA",
    "persistence_after_server_restart": "NAO_TESTADA",
    "phase": "INICIALIZACAO",
}


def step(name):
    REPORT["phase"] = name
    print("ETAPA: " + name, flush=True)


def passed(name):
    REPORT["checks"].append(name)
    print("APROVADO: " + name, flush=True)


def safe(text):
    for value in MASKS:
        text = text.replace(value, "[ACESSO_OCULTADO]")
    return re.sub(r"[A-Za-z0-9_-]{32,}", "[IDENTIFICADOR_OCULTADO]", text)


def ui_for(page):
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        for frame in page.frames:
            if urlparse(frame.url).hostname != urlparse(APP_URL).hostname:
                continue
            try:
                if frame.get_by_role("tab", name="Criar sala", exact=True).is_visible():
                    return frame
            except Exception:
                pass
        page.wait_for_timeout(1000)
    markers = []
    for frame in page.frames:
        try:
            body = frame.locator("body").inner_text(timeout=2000).lower()
            for marker in ("this app is private", "you do not have access", "is sleeping",
                           "your app is in the oven", "modulenotfounderror", "tomldecodeerror",
                           "syntaxerror", "streamlitsecretnotfounderror"):
                if marker in body:
                    markers.append(marker)
        except Exception:
            pass
    REPORT["startup_markers"] = sorted(set(markers))
    REPORT["document_title"] = safe(page.title())[:150]
    raise RuntimeError("A tela Entrar/Criar sala não apareceu em 120 segundos.")


def new_page(browser):
    context = browser.new_context(accept_downloads=True, locale="pt-BR",
                                  viewport={"width": 1440, "height": 1100})
    page = context.new_page()
    page.set_default_timeout(25000)
    response = page.goto(APP_URL, wait_until="domcontentloaded", timeout=60000)
    if "document_status" not in REPORT:
        REPORT["document_status"] = response.status if response else None
    return page, ui_for(page)


def download_json(page, ui, button):
    with page.expect_download(timeout=25000) as event:
        ui.get_by_role("button", name=button, exact=True).click()
    download = event.value
    path = Path(download.path())
    result = json.loads(path.read_text(encoding="utf-8-sig"))
    path.unlink(missing_ok=True)
    return result


def metric(ui, label, expected):
    item = ui.get_by_test_id("stMetric").filter(has_text=label)
    expect(item.get_by_test_id("stMetricValue")).to_have_text(expected, timeout=25000)


def tab(ui, name):
    ui.get_by_role("tab", name=name, exact=True).click()


def vote(ui, position, argument):
    ui.get_by_role("radio", name=position, exact=True).check()
    ui.get_by_label("Justificativa e ressalvas", exact=True).fill(argument)
    ui.get_by_role("button", name="Salvar manifestação", exact=True).click()
    expect(ui.get_by_test_id("stAlert").filter(has_text="Manifestação salva.").last).to_be_visible(timeout=170000)


def export(page, ui):
    tab(ui, "Exportação")
    return download_json(page, ui, "Baixar histórico completo (JSON)")


def cancel_own_test(ui, access):
    # Só opera a sala criada por esta execução, usando sua credencial de moderador.
    if not access:
        return
    try:
        expect(ui.get_by_text(re.compile(r"Sala " + re.escape(access["code"]) + r" ·"))).to_be_visible(timeout=5000)
        label = ui.get_by_text("Acessos e interrupção da sessão", exact=True)
        if not label.is_visible():
            return
        label.click()
        ui.get_by_label("Motivo de interrupção antecipada", exact=True).fill(
            "Interrupção do piloto técnico automatizado; dados fictícios, não usar no experimento.")
        ui.get_by_label("Quero encerrar como cancelada, preservando o histórico.", exact=True).check()
        ui.get_by_role("button", name="Cancelar sessão", exact=True).click()
        expect(ui.get_by_text("Resultado: cancelada", exact=True)).to_be_visible(timeout=10000)
        REPORT["interrupted_test_room"] = "CANCELADA"
    except Exception:
        REPORT["interrupted_test_room"] = "LIMPEZA_NAO_CONFIRMADA"


def run():
    REPORT["playwright_version"] = importlib.metadata.version("playwright")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        REPORT["browser_version"] = browser.version
        moderator = None
        mod_ui = None
        access = None
        try:
            moderator, mod_ui = new_page(browser)
            passed("Interface pública abriu em Chromium sem login do proprietário")
            step("CRIAR_SALA_FICTICIA")
            tab(mod_ui, "Criar sala")
            run_id = os.getenv("GITHUB_RUN_ID", "local")
            mod_ui.get_by_label("Tema da decisão", exact=True).fill("Piloto técnico automatizado — CI " + run_id)
            mod_ui.get_by_label("Contexto e restrições conhecidas", exact=True).fill(
                "Sala com personagens fictícios para testar a implantação. Não é uma coleta do TCC. "
                "Precisamos de uma única reunião de 30 minutos em um horário aceito por todos.")
            mod_ui.get_by_label("Texto da proposta inicial", exact=True).fill(
                "Faremos uma reunião de teste às 19h, com duração de 30 minutos.")
            mod_ui.get_by_label("Participantes: um nome ou apelido por linha", exact=True).fill(
                "Piloto 01\nPiloto 02\nPiloto 03")
            mod_ui.get_by_label("Usar IA para sugerir categorias e revisões", exact=True).check()
            mod_ui.get_by_role("button", name="Criar sala e gerar acessos", exact=True).click()
            expect(mod_ui.get_by_role("button", name="Baixar acessos (arquivo confidencial)", exact=True)).to_be_visible(timeout=25000)
            access = download_json(moderator, mod_ui, "Baixar acessos (arquivo confidencial)")
            MASKS.extend([access["moderator_token"]] + [p["token"] for p in access["invitations"]])
            for value in MASKS:
                print("::add-mask::" + value, flush=True)
            mod_ui.get_by_role("button", name="Já salvei: ocultar credenciais", exact=True).click()
            passed("Sala com tema livre e três acessos individuais foi criada")

            step("ENTRAR_COM_TRES_CONTEXTOS_ISOLADOS")
            people = []
            for person in access["invitations"]:
                page, ui = new_page(browser)
                ui.get_by_label("Código da sala", exact=True).fill(access["code"])
                ui.get_by_label("Credencial individual", exact=True).fill(person["token"])
                ui.get_by_role("button", name="Entrar", exact=True).click()
                expect(ui.get_by_role("radio", name="Aceito", exact=True)).to_be_visible(timeout=25000)
                people.append((page, ui))
            passed("Três sessões independentes acessaram a mesma sala")

            step("AUSENCIA_E_RECUSA")
            vote(people[0][1], "Aceito", "Concordo com a proposta de teste às 19h.")
            vote(people[1][1], "Não aceito", "Só consigo participar às 20h. Mudar o horário é necessário para eu aceitar.")
            metric(mod_ui, "Manifestações", "2 / 3")
            tab(mod_ui, "Mediação e encerramento")
            mod_ui.get_by_role("button", name="Pausar coleta e revisar", exact=True).click()
            expect(mod_ui.get_by_role("button", name="Encerrar com resultado do grupo", exact=True)).to_be_disabled()
            expect(mod_ui.get_by_text(re.compile("Faltam respostas:"))).to_be_visible()
            passed("Ausência impede encerramento por acordo")
            mod_ui.get_by_role("button", name="Reabrir coleta desta versão", exact=True).click()
            vote(people[2][1], "Aceito com ressalvas", "Aceito o horário, mas gostaria que a reunião respeitasse o limite de 30 minutos.")
            metric(mod_ui, "Manifestações", "3 / 3")
            metric(mod_ui, "Não aceites", "1")
            tab(mod_ui, "Mediação e encerramento")
            mod_ui.get_by_role("button", name="Pausar coleta e revisar", exact=True).click()
            expect(mod_ui.get_by_role("button", name="Encerrar com resultado do grupo", exact=True)).to_be_disabled()
            passed("Uma recusa impede acordo mesmo com todas as respostas")

            step("INTEGRACAO_REAL_GEMINI")
            initial = export(moderator, mod_ui)
            REPORT["classification_statuses_round1"] = dict(collections.Counter(r["classification_status"] for r in initial["responses"]))
            REPORT["classification_models"] = sorted({r["classification_model"] for r in initial["responses"] if r.get("classification_model")})
            tab(mod_ui, "Mediação e encerramento")
            generate = mod_ui.get_by_role("button", name="Gerar sugestão com IA", exact=True)
            if generate.is_enabled():
                generate.click()
                pattern = re.compile("Sugestão registrada para revisão humana|A API |O modelo configurado|A resposta da IA|A chamada à IA")
                expect(mod_ui.get_by_test_id("stAlert").filter(has_text=pattern).last).to_be_visible(timeout=170000)
                after_ai = export(moderator, mod_ui)
                ai_records = [m for m in after_ai["mediations"] if m["origin"] == "IA"]
                REPORT["mediation_attempts"] = [{"status": m["status"], "model": m.get("model"), "failure_code": m.get("failure_code")} for m in ai_records]
                REPORT["gemini_mediation"] = "OK" if any(m["status"] == "OK" for m in ai_records) else "FALHA_REGISTRADA"
            else:
                REPORT["gemini_mediation"] = "SEM_CHAVE_OU_INDISPONIVEL_NA_INTERFACE"
            tab(mod_ui, "Mediação e encerramento")
            if REPORT["gemini_mediation"] == "OK":
                mod_ui.get_by_label("Base para a revisão", exact=True).click()
                mod_ui.get_by_role("option", name=re.compile("^IA ·")).first.click()
                expect(mod_ui.get_by_text("Sugestão consultiva", exact=True)).to_be_visible()
                passed("Gemini produziu sugestão real disponível para revisão humana")

            step("REVISAO_HUMANA_E_NOVA_VOTACAO")
            mod_ui.get_by_label("Texto revisado a ser apresentado ao grupo", exact=True).fill(
                "Faremos uma reunião de teste às 20h, com duração máxima de 30 minutos.")
            reason = mod_ui.get_by_label("Justificativa da revisão humana", exact=True)
            if reason.is_visible():
                reason.fill("No piloto fictício, ajustamos o horário e registramos o limite de duração.")
            mod_ui.get_by_label("Revisei este texto e quero solicitar novas manifestações de todos.", exact=True).check()
            mod_ui.get_by_role("button", name="Publicar nova versão", exact=True).click()
            metric(mod_ui, "Rodada", "2 / 3")
            metric(mod_ui, "Manifestações", "0 / 3")
            passed("Nova versão começou sem aproveitar os aceites anteriores")
            for page, ui in people:
                metric(ui, "Rodada", "2 / 3")
            vote(people[0][1], "Aceito", "")
            vote(people[1][1], "Aceito", "")
            vote(people[2][1], "Aceito com ressalvas", "Aceito esta versão. Gostaria de acompanhar se a duração é respeitada.")
            metric(mod_ui, "Manifestações", "3 / 3")
            metric(mod_ui, "Não aceites", "0")
            tab(mod_ui, "Mediação e encerramento")
            mod_ui.get_by_role("button", name="Pausar coleta e revisar", exact=True).click()
            mod_ui.get_by_label("Conferi as manifestações e confirmo o encerramento desta sala.", exact=True).check()
            mod_ui.get_by_role("button", name="Encerrar com resultado do grupo", exact=True).click()
            expect(mod_ui.get_by_text("Resultado: acordo", exact=True)).to_be_visible(timeout=25000)
            passed("Aceites e ressalva permitiram acordo após conferência do moderador")

            step("HISTORICO_E_EXPORTACAO")
            history = export(moderator, mod_ui)
            assert history["room"]["result"] == "ACORDO"
            assert len(history["proposals"]) == 2
            assert len(history["responses"]) == 6
            assert len(history["participants"]) == 3
            encoded = json.dumps(history, ensure_ascii=False)
            assert all(value not in encoded for value in MASKS)
            assert all("alias" not in person and "token_hash" not in person for person in history["participants"])
            REPORT["result"] = history["room"]["result"]
            REPORT["rounds"] = len(history["proposals"])
            REPORT["responses"] = len(history["responses"])
            REPORT["classification_statuses_final"] = dict(collections.Counter(r["classification_status"] for r in history["responses"]))
            REPORT["revision_origin"] = history["proposals"][-1]["origin"]
            passed("JSON preservou duas versões e seis manifestações sem credenciais")
            with moderator.expect_download(timeout=25000) as event:
                mod_ui.get_by_role("button", name="Baixar manifestações (CSV)", exact=True).click()
            csv_path = Path(event.value.path())
            csv_text = csv_path.read_text(encoding="utf-8-sig")
            csv_path.unlink(missing_ok=True)
            assert all(value not in csv_text for value in MASKS)
            assert len(csv_text.splitlines()) == 7
            passed("CSV foi baixado e contém as seis manifestações do piloto")
            REPORT["functional_flow"] = "APROVADO"
            REPORT["phase"] = "CONCLUIDO"
        except Exception as error:
            REPORT["functional_flow"] = "NAO_CONCLUIDO"
            REPORT["error_type"] = type(error).__name__
            REPORT["error"] = safe(str(error).splitlines()[0])[:250]
            if mod_ui is not None:
                cancel_own_test(mod_ui, access)
        finally:
            browser.close()
    REPORT["finished_at"] = datetime.now(timezone.utc).isoformat()
    print("PILOT_RESULT=" + json.dumps(REPORT, ensure_ascii=False), flush=True)
    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as output:
            output.write("## Piloto técnico com personagens fictícios\n\n")
            output.write("Fluxo: **" + REPORT["functional_flow"] + "**\n\n")
            output.write("Gemini: **" + REPORT.get("gemini_mediation", "NAO_TESTADO") + "**\n\n")
            for check in REPORT["checks"]:
                output.write("- " + check + "\n")
            output.write("\nNão é avaliação com pessoas reais. Persistência após reinício não foi testada.\n")
    return 0 if REPORT["functional_flow"] == "APROVADO" else 1


if __name__ == "__main__":
    sys.exit(run())
