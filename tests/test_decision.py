import csv
import io
import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from datetime import datetime

from decision import (
    COVERAGE_STATES, MANUAL_MEDIATION_FIELDS, MANUAL_RESTRICTION_CHECKS, UNCHANGED_REVIEW_NOTE,
    DecisionError, NO_OBJECTION, Repository, UNCLASSIFIED, consensus, csv_export,
    current_proposal, current_responses, mediation_attempt_state, research_export, proposal_financial_state,
)
from experiment_config import (CLASSIFICATION_VERSION, MEDIATION_VERSION, EXPERIMENT_RELEASE,
                               EXPERIMENT_CONFIG_VERSION, MAX_MEDIATION_EXECUTIONS, TAXONOMY_VERSION,
                               TAXONOMY_CODES, TECHNICAL_CANCEL_REASON, EXPERIMENT_SCENARIO_VERSION,
                               SCENARIO_BUDGET, SCENARIO_ITEMS, SCENARIO_INITIAL_ALLOCATION, SCENARIO_INITIAL_TEXT,
                               scenario_definition, validate_scenario_allocation)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "decision.db"
        self.repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path)
        self.access = self.repo.create_room("Tema livre", "Contexto", "Proposta inicial", ["Ana", "Bruno", "Carla"])
        self.code = self.access["code"]
        self.admin = self.access["moderator_token"]
        self.tokens = [p["token"] for p in self.access["invitations"]]
        self.proposal = current_proposal(self.snapshot())["id"]

    def tearDown(self):
        self.tmp.cleanup()

    def snapshot(self, token=None):
        return self.repo.snapshot(self.code, token or self.admin)

    def vote(self, index, position="ACEITO", argument="", proposal=None, expected_edit=None):
        return self.repo.submit_response(self.code, self.tokens[index], proposal or self.proposal,
                                         position, argument, expected_edit)

    def freeze(self):
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")

    def advance(self):
        self.freeze()
        number = current_proposal(self.snapshot())["round"] + 1
        self.proposal = self.repo.publish_revision(self.code, self.admin, self.proposal, f"Nova proposta {number}")

    def test_acceptance_requires_entire_roster(self):
        self.vote(0)
        self.vote(1)
        state = consensus(self.snapshot())
        self.assertFalse(state["accepted"])
        self.assertEqual(state["missing"], ["P03"])

    def test_reservations_allow_agreement_and_are_preserved(self):
        self.vote(0, "ACEITO_COM_RESSALVAS", "Aceito, mas sugiro acompanhar os custos.")
        self.vote(1)
        self.vote(2)
        self.freeze()
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal), "ACORDO")
        state = consensus(self.snapshot())
        self.assertEqual(state["reservations"], ["P01"])
        self.assertIn("acompanhar", current_responses(self.snapshot())[0]["argument"])

    def test_required_amendment_blocks_agreement(self):
        self.vote(0, "NAO_ACEITO", "Só aceito se alterar o prazo.")
        self.vote(1)
        self.vote(2)
        self.assertFalse(consensus(self.snapshot())["accepted"])
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.finish(self.code, self.admin, self.proposal)

    def test_single_response_per_person_and_audit_keeps_edits(self):
        first = self.vote(0, "NAO_ACEITO", "Prazo insuficiente", expected_edit=0)
        second = self.vote(0, "ACEITO", "Prazo agora compreendido", expected_edit=1)
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(second["edit"], 2)
        self.assertEqual(len(current_responses(self.snapshot())), 1)
        history = [e for e in self.snapshot()["events"] if e["action"] == "MANIFESTACAO_REGISTRADA"]
        payload = json.loads(history[-1]["payload_json"])
        self.assertEqual(payload["previous_edit"], 1)
        self.assertTrue(payload["edited"])
        for event in history:
            self.assertNotIn("argument", event["payload_json"])
            self.assertNotIn("Prazo", event["payload_json"])
        self.assertEqual(current_responses(self.snapshot())[0]["argument"], "Prazo agora compreendido")

    def test_experimental_roster_uses_only_neutral_codes(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        for roster in (5, ["Nome civil A", "Nome civil B"]):
            access = repo.create_room("Tema", "Contexto", "Proposta", roster)
            snap = repo.snapshot(access["code"], access["moderator_token"])
            count = roster if type(roster) is int else len(roster)
            codes = [f"P{i:02d}" for i in range(1, count + 1)]
            self.assertEqual([p["alias"] for p in snap["participants"]], codes)
            self.assertEqual([p["pseudonym"] for p in snap["participants"]], codes)
            self.assertEqual([p["alias"] for p in access["invitations"]], codes)
            with repo.transaction() as conn:
                rows = conn.execute("SELECT normalized_alias FROM dc_participants WHERE room_id=? ORDER BY pseudonym",
                                    (snap["room"]["id"],)).fetchall()
                self.assertEqual([r["normalized_alias"] for r in rows], codes)
            self.assertNotIn("Nome civil", json.dumps(snap))
        for invalid in (0, 1, 31):
            with self.assertRaises(DecisionError):
                repo.create_room("Tema", "Contexto", "Proposta", invalid)
        self.assertEqual([p["alias"] for p in self.snapshot()["participants"]], ["Ana", "Bruno", "Carla"])

    def test_stale_edit_is_rejected(self):
        self.vote(0, expected_edit=0)
        with self.assertRaises(DecisionError):
            self.vote(0, "NAO_ACEITO", "Outro navegador", expected_edit=0)
        self.assertEqual(current_responses(self.snapshot())[0]["position"], "ACEITO")

    def test_new_version_does_not_inherit_acceptance(self):
        for i in range(3):
            self.vote(i)
        old = self.proposal
        self.advance()
        self.assertFalse(consensus(self.snapshot())["accepted"])
        self.assertEqual(len(current_responses(self.snapshot())), 0)
        self.assertEqual(len(self.snapshot()["responses"]), 3)
        with self.assertRaises(DecisionError):
            self.vote(0, proposal=old)

    def test_old_proposal_cannot_be_closed(self):
        old = self.proposal
        self.advance()
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.finish(self.code, self.admin, old)

    def test_three_round_limit(self):
        self.advance()
        self.advance()
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Quarta proposta")
        self.assertEqual(len(self.snapshot()["proposals"]), 3)

    def test_third_round_missing_is_inconclusive(self):
        self.advance()
        self.advance()
        self.vote(0, "NAO_ACEITO", "Objeção persistente")
        self.freeze()
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal), "INCONCLUSIVO")

    def test_third_round_rejection_is_no_agreement(self):
        self.advance()
        self.advance()
        for i in range(3):
            self.vote(i, "NAO_ACEITO" if i == 0 else "ACEITO", "Não aceito o prazo" if i == 0 else "")
        self.freeze()
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal), "SEM_ACORDO")

    def test_third_round_all_accept_is_agreement(self):
        self.advance()
        self.advance()
        for i in range(3):
            self.vote(i)
        self.freeze()
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal), "ACORDO")

    def test_cancel_requires_reason_and_blocks_future_changes(self):
        with self.assertRaises(DecisionError):
            self.repo.finish(self.code, self.admin, self.proposal, cancel=True)
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal, "Participante precisou sair", cancel=True), "CANCELADA")
        with self.assertRaises(DecisionError):
            self.vote(0)

    def test_collection_frozen_until_reopened(self):
        self.freeze()
        with self.assertRaises(DecisionError):
            self.vote(0)
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        self.vote(0)
        self.assertEqual(consensus(self.snapshot())["responded"], 1)

    def test_only_moderator_can_transition_publish_close_or_categorize(self):
        saved = self.vote(0, "NAO_ACEITO", "Problema")
        with self.assertRaises(DecisionError):
            self.repo.set_phase(self.code, self.tokens[0], self.proposal, "REVISAO")
        with self.assertRaises(DecisionError):
            self.repo.set_category(self.code, self.tokens[0], self.proposal, saved["id"], "Problema")
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.tokens[0], self.proposal, "Nova")
        with self.assertRaises(DecisionError):
            self.repo.finish(self.code, self.tokens[0], self.proposal, "Motivo", cancel=True)

    def test_rooms_and_credentials_are_isolated(self):
        other = self.repo.create_room("Saúde", "", "Organização de horários", ["Pessoa 1", "Pessoa 2"])
        with self.assertRaises(DecisionError):
            self.repo.snapshot(other["code"], self.admin)
        with self.assertRaises(DecisionError):
            self.repo.submit_response(other["code"], self.tokens[0], self.proposal, "ACEITO", "")
        self.vote(0)
        self.assertEqual(len(self.repo.snapshot(other["code"], other["moderator_token"])["responses"]), 0)

    def test_moderator_does_not_vote_as_participant(self):
        with self.assertRaises(DecisionError):
            self.repo.submit_response(self.code, self.admin, self.proposal, "ACEITO", "")

    def test_roster_validation_and_free_topics(self):
        for aliases in ([], ["A"], ["A", "a"]):
            with self.assertRaises(DecisionError):
                self.repo.create_room("Tema", "", "Proposta", aliases)
        for theme in ("Eventos", "Horários de trabalho", "Recursos", "Escolha de metodologia"):
            access = self.repo.create_room(theme, "", "Texto sem orçamento obrigatório", ["A", "B"])
            self.assertEqual(self.repo.snapshot(access["code"], access["moderator_token"])["room"]["theme"], theme)

    def test_justification_required_for_reservations_and_rejection(self):
        for position in ("ACEITO_COM_RESSALVAS", "NAO_ACEITO", "APROVAR_COM_EMENDAS"):
            with self.assertRaises(DecisionError):
                self.vote(0, position)

    def test_original_category_preserved_when_moderator_revises(self):
        saved = self.vote(0, "NAO_ACEITO", "Custo e acessibilidade")
        self.repo.apply_classification(self.code, self.tokens[0], self.proposal, saved["id"], saved["edit"],
                                       {"ok": True, "category": "Custos", "model": "fake", "prompt_version": "test"})
        self.repo.set_category(self.code, self.admin, self.proposal, saved["id"], "Acessibilidade")
        row = current_responses(self.snapshot())[0]
        self.assertEqual((row["category_ai"], row["category"]), ("Custos", "Acessibilidade"))
        self.assertEqual(row["argument"], "Custo e acessibilidade")

    def test_late_classification_cannot_overwrite_edit_or_manual_category(self):
        saved = self.vote(0, "NAO_ACEITO", "Custo")
        self.vote(0, "NAO_ACEITO", "Acesso")
        result = {"ok": True, "category": "Custo"}
        self.assertFalse(self.repo.apply_classification(self.code, self.tokens[0], self.proposal, saved["id"], saved["edit"], result))
        self.repo.set_category(self.code, self.admin, self.proposal, saved["id"], "Acesso")
        self.assertFalse(self.repo.apply_classification(self.code, self.tokens[0], self.proposal, saved["id"], 2, result))
        self.assertEqual(current_responses(self.snapshot())[0]["category"], "Acesso")

    def test_experimental_taxonomy_accepts_only_cat_codes(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        access = repo.create_room("Orçamento escolar", "Cenário", "Proposta", ["A", "B"])
        snap = repo.snapshot(access["code"], access["moderator_token"])
        proposal = current_proposal(snap)["id"]
        saved = repo.submit_response(access["code"], access["invitations"][0]["token"],
                                     proposal, "NAO_ACEITO", "O orçamento está desequilibrado")
        repo.apply_classification(access["code"], access["invitations"][0]["token"], proposal,
                                  saved["id"], saved["edit"],
                                  {"ok": True, "category": "CAT07", "model": "fake", "prompt_version": "test"})
        self.assertEqual(current_responses(repo.snapshot(access["code"], access["moderator_token"]))[0]["category"], "CAT07")
        with self.assertRaises(DecisionError):
            repo.set_category(access["code"], access["moderator_token"], proposal, saved["id"], "Custos")
        with self.assertRaises(DecisionError):
            repo.apply_classification(access["code"], access["invitations"][0]["token"], proposal,
                                      saved["id"], saved["edit"],
                                      {"ok": True, "category": "CAT10", "model": "fake", "prompt_version": "test"})
        self.assertEqual(tuple(TAXONOMY_CODES), tuple(f"CAT{i:02d}" for i in range(1, 10)))

    def test_participant_contests_category_and_moderator_resolves_with_traceability(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        access = repo.create_room("Orçamento escolar", "Cenário", "Proposta", ["A", "B"])
        snap = repo.snapshot(access["code"], access["moderator_token"])
        proposal = current_proposal(snap)["id"]
        saved = repo.submit_response(access["code"], access["invitations"][0]["token"],
                                     proposal, "NAO_ACEITO", "Quero priorizar acessibilidade")
        repo.apply_classification(access["code"], access["invitations"][0]["token"], proposal,
                                  saved["id"], saved["edit"],
                                  {"ok": True, "category": "CAT03", "model": "fake", "prompt_version": "test"})
        contest_id = repo.suggest_category(access["code"], access["invitations"][0]["token"],
                                           proposal, saved["id"], "CAT05", saved["edit"])
        before = repo.snapshot(access["code"], access["moderator_token"])
        row = current_responses(before)[0]
        contest = next(c for c in before["category_contests"] if c["id"] == contest_id)
        self.assertEqual((row["category_ai"], row["category"]), ("CAT03", "CAT03"))
        self.assertEqual((contest["suggested_category"], contest["status"]), ("CAT05", "PENDENTE"))

        with self.assertRaises(DecisionError):
            repo.suggest_category(access["code"], access["invitations"][1]["token"],
                                  proposal, saved["id"], "CAT05", saved["edit"])
        with self.assertRaises(DecisionError):
            repo.suggest_category(access["code"], access["invitations"][0]["token"],
                                  proposal, saved["id"], "CAT10", saved["edit"])
        with self.assertRaises(DecisionError):
            repo.suggest_category(access["code"], access["invitations"][0]["token"],
                                  proposal, saved["id"], "CAT04", saved["edit"])

        repo.set_category(access["code"], access["moderator_token"], proposal,
                          saved["id"], "CAT05", saved["edit"])
        after = repo.snapshot(access["code"], access["moderator_token"])
        row = current_responses(after)[0]
        contest = next(c for c in after["category_contests"] if c["id"] == contest_id)
        self.assertEqual((row["category_ai"], row["category"]), ("CAT03", "CAT05"))
        self.assertEqual((contest["status"], contest["resolved_category"]), ("RESOLVIDA", "CAT05"))
        exported = research_export(after)
        self.assertEqual(exported["category_contests"][0]["suggested_category"], "CAT05")

    def test_contest_is_bound_to_response_edit_and_old_trace_is_preserved(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        access = repo.create_room("Orçamento escolar", "Cenário", "Proposta", ["A", "B"])
        proposal = current_proposal(repo.snapshot(access["code"], access["moderator_token"]))["id"]
        token = access["invitations"][0]["token"]
        saved = repo.submit_response(access["code"], token, proposal, "NAO_ACEITO", "Primeiro texto")
        repo.apply_classification(access["code"], token, proposal, saved["id"], saved["edit"],
                                  {"ok": True, "category": "CAT03", "model": "fake", "prompt_version": "test"})
        repo.suggest_category(access["code"], token, proposal, saved["id"], "CAT05", saved["edit"])
        edited = repo.submit_response(access["code"], token, proposal, "NAO_ACEITO", "Texto revisado", expected_edit=1)
        self.assertEqual(edited["edit"], 2)
        snap = repo.snapshot(access["code"], access["moderator_token"])
        self.assertEqual(len(snap["category_contests"]), 1)
        self.assertEqual(snap["category_contests"][0]["response_edit"], 1)
        self.assertEqual(current_responses(snap)[0]["category"], UNCLASSIFIED)
        with self.assertRaises(DecisionError):
            repo.suggest_category(access["code"], token, proposal, saved["id"], "CAT05", 1)

    def test_experimental_no_objection_is_valid_repository_state(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        access = repo.create_room("Orçamento escolar", "Cenário", "Proposta", ["A", "B"])
        proposal = current_proposal(repo.snapshot(access["code"], access["moderator_token"]))["id"]
        token = access["invitations"][0]["token"]
        saved = repo.submit_response(access["code"], token, proposal, "ACEITO", "Considero adequado")
        repo.apply_classification(access["code"], token, proposal, saved["id"], saved["edit"],
                                  {"ok": True, "category": NO_OBJECTION, "model": "fake", "prompt_version": "test"})
        self.assertEqual(current_responses(repo.snapshot(access["code"], access["moderator_token"]))[0]["category"], NO_OBJECTION)

    def test_api_failure_preserves_response_and_no_fabricated_category(self):
        saved = self.vote(0, "NAO_ACEITO", "Custo")
        self.repo.apply_classification(self.code, self.tokens[0], self.proposal, saved["id"], 1,
                                       {"ok": False, "failure_code": "COTA_OU_LIMITE"})
        row = current_responses(self.snapshot())[0]
        self.assertEqual(row["argument"], "Custo")
        self.assertEqual(row["category"], "Não classificada")

    def test_mediation_source_is_saved_and_stale_mediation_rejected(self):
        self.vote(0, "NAO_ACEITO", "Prazo")
        self.freeze()
        snap = self.snapshot()
        source = self.repo.save_mediation(self.code, self.admin, self.proposal, snap["room"]["revision"],
                                          {"ok": True, "origin": "IA", "summary": "Prazo", "suggested_text": "Prazo maior"})
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        self.vote(1)
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Prazo maior", source)
        with self.assertRaises(DecisionError):
            self.repo.save_mediation(self.code, self.admin, self.proposal, snap["room"]["revision"], {"ok": False, "origin": "IA"})

    def test_reviewed_ai_proposal_and_human_proposal_have_distinct_origins(self):
        self.vote(0)
        self.freeze()
        source = self.repo.save_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"],
                                          {"ok": True, "origin": "IA", "summary": "Sugestão", "suggested_text": "Texto IA"})
        self.proposal = self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto revisado pelo humano", source)
        self.assertEqual(current_proposal(self.snapshot())["origin"], "IA_REVISADA_POR_HUMANO")
        self.advance()
        self.assertEqual(current_proposal(self.snapshot())["origin"], "HUMANA")

    def test_failed_mediation_cannot_be_proposal_source(self):
        self.freeze()
        failed = self.repo.save_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"],
                                          {"ok": False, "origin": "IA", "failure_code": "COTA_OU_LIMITE"})
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto inventado", failed)

    def test_invitation_reset_preserves_identity_and_invalidates_old_access(self):
        self.vote(0)
        person = self.snapshot()["participants"][0]
        replacement = self.repo.reset_invitation(self.code, self.admin, person["id"])
        with self.assertRaises(DecisionError):
            self.snapshot(self.tokens[0])
        snap = self.snapshot(replacement)
        self.assertEqual(snap["actor"]["id"], person["id"])
        self.assertEqual(consensus(snap)["responded"], 1)

    def test_data_survives_repository_recreation(self):
        self.vote(0)
        fresh = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path)
        self.assertEqual(len(fresh.snapshot(self.code, self.admin)["responses"]), 1)

    def test_concurrent_different_people_responses_are_not_lost(self):
        with ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(lambda i: self.vote(i, expected_edit=0), range(3)))
        self.assertEqual(len(results), 3)
        self.assertTrue(consensus(self.snapshot())["accepted"])

    def test_concurrent_same_person_edit_detected(self):
        def submit(_):
            try:
                self.vote(0, expected_edit=0)
                return "ok"
            except DecisionError:
                return "stale"
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(submit, range(2)))
        self.assertCountEqual(results, ["ok", "stale"])
        self.assertEqual(len(current_responses(self.snapshot())), 1)

    def test_competing_revision_publications_only_one_succeeds(self):
        self.freeze()
        def publish(i):
            try:
                self.repo.publish_revision(self.code, self.admin, self.proposal, f"Texto {i}")
                return "ok"
            except DecisionError:
                return "stale"
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(publish, range(2)))
        self.assertCountEqual(results, ["ok", "stale"])
        self.assertEqual(len(self.snapshot()["proposals"]), 2)

    def test_exports_omit_credentials_names_and_escape_csv_formulas(self):
        self.vote(0, "NAO_ACEITO", "  =HYPERLINK(\"https://example.com\")")
        exported = json.dumps(research_export(self.snapshot()), ensure_ascii=False)
        self.assertNotIn('"alias"', exported)
        self.assertNotIn("moderator_hash", exported)
        self.assertNotIn("token_hash", exported)
        for credential in [self.admin] + self.tokens:
            self.assertNotIn(credential, exported)
        rows = list(csv.DictReader(io.StringIO(csv_export(self.snapshot()).decode("utf-8-sig"))))
        self.assertTrue(rows[0]["argument"].startswith("'="))

    def test_empty_roster_never_reports_agreement(self):
        snap = self.snapshot()
        snap["participants"] = []
        self.assertFalse(consensus(snap)["accepted"])


class ExperimentalMediationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=Path(self.tmp.name) / "experimental.db",
                               experimental_mode=True)
        self.create_condition(False)

    def tearDown(self):
        self.tmp.cleanup()

    def create_condition(self, ai_enabled):
        self.access = self.repo.create_room("Orçamento escolar", "Orçamento restrito", "Distribuição inicial", 3, ai_enabled)
        self.code, self.admin = self.access["code"], self.access["moderator_token"]
        self.proposal = current_proposal(self.snapshot())["id"]
        for index, argument in enumerate(("Aumentar computadores sem reduzir biblioteca", "Aumentar biblioteca sem reduzir computadores", "")):
            saved = self.repo.submit_response(self.code, self.access["invitations"][index]["token"], self.proposal,
                                               "NAO_ACEITO" if argument else "ACEITO", argument)
            if argument:
                self.repo.set_category(self.code, self.admin, self.proposal, saved["id"], "CAT07", saved["edit"])
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")

    def snapshot(self):
        return self.repo.snapshot(self.code, self.admin)

    def manual_result(self):
        details = {key: "Registro explícito de " + label for key, label in MANUAL_MEDIATION_FIELDS}
        details["divergences"] = "Pedidos incompatíveis de ampliar computadores e biblioteca sem reduzir o outro item."
        details["restriction_checks"] = {key: True for key, _ in MANUAL_RESTRICTION_CHECKS}
        details["coverage"] = [
            {"response_id": r["id"], "treatment": "SEM_OBJECAO" if r["category"] == NO_OBJECTION else "PARCIAL",
             "note": "" if r["category"] == NO_OBJECTION else "Restrição de recursos impede atendimento integral."}
            for r in current_responses(self.snapshot())
        ]
        return {"origin": "HUMANA", "ok": True, "suggested_text": "Distribuição revisada viável", "details": details}

    def save(self, result):
        return self.repo.save_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"], result)

    def ai_source(self):
        return self.save({"origin": "IA", "ok": True, "summary": "Divergências de orçamento preservadas",
                          "suggested_text": "Sugestão original IA", "model": "fake-model", "prompt_version": "test",
                          "details": {"coverage": [{"participant": "P01", "treatment": "PARCIAL", "note": "Condição parcial"}]}})

    def test_b_taxonomy_and_contest_use_same_controlled_categories(self):
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        r = current_responses(self.snapshot())[0]
        for invalid in ("Categoria livre", "CAT10", UNCLASSIFIED, NO_OBJECTION):
            with self.assertRaises(DecisionError):
                self.repo.set_category(self.code, self.admin, self.proposal, r["id"], invalid, r["edit"])
        contest = self.repo.suggest_category(self.code, self.access["invitations"][0]["token"], self.proposal, r["id"], "CAT05", r["edit"])
        self.repo.set_category(self.code, self.admin, self.proposal, r["id"], "CAT05", r["edit"])
        row = next(c for c in self.snapshot()["category_contests"] if c["id"] == contest)
        self.assertEqual((row["status"], row["resolved_category"]), ("RESOLVIDA", "CAT05"))
        self.assertIsNone(current_responses(self.snapshot())[0]["category_ai"])
        self.assertFalse(self.repo.apply_classification(self.code, self.admin, self.proposal, r["id"], r["edit"],
                                                       {"ok": True, "category": "CAT03"}))

    def test_b_rejects_each_missing_or_blank_template_block(self):
        for key, _ in MANUAL_MEDIATION_FIELDS:
            for missing in (True, False):
                with self.subTest(key=key, missing=missing):
                    result = self.manual_result()
                    if missing:
                        del result["details"][key]
                    else:
                        result["details"][key] = "  "
                    with self.assertRaises(DecisionError):
                        self.save(result)
        self.assertEqual(self.snapshot()["mediations"], [])

    def test_b_requires_restriction_confirmations_and_suggested_text(self):
        for key, _ in MANUAL_RESTRICTION_CHECKS:
            result = self.manual_result()
            result["details"]["restriction_checks"][key] = False
            with self.assertRaises(DecisionError):
                self.save(result)
        result = self.manual_result()
        result["suggested_text"] = ""
        with self.assertRaises(DecisionError):
            self.save(result)

    def test_b_coverage_requires_every_current_response_once_and_operational_reasons(self):
        for mutation in ("missing", "duplicate", "unknown", "invalid_state", "no_reason", "false_no_objection", "missing_no_objection"):
            with self.subTest(mutation=mutation):
                result = self.manual_result()
                coverage = result["details"]["coverage"]
                if mutation == "missing": coverage.pop()
                elif mutation == "duplicate": coverage[1] = dict(coverage[0])
                elif mutation == "unknown": coverage[0]["response_id"] = "unknown"
                elif mutation == "invalid_state": coverage[0]["treatment"] = "MAIORIA"
                elif mutation == "no_reason": coverage[0]["note"] = ""
                elif mutation == "false_no_objection": coverage[0]["treatment"] = "SEM_OBJECAO"
                elif mutation == "missing_no_objection": coverage[-1].update(treatment="CONTEMPLADA", note="x")
                with self.assertRaises(DecisionError):
                    self.save(result)
        self.assertEqual(tuple(COVERAGE_STATES), ("CONTEMPLADA", "PARCIAL", "NAO_CONTEMPLADA", "SEM_OBJECAO"))

    def test_b_complete_mediation_persists_template_coverage_and_conflicting_requests(self):
        result = self.manual_result()
        original = json.dumps(result)
        source = self.save(result)
        self.assertEqual(json.dumps(result), original)
        snap = self.snapshot()
        saved = next(m for m in snap["mediations"] if m["id"] == source)
        self.assertEqual((saved["origin"], saved["status"], saved["proposal_id"]), ("HUMANA", "OK", self.proposal))
        self.assertEqual(saved["revision"], snap["room"]["revision"])
        details = json.loads(saved["details_json"])
        for key, label in MANUAL_MEDIATION_FIELDS:
            self.assertEqual(details[key], result["details"][key])
            self.assertIn(label, saved["summary"])
        for coverage, response in zip(details["coverage"], current_responses(snap)):
            self.assertEqual((coverage["response_id"], coverage["response_edit"], coverage["participant"], coverage["category"]),
                             (response["id"], response["edit"], response["pseudonym"], response["category"]))
        self.assertEqual([c["treatment"] for c in details["coverage"]], ["PARCIAL", "PARCIAL", "SEM_OBJECAO"])
        self.assertEqual(details["coverage"][-1]["note"], "")
        self.assertIn("Pedidos incompatíveis", details["divergences"])
        self.assertFalse(consensus(snap)["accepted"])
        new = self.repo.publish_revision(self.code, self.admin, self.proposal, result["suggested_text"], source)
        snap = self.snapshot()
        self.assertEqual(current_proposal(snap)["id"], new)
        self.assertEqual(current_proposal(snap)["source_mediation_id"], source)
        self.assertEqual(current_responses(snap), [])
        self.assertEqual(research_export(snap)["mediations"][0]["details_json"], saved["details_json"])

    def test_b_requires_registered_manual_source_and_rejects_stale_source(self):
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto sem mediação")
        with self.assertRaises(DecisionError):
            self.save({"origin": "IA", "ok": True, "summary": "IA", "suggested_text": "Texto IA"})
        source = self.save(self.manual_result())
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto com base obsoleta", source)

    def test_b_rejects_unclassified_responses_before_manual_mediation(self):
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        r = current_responses(self.snapshot())[0]
        self.repo.submit_response(self.code, self.access["invitations"][0]["token"], self.proposal,
                                   "NAO_ACEITO", "Argumento editado", expected_edit=r["edit"])
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        with self.assertRaises(DecisionError):
            self.save(self.manual_result())

    def test_b_agreement_can_finish_without_creating_manual_mediation(self):
        self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        for invitation in self.access["invitations"]:
            self.repo.submit_response(self.code, invitation["token"], self.proposal, "ACEITO", "")
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal), "ACORDO")
        self.assertEqual(self.snapshot()["mediations"], [])

    def test_a_requires_ai_source_and_textual_review_note(self):
        self.create_condition(True)
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Nova proposta", review_note="Revisada")
        with self.assertRaises(DecisionError):
            self.save(self.manual_result())
        source = self.ai_source()
        for note in ("", "  ", None):
            with self.assertRaises(DecisionError):
                self.repo.publish_revision(self.code, self.admin, self.proposal, "Sugestão original IA", source, review_note=note)
        self.assertEqual(len(self.snapshot()["proposals"]), 1)

    def test_a_unchanged_publication_records_explicit_note_and_retains_original(self):
        self.create_condition(True)
        source = self.ai_source()
        original = self.snapshot()["mediations"][0]
        self.repo.publish_revision(self.code, self.admin, self.proposal, "Sugestão original IA", source,
                                   review_note=UNCHANGED_REVIEW_NOTE)
        snap = self.snapshot()
        self.assertEqual(snap["mediations"][0], original)
        self.assertEqual(current_proposal(snap)["source_mediation_id"], source)
        self.assertEqual(current_proposal(snap)["origin"], "IA_REVISADA_POR_HUMANO")
        event = next(e for e in snap["events"] if e["action"] == "PROPOSTA_PUBLICADA")
        payload = json.loads(event["payload_json"])
        self.assertFalse(payload["changed_from_source"])
        self.assertEqual(payload["review_note"], UNCHANGED_REVIEW_NOTE)

    def test_a_changed_publication_requires_reason_and_reconstructs_ai_human_proposal_chain(self):
        self.create_condition(True)
        source = self.ai_source()
        original = self.snapshot()["mediations"][0]
        for note in ("", UNCHANGED_REVIEW_NOTE):
            with self.assertRaises(DecisionError):
                self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto ajustado à restrição", source, review_note=note)
        note = "Correção de omissão e ajuste à restrição financeira registrada."
        new = self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto ajustado à restrição", source, review_note=note)
        snap = self.snapshot()
        self.assertEqual(snap["mediations"][0], original)
        event = next(e for e in snap["events"] if e["action"] == "PROPOSTA_PUBLICADA")
        payload = json.loads(event["payload_json"])
        self.assertEqual((payload["source_mediation_id"], payload["source_origin"], payload["changed_from_source"], payload["review_note"]),
                         (source, "IA", True, note))
        self.assertEqual((event["proposal_id"], event["actor"]), (new, "MODERADOR"))
        self.assertTrue(event["created_at"])
        self.assertEqual(current_proposal(snap)["text"], "Texto ajustado à restrição")
        self.assertNotIn("Sugestão original IA", event["payload_json"])
        self.assertNotIn("Texto ajustado à restrição", event["payload_json"])

    def test_a_rejects_empty_successful_mediation_and_failed_source(self):
        self.create_condition(True)
        with self.assertRaises(DecisionError):
            self.save({"origin": "IA", "ok": True, "summary": "", "suggested_text": ""})
        failed = self.save({"origin": "IA", "ok": False, "failure_code": "FALHA_IA"})
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Nova proposta", failed, review_note="Revisada")


class ExperimentalFailureProtocolTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=Path(self.tmp.name) / "failures.db", experimental_mode=True)
        self.access = self.repo.create_room("Orçamento", "Contexto", "Proposta inicial", 3, True)
        self.code, self.admin = self.access["code"], self.access["moderator_token"]
        self.proposal = current_proposal(self.snapshot())["id"]
        self.token = self.access["invitations"][0]["token"]
        self.saved = self.repo.submit_response(self.code, self.token, self.proposal, "NAO_ACEITO", "Preservar esta justificativa")
        self.config = {"model": "primary", "classification_prompt": "classificacao-v1", "mediation_prompt": "mediacao-v1",
                       "taxonomy_version": "taxonomia-v1", "temperature": None, "temperature_policy": "provider_default"}

    def tearDown(self):
        self.tmp.cleanup()

    def snapshot(self):
        return self.repo.snapshot(self.code, self.admin)

    def freeze(self):
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        return self.snapshot()["room"]["revision"]

    def begin(self):
        return self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"], self.config)

    def result(self, ok=False):
        base = {"origin": "IA", "ok": ok, "model": "primary", "prompt_version": "mediacao-v1", "duration_ms": 1}
        return base | ({"summary": "Síntese IA válida", "suggested_text": "Proposta IA revisada"} if ok else
                       {"failure_code": "SERVICO_INDISPONIVEL", "summary": "NÃO REAPROVEITAR", "suggested_text": "NÃO GERAR PROPOSTA LOCAL"})

    def complete(self, attempt_id, ok=False):
        return self.repo.save_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"],
                                         self.result(ok), attempt_id=attempt_id)

    def test_classification_failure_and_human_fallback_remain_distinct_from_correction_and_contest(self):
        self.repo.ensure_ai_configuration(self.code, self.admin, self.config)
        failure = {"ok": False, "failure_code": "COTA_OU_LIMITE", "model": "primary", "prompt_version": "classificacao-v1"}
        self.repo.apply_classification(self.code, self.token, self.proposal, self.saved["id"], self.saved["edit"], failure)
        row = current_responses(self.snapshot())[0]
        self.assertEqual((row["argument"], row["category"], row["classification_status"]),
                         ("Preservar esta justificativa", UNCLASSIFIED, "COTA_OU_LIMITE"))
        with self.assertRaises(DecisionError):
            self.repo.set_category(self.code, self.admin, self.proposal, row["id"], "CAT07", row["edit"])
        with self.assertRaises(DecisionError):
            self.repo.set_category(self.code, self.admin, self.proposal, row["id"], "Livre", row["edit"], technical_fallback=True)
        self.repo.set_category(self.code, self.admin, self.proposal, row["id"], "CAT07", row["edit"], technical_fallback=True)
        snap = self.snapshot()
        row = current_responses(snap)[0]
        self.assertEqual(row["classification_status"], "FALLBACK_HUMANO")
        self.assertIsNone(row["category_ai"])
        self.assertEqual((row["classification_model"], row["classification_prompt"]), ("primary", "classificacao-v1"))
        event = next(e for e in snap["events"] if e["action"] == "CLASSIFICACAO_FALLBACK_HUMANO")
        self.assertEqual(json.loads(event["payload_json"])["failure_code"], "COTA_OU_LIMITE")
        self.assertTrue(any(e["action"] == "CLASSIFICACAO_IA" for e in snap["events"]))
        self.repo.suggest_category(self.code, self.token, self.proposal, row["id"], "CAT05", row["edit"])
        self.repo.set_category(self.code, self.admin, self.proposal, row["id"], "CAT05", row["edit"])
        snap = self.snapshot()
        self.assertEqual(current_responses(snap)[0]["classification_status"], "FALLBACK_HUMANO")
        self.assertEqual(snap["category_contests"][0]["status"], "RESOLVIDA")
        self.assertTrue(snap["room"]["ai_enabled"])
        self.freeze()
        with self.assertRaises(DecisionError):
            self.repo.save_mediation(self.code, self.admin, self.proposal, self.snapshot()["room"]["revision"],
                                     {"origin": "HUMANA", "ok": True, "summary": "Não permitido", "suggested_text": "Texto"})

    def test_fallback_requires_real_classification_failure(self):
        with self.assertRaises(DecisionError):
            self.repo.set_category(self.code, self.admin, self.proposal, self.saved["id"], "CAT07", technical_fallback=True)

    def test_configuration_is_frozen_for_session_without_secret_values(self):
        self.repo.ensure_ai_configuration(self.code, self.admin, self.config | {"api_key": "DO_NOT_LOG"})
        self.repo.ensure_ai_configuration(self.code, self.token, dict(self.config))
        events = [e for e in self.snapshot()["events"] if e["action"] == "CONFIGURACAO_IA_FIXADA"]
        self.assertEqual(len(events), 1)
        self.assertNotIn("DO_NOT_LOG", events[0]["payload_json"])
        for field in self.config:
            config = self.config | {field: 1 if field == "temperature" else "changed"}
            with self.subTest(field=field), self.assertRaises(DecisionError):
                self.repo.ensure_ai_configuration(self.code, self.admin, config)
        with self.assertRaises(DecisionError):
            self.repo.apply_classification(self.code, self.token, self.proposal, self.saved["id"], self.saved["edit"],
                                           {"ok": True, "category": "CAT07", "model": "other", "prompt_version": "classificacao-v1"})
        self.assertEqual(current_responses(self.snapshot())[0]["classification_status"], "PENDENTE")

    def test_attempt_is_reserved_before_call_and_first_failure_is_persisted_once(self):
        revision = self.freeze()
        attempt = self.begin()
        snap = self.snapshot()
        self.assertEqual([(m["id"], m["status"]) for m in snap["mediations"]], [(attempt, "EM_EXECUCAO")])
        with self.assertRaises(DecisionError): self.begin()
        self.assertEqual(self.complete(attempt), attempt)
        snap = self.snapshot()
        self.assertEqual(snap["room"]["revision"], revision)
        self.assertEqual(len(snap["mediations"]), 1)
        row = snap["mediations"][0]
        self.assertEqual((row["status"], row["failure_code"], row["summary"], row["suggested_text"]),
                         ("FALHA", "SERVICO_INDISPONIVEL", "", ""))
        self.assertTrue(mediation_attempt_state(snap)["retry"])
        with self.assertRaises(DecisionError): self.complete(attempt)

    def test_two_failures_block_third_call_reopening_publication_and_normal_finish_but_allow_technical_cancel(self):
        revision = self.freeze()
        first = self.begin(); self.complete(first)
        with self.assertRaises(DecisionError):
            self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA")
        second = self.begin(); self.complete(second)
        snap = self.snapshot()
        self.assertTrue(mediation_attempt_state(snap)["persistent_failure"])
        self.assertEqual(snap["room"]["revision"], revision)
        with self.assertRaises(DecisionError): self.begin()
        with self.assertRaises(DecisionError):
            self.repo.save_mediation(self.code, self.admin, self.proposal, revision, self.result())
        with self.assertRaises(DecisionError):
            self.repo.save_mediation(self.code, self.admin, self.proposal, revision, {"origin": "HUMANA", "ok": True})
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, "Não permitido", first, review_note="Revisado")
        with self.assertRaises(DecisionError): self.repo.finish(self.code, self.admin, self.proposal)
        self.assertEqual(self.repo.finish(self.code, self.admin, self.proposal, TECHNICAL_CANCEL_REASON, cancel=True), "CANCELADA")
        snap = self.snapshot()
        self.assertEqual(snap["room"]["close_reason"], TECHNICAL_CANCEL_REASON)
        self.assertEqual({m["id"] for m in snap["mediations"]}, {first, second})
        self.assertTrue(all(m["failure_code"] == "SERVICO_INDISPONIVEL" for m in snap["mediations"]))
        self.assertEqual(current_responses(snap)[0]["argument"], "Preservar esta justificativa")
        self.assertEqual(len([e for e in snap["events"] if e["action"] == "MEDIACAO_REGISTRADA"]), 2)

    def test_second_success_preserves_failed_attempt_and_allows_reviewed_publication(self):
        self.freeze()
        self.complete(self.begin())
        second = self.begin(); self.complete(second, True)
        with self.assertRaises(DecisionError): self.begin()
        self.repo.publish_revision(self.code, self.admin, self.proposal, "Proposta IA revisada", second, review_note=UNCHANGED_REVIEW_NOTE)
        snap = self.snapshot()
        self.assertEqual(current_proposal(snap)["round"], 2)
        self.assertEqual(current_proposal(snap)["source_mediation_id"], second)
        self.assertEqual([m["status"] for m in snap["mediations"]], ["FALHA", "OK"])
        self.assertEqual(current_responses(snap), [])

    def test_first_success_does_not_allow_unnecessary_second_execution(self):
        self.freeze()
        self.complete(self.begin(), True)
        with self.assertRaises(DecisionError): self.begin()

    def test_concurrent_reservations_allow_only_one_external_execution_at_a_time(self):
        self.freeze()
        def reserve(_):
            try: return self.begin()
            except DecisionError: return None
        for _ in range(2):
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(reserve, range(2)))
            valid = [r for r in results if r is not None]
            self.assertEqual(len(valid), 1)
            self.complete(valid[0])
        self.assertEqual(len(self.snapshot()["mediations"]), 2)

    def test_changed_revision_or_configuration_cannot_be_used_for_retry(self):
        revision = self.freeze()
        self.complete(self.begin())
        for config, rev in ((self.config | {"model": "other"}, revision), (self.config, revision + 1)):
            with self.assertRaises(DecisionError):
                self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, rev, config)
        self.assertEqual(len(self.snapshot()["mediations"]), 1)

    def test_unconfirmed_execution_cannot_be_repeated_or_published(self):
        self.freeze()
        attempt = self.begin()
        for action in (self.begin, lambda: self.repo.set_phase(self.code, self.admin, self.proposal, "COLETA"),
                       lambda: self.repo.publish_revision(self.code, self.admin, self.proposal, "Texto", attempt, review_note="Revisto")):
            with self.assertRaises(DecisionError): action()
        self.repo.finish(self.code, self.admin, self.proposal, "Execução sem resultado confirmado", cancel=True)
        self.assertEqual(self.snapshot()["mediations"][0]["status"], "EM_EXECUCAO")

    def test_generic_mode_keeps_previous_unlimited_mediation_behavior(self):
        repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=Path(self.tmp.name) / "generic.db")
        access = repo.create_room("Tema", "", "Proposta", ["A", "B"])
        code, token = access["code"], access["moderator_token"]
        prop = current_proposal(repo.snapshot(code, token))["id"]
        repo.set_phase(code, token, prop, "REVISAO")
        revision = repo.snapshot(code, token)["room"]["revision"]
        for _ in range(3): repo.save_mediation(code, token, prop, revision, self.result())
        repo.set_phase(code, token, prop, "COLETA")
        self.assertEqual(len(repo.snapshot(code, token)["mediations"]), 3)

    def test_condition_b_does_not_enter_ai_failure_protocol(self):
        access = self.repo.create_room("Tema", "", "Proposta", 2, False)
        code, token = access["code"], access["moderator_token"]
        prop = current_proposal(self.repo.snapshot(code, token))["id"]
        saved = self.repo.submit_response(code, access["invitations"][0]["token"], prop, "ACEITO", "")
        self.repo.ensure_ai_configuration(code, token, self.config)
        self.repo.set_phase(code, token, prop, "REVISAO")
        snap = self.repo.snapshot(code, token)
        with self.assertRaises(DecisionError):
            self.repo.begin_ai_mediation(code, token, prop, snap["room"]["revision"], self.config)
        details = {key: "Nenhum ponto adicional identificado" for key, _ in MANUAL_MEDIATION_FIELDS}
        details["restriction_checks"] = {key: True for key, _ in MANUAL_RESTRICTION_CHECKS}
        details["coverage"] = [{"response_id": saved["id"], "treatment": "SEM_OBJECAO"}]
        for _ in range(3):
            self.repo.save_mediation(code, token, prop, snap["room"]["revision"],
                                     {"origin": "HUMANA", "ok": True, "suggested_text": "Proposta revisada", "details": details})
        snap = self.repo.snapshot(code, token)
        self.assertEqual(len(snap["mediations"]), 3)
        self.assertFalse(mediation_attempt_state(snap)["persistent_failure"])
        self.assertFalse(any(e["action"] == "CONFIGURACAO_IA_FIXADA" for e in snap["events"]))


class ExperimentalExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "export.db"
        self.build = "a" * 40
        with patch.dict(os.environ, {"APP_COMMIT": self.build}):
            self.repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
        self.config = {"model": "modelo-fixado", "classification_prompt": CLASSIFICATION_VERSION,
                       "mediation_prompt": MEDIATION_VERSION, "taxonomy_version": TAXONOMY_VERSION,
                       "temperature": None, "temperature_policy": "provider_default"}
        self.create(True)

    def tearDown(self):
        self.tmp.cleanup()

    def create(self, enabled):
        self.access = self.repo.create_room("Orçamento", "R$ 80.000 disponíveis", "Proposta inicial", 3, enabled)
        self.code, self.admin = self.access["code"], self.access["moderator_token"]
        self.proposal = current_proposal(self.snapshot())["id"]

    def snapshot(self):
        return self.repo.snapshot(self.code, self.admin)

    def response(self, position="NAO_ACEITO", argument="Texto original pessoa@example.org R$ 80.000"):
        return self.repo.submit_response(self.code, self.access["invitations"][0]["token"], self.proposal, position, argument)

    def test_a_manifest_exposes_release_versions_build_and_frozen_ai_configuration(self):
        self.repo.ensure_ai_configuration(self.code, self.admin, self.config)
        data = research_export(self.snapshot())
        manifest = data["experiment"]
        self.assertEqual(data["schema_version"], 2)
        self.assertEqual(manifest["condition"], "A")
        self.assertTrue(manifest["ai_enabled"])
        self.assertTrue(manifest["experimental_mode"])
        self.assertEqual(manifest["experiment_release"], EXPERIMENT_RELEASE)
        self.assertEqual(manifest["experiment_config_version"], EXPERIMENT_CONFIG_VERSION)
        self.assertEqual(manifest["taxonomy_version"], TAXONOMY_VERSION)
        self.assertEqual(manifest["max_rounds"], 3)
        self.assertEqual(manifest["max_mediation_executions"], MAX_MEDIATION_EXECUTIONS)
        self.assertEqual(manifest["model"], self.config["model"])
        self.assertEqual(manifest["classification_prompt_version"], CLASSIFICATION_VERSION)
        self.assertEqual(manifest["mediation_prompt_version"], MEDIATION_VERSION)
        self.assertIsNone(manifest["temperature"])
        self.assertEqual(manifest["temperature_policy"], "provider_default")
        self.assertEqual(manifest["app_commit"], self.build)
        self.assertEqual(manifest["storage_type"], "postgresql" if self.repo.postgres else "sqlite")
        self.assertEqual(manifest["exported_at"], data["exported_at"])
        self.assertEqual(manifest["ai_configuration_status"], "recorded")

    def test_b_manifest_never_claims_ai_model_or_ai_prompts_were_used(self):
        self.create(False)
        manifest = research_export(self.snapshot())["experiment"]
        self.assertEqual(manifest["condition"], "B")
        self.assertFalse(manifest["ai_enabled"])
        for key in ("model", "classification_prompt_version", "mediation_prompt_version", "temperature"):
            self.assertIsNone(manifest[key])
        self.assertEqual(manifest["ai_configuration_status"], "not_applicable")
        self.assertEqual(manifest["taxonomy_version"], TAXONOMY_VERSION)
        self.assertEqual(manifest["defined_prompt_versions"], {"classification": CLASSIFICATION_VERSION, "mediation": MEDIATION_VERSION})

    def test_missing_or_invalid_app_commit_never_invents_a_sha_or_exports_invalid_content(self):
        for value in ("", "DO_NOT_EXPORT_SECRET_MISTAKEN_FOR_BUILD"):
            with patch.dict(os.environ, {"APP_COMMIT": value}):
                repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)
            access = repo.create_room("Tema", "", "Proposta", 2)
            data = research_export(repo.snapshot(access["code"], access["moderator_token"]))
            self.assertIsNone(data["experiment"]["app_commit"])
            self.assertIsNone(data["exporter"]["app_commit"])
            self.assertNotIn("DO_NOT_EXPORT_SECRET_MISTAKEN_FOR_BUILD", json.dumps(data))

    def test_session_identity_is_not_rewritten_by_later_build_or_exporter(self):
        other = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True, app_commit="b" * 40)
        data = research_export(other.snapshot(self.code, self.admin))
        self.assertEqual(data["experiment"]["app_commit"], self.build)
        self.assertEqual(data["exporter"]["app_commit"], "b" * 40)
        self.assertTrue(data["exporter"]["build_changed_since_session_start"])
        self.assertEqual(data["experiment"]["session_metadata_status"], "recorded")

    def test_legacy_session_keeps_unknown_identity_explicit(self):
        generic = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path)
        access = generic.create_room("Legado", "", "Proposta", ["A", "B"])
        data = research_export(self.repo.snapshot(access["code"], access["moderator_token"]))
        self.assertEqual(data["experiment"]["session_metadata_status"], "not_recorded")
        for key in ("app_commit", "experiment_release", "experiment_config_version", "model", "temperature"):
            self.assertIsNone(data["experiment"][key])
        self.assertEqual(data["exporter"]["app_commit"], self.build)
        self.assertEqual(data["experiment"]["ai_configuration_status"], "not_recorded")
        plain = research_export(generic.snapshot(access["code"], access["moderator_token"]))
        self.assertFalse(plain["experiment"]["experimental_mode"])
        self.assertIsNone(plain["experiment"]["condition"])

    def test_frozen_configuration_is_used_instead_of_exporter_prompt_definitions(self):
        configured = self.config | {"classification_prompt": "class-frozen", "mediation_prompt": "media-frozen", "taxonomy_version": "tax-frozen"}
        self.repo.ensure_ai_configuration(self.code, self.admin, configured)
        manifest = research_export(self.snapshot())["experiment"]
        self.assertEqual(manifest["classification_prompt_version"], "class-frozen")
        self.assertEqual(manifest["mediation_prompt_version"], "media-frozen")
        self.assertEqual(manifest["taxonomy_version"], "tax-frozen")
        self.assertEqual(manifest["defined_prompt_versions"]["classification"], CLASSIFICATION_VERSION)

    def test_complete_a_trace_includes_original_text_fallback_contest_mediations_review_and_result(self):
        self.repo.ensure_ai_configuration(self.code, self.admin, self.config)
        response = self.response()
        token = self.access["invitations"][0]["token"]
        self.repo.apply_classification(self.code, token, self.proposal, response["id"], response["edit"],
                                       {"ok": False, "failure_code": "COTA_OU_LIMITE", "model": self.config["model"], "prompt_version": CLASSIFICATION_VERSION})
        self.repo.set_category(self.code, self.admin, self.proposal, response["id"], "CAT07", response["edit"], technical_fallback=True)
        self.repo.suggest_category(self.code, token, self.proposal, response["id"], "CAT05", response["edit"])
        self.repo.set_category(self.code, self.admin, self.proposal, response["id"], "CAT05", response["edit"])
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        revision = self.snapshot()["room"]["revision"]
        first = self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, revision, self.config)
        self.repo.save_mediation(self.code, self.admin, self.proposal, revision,
                                 {"origin": "IA", "ok": False, "failure_code": "SERVICO_INDISPONIVEL"}, attempt_id=first)
        second = self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, revision, self.config)
        self.repo.save_mediation(self.code, self.admin, self.proposal, revision, {
            "origin": "IA", "ok": True, "summary": "Síntese original", "suggested_text": "Proposta sugerida original",
            "model": self.config["model"], "prompt_version": MEDIATION_VERSION, "duration_ms": 50,
            "details": {"coverage": [{"participant": "P01", "treatment": "PARCIAL", "note": "Condição parcialmente incorporada"}]},
        }, attempt_id=second)
        note = "Ajustada a proposta para preservar condição minoritária registrada."
        new = self.repo.publish_revision(self.code, self.admin, self.proposal, "Proposta publicada após revisão humana", second, review_note=note)
        for person in self.access["invitations"]:
            self.repo.submit_response(self.code, person["token"], new, "ACEITO", "")
        self.repo.set_phase(self.code, self.admin, new, "REVISAO")
        self.repo.finish(self.code, self.admin, new)
        snap = self.snapshot()
        before = json.dumps(snap)
        data = research_export(snap)
        self.assertEqual(json.dumps(snap), before)
        row = next(r for r in data["responses"] if r["id"] == response["id"])
        self.assertEqual(row["argument"], "Texto original pessoa@example.org R$ 80.000")
        self.assertNotIn("[EMAIL_REMOVIDO]", row["argument"])
        self.assertEqual((row["classification_status"], row["category_ai"], row["category"]), ("FALLBACK_HUMANO", None, "CAT05"))
        self.assertTrue(row["classification_fallback"])
        self.assertEqual(row["classification_failure_code"], "COTA_OU_LIMITE")
        by_event = {e["id"]: e for e in data["events"]}
        self.assertEqual(by_event[row["classification_failure_event_id"]]["action"], "CLASSIFICACAO_IA")
        self.assertEqual(by_event[row["classification_fallback_event_id"]]["action"], "CLASSIFICACAO_FALLBACK_HUMANO")
        contest = data["category_contests"][0]
        self.assertEqual((contest["response_id"], contest["response_edit"], contest["pseudonym"], contest["suggested_category"], contest["resolved_category"]),
                         (response["id"], 1, "P01", "CAT05", "CAT05"))
        self.assertEqual([m["execution"] for m in data["mediations"]], [1, 2])
        self.assertEqual([m["status"] for m in data["mediations"]], ["FALHA", "OK"])
        self.assertEqual(data["mediations"][0]["failure_code"], "SERVICO_INDISPONIVEL")
        self.assertEqual(data["mediations"][1]["coverage"][0]["participant"], "P01")
        proposal = next(p for p in data["proposals"] if p["id"] == new)
        review = proposal["human_review"]
        self.assertEqual(proposal["parent_id"], self.proposal)
        self.assertEqual(proposal["source_mediation_id"], second)
        self.assertEqual(review["original_suggested_text"], "Proposta sugerida original")
        self.assertEqual(review["published_text"], proposal["text"])
        self.assertEqual(review["review_note"], note)
        self.assertTrue(review["changed_from_source"])
        self.assertEqual(review["published_by"], "MODERADOR")
        for timestamp in (data["room"]["created_at"], data["room"]["closed_at"], row["created_at"], row["updated_at"],
                          review["published_at"], data["mediations"][0]["execution_started_at"], data["mediations"][0]["execution_completed_at"]):
            self.assertIsNotNone(datetime.fromisoformat(timestamp).tzinfo)
        self.assertEqual(data["room"]["result"], "ACORDO")

    def test_ai_category_remains_distinct_from_contested_and_final_category(self):
        saved = self.response()
        token = self.access["invitations"][0]["token"]
        self.repo.apply_classification(self.code, token, self.proposal, saved["id"], 1,
                                       {"ok": True, "category": "CAT03", "model": "modelo", "prompt_version": CLASSIFICATION_VERSION})
        self.repo.suggest_category(self.code, token, self.proposal, saved["id"], "CAT05", 1)
        self.repo.set_category(self.code, self.admin, self.proposal, saved["id"], "CAT05", 1)
        data = research_export(self.snapshot())
        self.assertEqual(data["responses"][0]["category_ai"], "CAT03")
        self.assertEqual(data["responses"][0]["category"], "CAT05")
        self.assertFalse(data["responses"][0]["classification_fallback"])
        self.assertEqual(data["category_contests"][0]["suggested_category"], "CAT05")

    def test_manual_b_mediation_exports_structured_template_and_local_coverage(self):
        self.create(False)
        saved = self.response("ACEITO", "")
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        details = {key: "Nenhum ponto adicional identificado" for key, _ in MANUAL_MEDIATION_FIELDS}
        details["restriction_checks"] = {key: True for key, _ in MANUAL_RESTRICTION_CHECKS}
        details["coverage"] = [{"response_id": saved["id"], "treatment": "SEM_OBJECAO"}]
        revision = self.snapshot()["room"]["revision"]
        source = self.repo.save_mediation(self.code, self.admin, self.proposal, revision,
                                         {"origin": "HUMANA", "ok": True, "suggested_text": "Proposta revisada", "details": details})
        data = research_export(self.snapshot())
        mediation = data["mediations"][0]
        self.assertEqual(mediation["id"], source)
        self.assertEqual(mediation["origin"], "HUMANA")
        self.assertEqual(json.loads(mediation["details_json"]), mediation["details"])
        self.assertEqual(mediation["coverage"][0]["response_id"], saved["id"])
        self.assertEqual(mediation["coverage"][0]["participant"], "P01")
        self.assertEqual(mediation["coverage"][0]["note"], "")
        self.assertIsNone(mediation["execution"])

    def test_pending_and_cancelled_executions_export_without_fake_completion_or_agreement(self):
        self.response()
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        revision = self.snapshot()["room"]["revision"]
        first = self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, revision, self.config)
        pending = research_export(self.snapshot())["mediations"][0]
        self.assertEqual((pending["execution"], pending["status"]), (1, "EM_EXECUCAO"))
        self.assertIsNone(pending["execution_completed_at"])
        self.repo.save_mediation(self.code, self.admin, self.proposal, revision,
                                 {"origin": "IA", "ok": False, "failure_code": "TEMPO_ESGOTADO"}, attempt_id=first)
        second = self.repo.begin_ai_mediation(self.code, self.admin, self.proposal, revision, self.config)
        self.repo.save_mediation(self.code, self.admin, self.proposal, revision,
                                 {"origin": "IA", "ok": False, "failure_code": "TEMPO_ESGOTADO"}, attempt_id=second)
        self.repo.finish(self.code, self.admin, self.proposal, TECHNICAL_CANCEL_REASON, cancel=True)
        data = research_export(self.snapshot())
        self.assertEqual((data["room"]["state"], data["room"]["result"], data["room"]["close_reason"]),
                         ("ENCERRADA", "CANCELADA", TECHNICAL_CANCEL_REASON))
        self.assertEqual([m["execution"] for m in data["mediations"]], [1, 2])
        self.assertTrue(all(m["status"] == "FALHA" and m["failure_code"] == "TEMPO_ESGOTADO" for m in data["mediations"]))

    def test_export_excludes_structured_secrets_civil_aliases_and_environment_but_not_original_argument(self):
        self.response()
        snapshot = self.snapshot()
        snapshot["room"].update(moderator_hash="BAD_MODERATOR_HASH", DATABASE_URL="BAD_DATABASE_URL", secrets={"key": "BAD_SECRET"})
        snapshot["participants"][0].update(alias="NOME CIVIL PRIVADO", normalized_alias="nome civil privado", token_hash="BAD_TOKEN_HASH",
                                           token="BAD_PARTICIPANT_TOKEN", email="civil@example.org", enrollment="BAD_ENROLLMENT")
        snapshot["responses"][0]["alias"] = "NOME CIVIL PRIVADO"
        snapshot["actor"]["moderator_token"] = "BAD_MODERATOR_TOKEN"
        payload = json.loads(snapshot["events"][0]["payload_json"])
        payload["nested"] = {"GEMINI_API_KEY": "BAD_API_KEY", "DATABASE_URL": "BAD_DATABASE_URL", "tokens": [{"token_hash": "BAD_TOKEN_HASH"}]}
        snapshot["events"][0]["payload_json"] = json.dumps(payload)
        before = json.dumps(snapshot)
        with patch.dict(os.environ, {"GEMINI_API_KEY": "ENVIRONMENT_API_SECRET", "DATABASE_URL": "postgresql://private:secret@host/private"}):
            data = research_export(snapshot)
        serialized = json.dumps(data, ensure_ascii=False)
        for private in ("BAD_MODERATOR_HASH", "BAD_DATABASE_URL", "BAD_SECRET", "NOME CIVIL PRIVADO", "BAD_TOKEN_HASH", "BAD_PARTICIPANT_TOKEN",
                        "BAD_ENROLLMENT", "BAD_MODERATOR_TOKEN", "BAD_API_KEY", "ENVIRONMENT_API_SECRET", "civil@example.org",
                        "postgresql://private:secret@host/private", self.admin, *[p["token"] for p in self.access["invitations"]]):
            self.assertNotIn(private, serialized)
        for key in ('"moderator_hash"', '"token_hash"', '"moderator_token"', '"alias"', '"GEMINI_API_KEY"', '"DATABASE_URL"', '"secrets"'):
            self.assertNotIn(key, serialized)
        self.assertIn("pessoa@example.org", data["responses"][0]["argument"])
        self.assertIn(self.build, serialized)
        self.assertEqual(json.dumps(snapshot), before)

    def test_csv_keeps_original_text_model_prompt_and_formula_escaping(self):
        self.response(argument='=HYPERLINK("https://example.org")')
        snap = self.snapshot()
        snap["responses"][0].update(classification_model="+modelo", classification_prompt=CLASSIFICATION_VERSION)
        rows = list(csv.DictReader(io.StringIO(csv_export(snap).decode("utf-8-sig"))))
        self.assertEqual(rows[0]["round"], "1")
        self.assertEqual(rows[0]["participant"], "P01")
        self.assertEqual(rows[0]["classification_model"], "'+modelo")
        self.assertEqual(rows[0]["classification_prompt"], CLASSIFICATION_VERSION)
        self.assertTrue(rows[0]["argument"].startswith("'="))


class ScenarioRestrictionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "scenario.db"
        self.repo = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path, experimental_mode=True)

    def tearDown(self):
        self.tmp.cleanup()

    def create_scenario(self, enabled=False, proposal_text=SCENARIO_INITIAL_TEXT):
        self.access = self.repo.create_room("Escola simulada", "Orçamento limitado", proposal_text, 3,
                                             enabled, scenario_enabled=True)
        self.code, self.admin = self.access["code"], self.access["moderator_token"]
        self.proposal = current_proposal(self.snapshot())["id"]

    def snapshot(self):
        return self.repo.snapshot(self.code, self.admin)

    def prepare_source(self):
        snap = self.snapshot()
        self.repo.submit_response(self.code, self.access["invitations"][0]["token"], self.proposal, "ACEITO", "")
        self.repo.set_phase(self.code, self.admin, self.proposal, "REVISAO")
        snap = self.snapshot()
        text = "Proposta revisada para rodada " + str(current_proposal(snap)["round"] + 1)
        if snap["room"]["ai_enabled"]:
            result = {"origin": "IA", "ok": True, "summary": "Síntese da rodada", "suggested_text": text,
                      "details": {"coverage": [{"participant": "P01", "treatment": "SEM_OBJECAO", "note": "Sem objeção explicitada"}]}}
        else:
            details = {key: "Nenhum ponto adicional identificado" for key, _ in MANUAL_MEDIATION_FIELDS}
            details["restriction_checks"] = {key: True for key, _ in MANUAL_RESTRICTION_CHECKS}
            details["coverage"] = [{"response_id": r["id"], "treatment": "SEM_OBJECAO"} for r in current_responses(snap)]
            result = {"origin": "HUMANA", "ok": True, "suggested_text": text, "details": details}
        source = self.repo.save_mediation(self.code, self.admin, self.proposal, snap["room"]["revision"], result)
        return source, text

    def test_official_budget_ceilings_initial_values_and_separate_identifiers(self):
        self.assertEqual(SCENARIO_BUDGET, 80000)
        self.assertEqual([i["ceiling"] for i in SCENARIO_ITEMS.values()], [40000, 35000, 20000, 30000, 20000])
        self.assertEqual(sum(i["ceiling"] for i in SCENARIO_ITEMS.values()), 145000)
        self.assertEqual(list(SCENARIO_INITIAL_ALLOCATION.values()), [25000, 25000, 10000, 15000, 5000])
        self.assertEqual(set(SCENARIO_INITIAL_ALLOCATION), set(SCENARIO_ITEMS))
        self.assertTrue(set(SCENARIO_ITEMS).isdisjoint(TAXONOMY_CODES))
        self.assertEqual(sum(SCENARIO_INITIAL_ALLOCATION.values()), 80000)
        for code, item in SCENARIO_ITEMS.items():
            self.assertEqual((item["code"], item["currency"]), (code, "BRL"))

    def test_exact_budget_and_lower_totals_are_valid_with_explicit_unallocated_balance(self):
        base = dict(SCENARIO_INITIAL_ALLOCATION)
        self.assertEqual(validate_scenario_allocation(base)["total"], 80000)
        self.assertEqual(validate_scenario_allocation(base)["unallocated"], 0)
        base["CAT_INV01"] -= 5000
        result = validate_scenario_allocation(base)
        self.assertEqual((result["total"], result["unallocated"]), (75000, 5000))
        zero = validate_scenario_allocation({code: 0 for code in SCENARIO_ITEMS})
        self.assertEqual((len(zero["items"]), zero["total"], zero["unallocated"]), (5, 0, 80000))

    def test_budget_80001_is_rejected(self):
        values = dict(SCENARIO_INITIAL_ALLOCATION)
        values["CAT_INV01"] += 1
        with self.assertRaisesRegex(ValueError, "total distribuído"):
            validate_scenario_allocation(values)

    def test_negative_and_each_of_the_five_ceiling_violations_are_rejected(self):
        for code, item in SCENARIO_ITEMS.items():
            for value in (-1, item["ceiling"] + 1):
                with self.subTest(code=code, value=value):
                    values = {c: 0 for c in SCENARIO_ITEMS}
                    values[code] = value
                    with self.assertRaises(ValueError):
                        validate_scenario_allocation(values)

    def test_non_finite_fractional_boolean_string_and_missing_values_are_rejected(self):
        for value in (float("nan"), float("inf"), -float("inf"), 1.5, 25000.0, True, "25000", None):
            with self.subTest(value=value):
                values = dict(SCENARIO_INITIAL_ALLOCATION)
                values["CAT_INV01"] = value
                with self.assertRaises(ValueError):
                    validate_scenario_allocation(values)

    def test_missing_unknown_and_additional_resource_items_are_rejected(self):
        for code in SCENARIO_ITEMS:
            values = dict(SCENARIO_INITIAL_ALLOCATION)
            del values[code]
            with self.assertRaises(ValueError):
                validate_scenario_allocation(values)
        for code in ("CAT01", "CAT_INV06", "novo_orcamento", "reserva_externa", "doacao_futura"):
            values = dict(SCENARIO_INITIAL_ALLOCATION) | {code: 1000}
            with self.subTest(code=code), self.assertRaises(ValueError):
                validate_scenario_allocation(values)

    def test_scenario_v1_is_fixed_and_generic_mode_stays_non_financial(self):
        self.create_scenario()
        state = proposal_financial_state(self.snapshot())
        self.assertEqual(state["status"], "VALID")
        self.assertEqual(state["allocation"]["items"], SCENARIO_INITIAL_ALLOCATION)
        other = dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000}
        with self.assertRaises(DecisionError):
            self.repo.create_room("Tema", "", "Proposta", 3, scenario_enabled=True, allocation=other)
        generic = Repository(os.getenv("TEST_DATABASE_URL", ""), sqlite_path=self.path)
        with self.assertRaises(DecisionError):
            generic.create_room("Tema", "", "Proposta", ["A", "B"], scenario_enabled=True)
        access = generic.create_room("Tema", "", "Proposta sem orçamento obrigatório", ["A", "B"])
        data = research_export(generic.snapshot(access["code"], access["moderator_token"]))
        self.assertIsNone(data["scenario"])
        self.assertEqual(data["proposals"][0]["allocation_validation_status"], "NOT_ENABLED")

    def test_a_and_b_reject_same_invalid_allocations_and_publish_valid_values(self):
        for enabled in (True, False):
            with self.subTest(ai_enabled=enabled):
                self.create_scenario(enabled)
                source, text = self.prepare_source()
                over = dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 25001}
                for values in (None, {}, over, dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": -1}):
                    with self.assertRaises(DecisionError):
                        self.repo.publish_revision(self.code, self.admin, self.proposal, text, source,
                                                   review_note=UNCHANGED_REVIEW_NOTE, allocation=values)
                self.assertEqual(len(self.snapshot()["proposals"]), 1)
                self.assertFalse(any(e["action"] == "PROPOSTA_PUBLICADA" for e in self.snapshot()["events"]))
                valid = dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000}
                new = self.repo.publish_revision(self.code, self.admin, self.proposal, text, source,
                                                 review_note=UNCHANGED_REVIEW_NOTE, allocation=valid)
                state = proposal_financial_state(self.snapshot())
                self.assertEqual(current_proposal(self.snapshot())["id"], new)
                self.assertEqual((state["allocation"]["total"], state["allocation"]["unallocated"]), (75000, 5000))
                event = next(e for e in self.snapshot()["events"] if e["action"] == "PROPOSTA_PUBLICADA")
                self.assertEqual(event["proposal_id"], new)
                self.assertEqual(json.loads(event["payload_json"])["allocation"], state["allocation"])

    def test_v1_v2_v3_allocations_and_frozen_scenario_export_under_schema_two(self):
        self.create_scenario(False)
        versions = [self.proposal]
        allocations = [dict(SCENARIO_INITIAL_ALLOCATION),
                       dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000},
                       dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000, "CAT_INV02": 20000}]
        for values in allocations[1:]:
            source, text = self.prepare_source()
            self.proposal = self.repo.publish_revision(self.code, self.admin, self.proposal, text, source, allocation=values)
            versions.append(self.proposal)
        data = research_export(self.snapshot())
        self.assertEqual(data["schema_version"], 2)
        self.assertEqual(data["scenario"]["scenario_version"], EXPERIMENT_SCENARIO_VERSION)
        self.assertEqual(data["scenario"]["budget"], 80000)
        self.assertEqual(data["scenario"]["allocation_items"], SCENARIO_ITEMS)
        self.assertEqual(data["experiment"]["scenario_version"], EXPERIMENT_SCENARIO_VERSION)
        for index, proposal in enumerate(data["proposals"]):
            self.assertEqual(proposal["id"], versions[index])
            self.assertEqual(proposal["allocation"]["items"], allocations[index])
            self.assertEqual(proposal["total"], sum(allocations[index].values()))
            self.assertEqual(proposal["unallocated"], 80000 - proposal["total"])
            self.assertEqual(proposal["allocation_validation_status"], "VALID")
        source, text = self.prepare_source()
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, text, source, allocation=allocations[-1])
        self.assertEqual(len(self.snapshot()["proposals"]), 3)

    def test_financial_change_can_create_new_version_without_rewriting_explanatory_prose(self):
        self.create_scenario(False, "Distribuição conforme os valores estruturados apresentados.")
        source, _ = self.prepare_source()
        old_text = current_proposal(self.snapshot())["text"]
        values = dict(SCENARIO_INITIAL_ALLOCATION) | {"CAT_INV01": 20000}
        self.proposal = self.repo.publish_revision(self.code, self.admin, self.proposal, old_text, source, allocation=values)
        self.assertEqual(current_proposal(self.snapshot())["text"], old_text)
        self.assertEqual(proposal_financial_state(self.snapshot())["allocation"]["total"], 75000)
        source, _ = self.prepare_source()
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, old_text, source, allocation=values)

    def test_missing_financial_record_is_explicit_and_not_inferred_from_v1_text(self):
        self.create_scenario(False)
        source, text = self.prepare_source()
        snap = self.snapshot()
        event = next(e for e in snap["events"] if e["action"] == "SALA_CRIADA")
        payload = json.loads(event["payload_json"])
        del payload["allocation"]
        with self.repo.transaction(write=True) as conn:
            conn.execute("UPDATE dc_events SET payload_json=? WHERE id=?", (json.dumps(payload), event["id"]))
        data = research_export(self.snapshot())
        self.assertEqual(data["proposals"][0]["allocation_validation_status"], "NOT_RECORDED")
        self.assertIsNone(data["proposals"][0]["allocation"])
        with self.assertRaises(DecisionError):
            self.repo.publish_revision(self.code, self.admin, self.proposal, text, source, allocation=dict(SCENARIO_INITIAL_ALLOCATION))

    def test_unknown_or_inconsistent_scenario_configuration_is_not_automatically_validated(self):
        bad = scenario_definition()
        bad["scenario_version"] = "unsupported-future-version"
        with self.assertRaisesRegex(ValueError, "não reconhecida"):
            validate_scenario_allocation(dict(SCENARIO_INITIAL_ALLOCATION), bad)
        bad = scenario_definition()
        bad["budget"] = 90000
        with self.assertRaises(ValueError):
            validate_scenario_allocation(dict(SCENARIO_INITIAL_ALLOCATION), bad)


if __name__ == "__main__":
    unittest.main()
