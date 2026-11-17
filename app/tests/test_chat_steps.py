"""Chat's "How it searched" list shows the model's own tool calls. They are the model's words, not ours: everything in a
step must reach the page escaped, whatever shape the model sent (a list, a single value, text with markup in it).

Runs chat.js's stepText with app.js's esc under Node. Needs Node on PATH; skipped without it. Never packaged."""
import json, shutil, subprocess, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NODE = shutil.which('node')
RUN = r"""
const fs = require('fs'), path = require('path');
const web = path.dirname(process.argv[1]);
require(path.join(web, 'i18n.js'));
I18n.configure(JSON.parse(fs.readFileSync(path.join(web, 'i18n/en.json'), 'utf8')), {}, 'en');
const chat = fs.readFileSync(process.argv[1], 'utf8'), app = fs.readFileSync(process.argv[2], 'utf8');
const esc = app.split('\n').find(l => /^const esc\s*=/.test(l));
const i = chat.indexOf('function stepText('), j = chat.indexOf('\n  function srcHref');
const stepText = new Function(esc + '\n' + chat.slice(i, j) + '\nreturn stepText;')();
const out = JSON.parse(process.argv[3]).map(s => { try { return stepText(s) } catch (e) { return 'THROW ' + e.message } });
process.stdout.write(JSON.stringify(out));
"""


@unittest.skipUnless(NODE, 'needs Node')
class Steps(unittest.TestCase):
    def text(self, steps):
        r = subprocess.run([NODE, '-e', RUN, str(ROOT / 'web/chat.js'), str(ROOT / 'web/app.js'), json.dumps(steps)],
                           capture_output=True, text=True, check=True)
        return json.loads(r.stdout)

    def test_read_pages_is_escaped_whatever_the_model_sent(self):
        got = self.text([
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': [3, 4]}, 'summary': {'title': 'FEMA'}},
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': ['<img src=x onerror=alert(1)>']}, 'summary': {'title': 'T'}},
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': '"><svg onload=alert(1)>'}, 'summary': {'title': 'T'}},
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': 7}, 'summary': {'title': 'T'}},
        ])
        self.assertEqual(got[0], 'Read FEMA, pages 3, 4')
        self.assertEqual(got[1], 'Read T, page &lt;img src=x onerror=alert(1)&gt;')
        self.assertEqual(got[2], 'Read T, page &quot;&gt;&lt;svg onload=alert(1)&gt;')
        self.assertEqual(got[3], 'Read T, page 7')
        for t in got:
            self.assertNotIn('<', t)

    def test_odd_shapes_neither_throw_nor_leak(self):
        # JSON can carry objects whose toString is not a function; converting them would throw and blank the answer.
        odd = [{'toString': 'x'}, {'a': 1}, [1, 2], None, True]
        got = self.text([
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': odd + [5, '6']}, 'summary': {'title': 'T'}},
            {'name': 'read_pages', 'args': {'doc_id': 'x', 'pages': {'toString': 'x'}}, 'summary': {'title': 'T'}},
            {'name': 'lookup_place', 'args': {'query': 'clinic', 'pages': {'toString': 'x'}}, 'summary': {}},
            {'name': 'search_library', 'args': {'query': 'water', 'pages': {'toString': 'x'}}, 'summary': {'count': 1}},
            {'name': 'view_page', 'args': {'doc_id': 'x', 'page': 3, 'pages': {'toString': 'x'}}, 'summary': {'title': 'T'}},
        ])
        for t in got:
            self.assertFalse(t.startswith('THROW'), t)
            self.assertNotIn('<', t)
        self.assertEqual(got[0], 'Read T, pages 5, 6')
        self.assertEqual(got[1], 'Read T, page ')
        self.assertEqual(got[2], 'Looked up “clinic” on the offline map')
        self.assertEqual(got[3], 'Searched “water” — 1 passage')
        self.assertEqual(got[4], 'Looked at the picture of T, page 3')

    def test_odd_values_in_other_arguments(self):
        bad = {'toString': 'x'}
        got = self.text([
            {'name': 'search_library', 'args': {'query': bad, 'kind': bad}, 'summary': {'count': 2}},
            {'name': 'lookup_place', 'args': {'query': bad}, 'summary': {}},
            {'name': 'view_page', 'args': {'doc_id': bad, 'page': bad}, 'summary': {'title': 'T'}},
            {'name': 'read_pages', 'args': {'doc_id': bad, 'pages': [2]}, 'summary': {}},
            {'name': 'search_library', 'args': 'not an object', 'summary': {'count': 0}},
            {'name': 'search_library', 'args': {'query': '<b>x</b>', 'kind': 'video'}, 'summary': {'count': 1}},
        ])
        for t in got:
            self.assertFalse(t.startswith('THROW'), t)
            self.assertNotIn('<', t)
        self.assertEqual(got[0], 'Searched “” — 2 passages')
        self.assertEqual(got[2], 'Looked at the picture of T, page ')
        self.assertEqual(got[3], 'Read , page 2')
        self.assertEqual(got[5], 'Searched “&lt;b&gt;x&lt;/b&gt;” (videos) — 1 passage')


if __name__ == '__main__':
    unittest.main()
