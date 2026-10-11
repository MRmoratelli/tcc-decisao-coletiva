import csv
import io
import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from decision import (
    DecisionError, NO_OBJECTION, Repository, consensus, csv_export,
    current_proposal, current_responses, research_export,
)


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
        self.assertEqual(json.loads(history[-1]["payload_json"])["previous"]["argument"], "Prazo insuficiente")

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


if __name__ == "__main__":
    unittest.main()
