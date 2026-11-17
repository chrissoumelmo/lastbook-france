#!/usr/bin/env python3
"""List interface literals outside translation keys, and check French key coverage.

Dependency free: python3 -B tools/audit_i18n.py
Library documents, guide data, geographic names and proper names are outside this audit.
The lexer reads JS strings and nested template expressions; HTMLParser checks text and accessible attributes.
Technical literals (selectors, protocol values, CSS, units and keyboard names) are excluded below.
This is a source audit, not a substitute for checking the rendered screens.
"""
import ast
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
EN = json.loads((WEB / 'i18n/en.json').read_text())
FR = json.loads((WEB / 'i18n/fr.json').read_text())
ISSUES = []
MARK = '§'


def issue(file, line, value):
    ISSUES.append(f'{file}:{line}: {value.strip()!r}')


def cooked(s):
    escapes = {'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}
    return re.sub(r'\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|.)',
                  lambda m: chr(int(m[1][1:], 16)) if m[1][:1] in ('u', 'x') and len(m[1]) > 1
                  else '' if '\n' in m[1] else escapes.get(m[1], m[1]), s)


def js_strings(source):
    """Yield (text, offset, is_template). Skip comments and regular expressions."""
    strings, templates = [], []
    def code(i, expression=False):
        depth, previous = 0, ''
        while i < len(source):
            c = source[i]
            if source.startswith('//', i):
                end = source.find('\n', i); i = len(source) if end < 0 else end; continue
            if source.startswith('/*', i):
                end = source.find('*/', i + 2); i = len(source) if end < 0 else end + 2; continue
            if c in "'\"":
                start, quote = i + 1, c; i += 1
                while i < len(source) and source[i] != quote:
                    i += 2 if source[i] == '\\' else 1
                strings.append((cooked(source[start:i]), start, False)); i += 1; previous = 'value'; continue
            if c == '`':
                start, parts = i + 1, []; i += 1
                while i < len(source):
                    if source[i] == '\\': i += 2; continue
                    if source.startswith('${', i):
                        parts.append(cooked(source[start:i])); i = code(i + 2, True); start = i; continue
                    if source[i] == '`':
                        parts.append(cooked(source[start:i])); i += 1; break
                    i += 1
                templates.append((MARK.join(parts), start, True)); previous = 'value'; continue
            if c == '/' and (not previous or previous in ('=', '(', '[', '{', ',', ':', '!', '?', '&', '|', ';', '>', 'return')):
                i += 1; bracket = False
                while i < len(source):
                    if source[i] == '\\': i += 2; continue
                    if source[i] == '[': bracket = True
                    if source[i] == ']': bracket = False
                    if source[i] == '/' and not bracket: i += 1; break
                    if source[i] == '\n': break
                    i += 1
                previous = 'value'; continue
            if c == '{': depth += 1
            if c == '}':
                if expression and depth == 0: return i + 1
                depth -= 1
            if c.isalpha() or c in '_$':
                end = i + 1
                while end < len(source) and (source[end].isalnum() or source[end] in '_$'): end += 1
                previous = source[i:end]; i = end; continue
            if not c.isspace(): previous = c
            i += 1
        return i
    code(0)
    return strings + templates


PROPER = {'Lastbook', 'LastbookData', 'PDF', 'US', 'CC', '3D', 'AV1', 'VP9', 'HEVC', 'Dt', 'Rx', 'Fi',
          'Wikibooks', 'Wikipedia', 'Appropedia', 'Coalcracker Bushcraft', 'Corporals Corner', 'Dave Canterbury', 'Primitive Technology'}
TECHNICAL = {'use strict', 'no byte range', 'no points', 'local file', 'indexing (other process)',
             ' open', ' done', ' own', ' run', ' checked', ' disabled', ' selected', ' off', ' bad', ' ok', ' hidden', ' busy',
             'main h1', 'main a[data-back]', 'table li', 'label.ly input', 'server.py --lan',
             'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec', ', p.', 'POST', 'GET', 'UTC', 'NFC', 'NFKD', 'FR', 'CA', '2d'}


def visible(value, markup=False):
    if value in TECHNICAL or value.strip() in PROPER: return False
    if value.replace(MARK, '').strip() in ('p.', 'ha'): return False  # shared abbreviation and unit symbol
    s = value.replace(MARK, '').strip()
    if not any(c.isalpha() for c in s): return False
    if len(s) == 1: return False  # map symbols and shortcut letters
    if re.fullmatch(r'(?:[\d .,:;×–−+%/()~-]*\b(?:m|km|mi|ft|h|min|s)\b[\d .,:;×–−+%/()~-]*)+', s): return False
    if re.match(r'^(?:[.#/\[?]|--|&\w|(?:aria|data)-|\w+\[|\w+[.:]\w+|(?:class|style|from|bytes)=|min\(|calc\(|var\()', s): return False
    if 'px' in s and ('Segoe' in s or 'apple-system' in s or re.match(r'^[\d.]+px', s)): return False
    if re.match(r'^\((?:min-|max-|pointer:|hover:)', s): return False
    if re.match(r'^(?:Arrow|Key|AbortError|Enter$|Escape$|Content-|Range$|Polygon$)', s): return False
    if not markup and value == value.strip() and re.fullmatch(r'[a-z][a-zA-Z0-9_.=,-]*', s): return False  # machine values; display-only lowercase words use explicit t keys
    if s.startswith('a an and are can do does '): return False  # topic search stop words, not display text
    if any(x in s for x in ('gl_Position', 'gl_FragColor', 'uniform ', 'varying ', 'precision mediump', 'void main', 'transparent!important')): return False
    if re.search(r'px(?:\s|$)', s) and re.match(r'^[-§\d.]', s): return False
    if re.match(r'^(?:application|text|video)/', s): return False
    if re.match(r'^(?:rgba?\(|[a-z][a-z_-]*:)', s): return False
    if s in ('px)', 'style="--tc:', ' class="', ' style="width:', 'library-data/'): return False
    return True


class Markup(HTMLParser):
    def __init__(self, file, line=1, annotated=False):
        super().__init__(convert_charrefs=True); self.file = file; self.line = line; self.stack = []; self.annotated = annotated
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs); self.stack.append((tag, bool(attrs.get('data-i18n'))))
        translated = json.loads(attrs.get('data-i18n-attrs', '{}'))
        for name in ('title', 'aria-label', 'placeholder', 'alt'):
            value = attrs.get(name, '')
            if value and name not in translated and MARK not in value and visible(value): issue(self.file, self.line + self.getpos()[0] - 1, value)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs); self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag: self.stack = self.stack[:i]; break
    def handle_data(self, data):
        if any(tag in ('script', 'style') or translated for tag, translated in self.stack): return
        if visible(data, markup=True): issue(self.file, self.line + self.getpos()[0] - 1, data)


