"""Offline interface checks. Run: python3 -B -m unittest app.tests.test_i18n"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[2]


class Interface(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'needs Node')
    def test_javascript(self):
        run = subprocess.run(['node', str(ROOT / 'app/tests/i18n_test.cjs')], cwd=ROOT,
                             text=True, capture_output=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)

    @unittest.skipUnless(shutil.which('node'), 'needs Node')
    def test_english_text_and_markup(self):
        run = subprocess.run(['node', str(ROOT / 'app/tests/i18n_render_test.cjs')], cwd=ROOT,
                             text=True, capture_output=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)

    def test_source_audit(self):
        import sys
        run = subprocess.run([sys.executable, '-B', str(ROOT / 'tools/audit_i18n.py')], cwd=ROOT,
                             text=True, capture_output=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)

    def test_setup_uses_installed_country(self):
        from engine.setup.api import interface_language
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            self.assertEqual(interface_language(SimpleNamespace(current=None)), {'country': 'US'})
            self.assertEqual(interface_language(SimpleNamespace(current=path)), {'country': 'US'})
            (path / 'map-set.json').write_text(json.dumps({'country': 'FR'}))
            self.assertEqual(interface_language(SimpleNamespace(current=path)), {'country': 'FR'})
            (path / 'map-set.json').write_text('broken')
            self.assertEqual(interface_language(SimpleNamespace(current=path)), {'country': 'US'})

    def test_backend_map_and_video_labels_have_keys(self):
        import server
        table = json.loads((ROOT / 'web/i18n/en.json').read_text())
        values = set(table.values())
        for value in server.HELP.values():
            self.assertIn(value, values)
        for _, value, _ in server.VROWS:
            # Channel names remain their proper names.
            if value not in ('Coalcracker Bushcraft', 'Corporals Corner', 'Dave Canterbury', 'Primitive Technology'):
                self.assertIn(value, values)
        for value in server.VROW_NOTE.values():
            self.assertIn(value, values)
        for _, value, _ in server.TRUST:
            self.assertIn(value, values)


if __name__ == '__main__':
    unittest.main()
