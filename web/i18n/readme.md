# Interface text

`en.json` keeps the existing English text. `fr.json` supplies French. `I18n.t(key, values)` replaces named `{values}` and falls back to English when a French key is missing. Keys describe the screen and meaning. Add the same key to both files.

`boot.js` loads these bundled files before the screen scripts. It reads only the local language endpoint: `/api/ui-language` for the library, `/api/setup/language` for setup. An installed map with `country: FR` selects French. Other maps and missing metadata select English. The About language control stores `en` or `fr` in local storage under `sg.language`; that choice wins over the map. Removing that item restores automatic selection. Changing the language reloads the screen, so translated constants, titles and accessibility text all follow the choice.

Use `I18n.label` only where an engine label is displayed. The tables include help-point types, video groups, source labels and dataset descriptions. `I18n.detail` handles those descriptions plus the engine's existing distance and area summaries. Place names, document titles, guide content, transcripts and model answers stay as written. Known engine errors have French text; an unknown engine error gets a short French error message. English error details remain unchanged.

French numbers and dates use `Intl` with `fr-FR`. Calendar dates are kept on their recorded day. Timestamp dates use the device's time zone. French map measurements use metres, kilometres and hectares; the conversion occurs only at display sites. The English map retains the installed map's units and rounding. The non-US 3D surround uses `#f2efe6`, matching the 2D land colour.

Run from the repository root:

```sh
python3 -B tools/audit_i18n.py
python3 -B -m unittest app.tests.test_i18n app.tests.test_chat_steps app.tests.test_map_mode
```

The audit needs only Python's standard library. It checks static HTML, JavaScript literals and templates, accessible attributes, the engine's displayed label tables and dataset descriptions, and French key coverage. It excludes machine values, selectors, units, proper names and library content. It cannot check the language of external library data or generated answers. The tests need Node for the JavaScript checks; they also compare 61 English text and markup outputs with snapshots from before the translation change. No test above opens a socket.

Also run the README unit-test command. Rendered layouts, native video controls and actual WebGL output need review in the app, including light/dark mode and narrow windows.