def template_shapes(node):
    """English output shapes of backend labels; expression values stay as placeholders."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str): return [node.value]
    if isinstance(node, ast.JoinedStr):
        return [''.join(part.value if isinstance(part, ast.Constant) else '{}' for part in node.values)]
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return [a + b for a in template_shapes(node.left) for b in template_shapes(node.right)]
    if isinstance(node, ast.IfExp): return template_shapes(node.body) + template_shapes(node.orelse)
    return ['{}']


def backend_labels():
    tree = ast.parse((ROOT / 'server.py').read_text())
    shapes = {re.sub(r'\{\w+\}', '{}', value) for value in EN.values()}
    def check(node):
        for value in template_shapes(node):
            if value in ('', '{}') or value in PROPER: continue
            if value not in shapes and not all(part in shapes or part == '{}' for part in value.split(' · ')):
                issue('server.py', node.lineno, value)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            name = next((t.id for t in node.targets if isinstance(t, ast.Name)), '')
            if name in ('HELP', 'VROW_NOTE'):
                for value in node.value.values: check(value)
            if name in ('TRUST', 'VROWS'):
                for row in node.value.elts: check(row.elts[1])
        if isinstance(node, ast.FunctionDef) and node.name in ('map_info', 'pack_datasets', 'french_datasets', 'kind_label'):
            for part in ast.walk(node):
                if isinstance(part, ast.Dict):
                    for key, value in zip(part.keys, part.values):
                        if isinstance(key, ast.Constant) and key.value in ('label', 'status'): check(value)
                        if node.name == 'kind_label': check(value)
                # Dataset lists are (path, visible label, visible status) triples.
                if isinstance(part, ast.For) and isinstance(part.target, ast.Tuple) and len(part.target.elts) == 3 and isinstance(part.iter, (ast.List, ast.Tuple)):
                    for row in part.iter.elts:
                        if isinstance(row, ast.Tuple) and len(row.elts) == 3:
                            check(row.elts[1]); check(row.elts[2])
    # Release-pack descriptions are interface text too; future edits must supply a key.
    release = ast.parse((ROOT / 'packaging/release_manifest.py').read_text())
    for node in release.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'SMALL_SUMMARY' for t in node.targets):
            if node.value.value not in EN.values(): issue('packaging/release_manifest.py', node.lineno, node.value.value)


def audit():
    for file in sorted(WEB.glob('*.js')):
        source = file.read_text(); relative = str(file.relative_to(ROOT))
        for text, at, template in js_strings(source):
            if file.name == 'i18n.js' and text == EN['common.start_error']:
                continue  # keyed bootstrap table for a missing bundled file
            if not template and re.match(re.escape(text) + r'''['"]\s*:''', source[at:]) and source[:at - 1].rstrip().endswith(('{', ',')):
                continue  # object property names, including crop database identifiers
            line = source.count('\n', 0, at) + 1
            if re.search(r'</?[a-z][\w-]*(?:\s|>)', text, re.I): Markup(relative, line).feed(text)
            elif visible(text): issue(relative, line, text)
    for file in sorted(WEB.glob('*.html')): Markup(str(file.relative_to(ROOT))).feed(file.read_text())
    used = set()
    for file in list(WEB.glob('*.js')) + list(WEB.glob('*.html')):
        source = file.read_text()
        used.update(re.findall(r'I18n\.t\([\'\"]([^\'\"]+)[\'\"]\s*[,)]', source))
        used.update(re.findall(r'data-i18n="([^"]+)"', source))
        for raw in re.findall(r"data-i18n-attrs='([^']+)'", source): used.update(json.loads(raw).values())
    for key in sorted(used - EN.keys()): issue('keys', 0, 'unknown key ' + key)
    for key in sorted(EN.keys() - FR.keys()): issue('fr.json', 0, 'missing key ' + key)
    for key, value in FR.items():
        if not isinstance(value, str) or not value.strip(): issue('fr.json', 0, 'empty key ' + key)
    backend_labels()
    print(f'French keys: {len(EN.keys() & FR.keys())}/{len(EN)} ({100 * len(EN.keys() & FR.keys()) / len(EN):.0f}%)')
    for value in sorted(set(ISSUES)): print(value)
    print(f'Interface literals outside translation keys: {len(set(ISSUES))}')
    return bool(ISSUES)


if __name__ == '__main__': sys.exit(audit())
