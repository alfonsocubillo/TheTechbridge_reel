import copy
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from agent import writer
from agent.common import load_config


class FormatTests(unittest.TestCase):
    def setUp(self):
        self.sample = json.loads(
            (Path(__file__).resolve().parents[1] / "ejemplo_storyboard.json").read_text(encoding="utf-8")
        )

    def test_prompt_example_matches_its_label(self):
        writer.validate(self.sample)
        writer.validate_format(self.sample, "prompt")

    def test_prompt_cannot_be_labelled_news(self):
        self.sample["format"] = "noticia"
        with self.assertRaisesRegex(ValueError, "NOTICIA"):
            writer.validate_format(self.sample, "noticia")

    def test_news_is_accepted_without_prompt_scenes(self):
        self.sample["format"] = "noticia"
        self.sample["scenes"] = [s for s in self.sample["scenes"] if s["type"] != "prompt"]
        writer.validate_format(self.sample, "noticia")
        with self.assertRaisesRegex(ValueError, "necesita una escena prompt"):
            writer.validate_format(self.sample, "prompt")

    def test_generator_retries_mismatched_content(self):
        invalid = copy.deepcopy(self.sample)
        invalid["format"] = "noticia"
        valid = copy.deepcopy(invalid)
        valid["scenes"] = [s for s in valid["scenes"] if s["type"] != "prompt"]
        with patch.object(writer, "claude", side_effect=[json.dumps(invalid), json.dumps(valid)]) as model:
            result = writer.write_storyboard(load_config(), "noticia", None, "", [])
        self.assertEqual(model.call_count, 2)
        self.assertIn("NOTICIA", model.call_args.args[1])
        self.assertEqual(result["format"], "noticia")


class EveryLabelTellsTheTruth(unittest.TestCase):
    """Lo que pone la etiqueta del vídeo es lo que cuenta: dato es dato, truco es truco, mito es mito..."""

    def scenes(self, *types, **compare):
        out = [{"type": "hook", "text": "x"}]
        for t in types:
            out.append({"type": t, **(compare if t == "compare" else {})})
        return {"scenes": out + [{"type": "outro", "text": "x"}]}

    def test_each_format_needs_its_own_scene(self):
        cases = {"dato": "stat", "truco": "list", "prompt": "prompt", "antes_despues": "compare"}
        for fmt, needed in cases.items():
            with self.subTest(fmt=fmt):
                with self.assertRaisesRegex(ValueError, f"necesita una escena {needed}"):
                    writer.validate_format(self.scenes("broll"), fmt)
                writer.validate_format(self.scenes("broll", needed), fmt)

    def test_only_prompt_of_the_day_shows_a_prompt(self):
        for fmt in ("noticia", "dato", "tendencia", "truco", "antes_despues", "mito"):
            with self.subTest(fmt=fmt):
                with self.assertRaisesRegex(ValueError, "no puede llevar escenas prompt"):
                    writer.validate_format(self.scenes("stat", "list", "compare", "prompt", left_title="Mito"), fmt)

    def test_myth_compares_myth_and_reality(self):
        with self.assertRaisesRegex(ValueError, "Mito"):
            writer.validate_format(self.scenes("compare", left_title="Antes"), "mito")
        writer.validate_format(self.scenes("compare", left_title="Mito", right_title="Realidad"), "mito")

    def test_news_prompt_names_the_label(self):
        text = writer.format_contract(load_config(), "noticia")
        self.assertIn('"NOTICIA"', text)
        self.assertIn("Prohibido: escenas de tipo prompt", text)

    def test_story_kinds_match_their_content(self):
        with self.assertRaisesRegex(ValueError, "cifra"):
            writer.validate_stories({"stories": [{"kind": "dato", "title": "Mucha gente usa Copilot", "body": "Según Microsoft"}]})
        with self.assertRaisesRegex(ValueError, "preguntar"):
            writer.validate_stories({"stories": [{"kind": "pregunta", "title": "Cuéntanos cómo usas Teams"}]})
        writer.validate_stories({"stories": [{"kind": "dato", "title": "El 70 % ya usa Copilot", "body": "Según Microsoft"}]})


if __name__ == "__main__":
    unittest.main()
