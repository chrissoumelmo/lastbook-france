# French departement map builders

These tools build a **single union map set** from a list of ARA departement codes.
They do not alter the app or install/publish a pack. Default paths are outside the
checkout, under `/path/to/lastbook_fr_work/data/`.

- One code `63` selects `FR-63`.
- `63 43` selects `FR-43_63`.
- All twelve ARA codes select `FR-ARA`.
- Every builder uses the selected departments' bounding-box union plus 0.15 degrees.
  Source rows in neighbouring departments inside that box are included when available.
  Only FR-63 has been built and checked in this brief. BD TOPO input is D063 only.
- Existing outputs are refused. Use a fresh `--output` when rebuilding; keep originals
  for review. Heavy jobs require a 20 GiB cap and at most eight workers. No GPU is used.

## Re-run the delivered proofs

From the repository root:

```bash
task_project=/path/to/lastbook_fr_work
task_python="$task_project/.venv/bin/python"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH="$task_project/data/sources/python_deps"
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
(
  ulimit -v 20971520
  "$task_python" tools/fr/verify_fr.py 63
)
```

This queries the pack's SQLite files, independently decodes terrain/building records,
and executes selected unmodified `server.py` reader functions against them without
importing/starting the HTTP server. The delivered results are in
`runs/verify_fr63.json`; the upstream map-only scan report is in
`data/packs/fr_63_scan.json`. A reviewer-provided private-terms file is still needed
for the full private-word scan.

## Rebuild from the retained sources

The commands below use a **new** output folder and a **new** clipped GPKG, preserving
the delivered files. If these paths already exist, choose new names first.

```bash
set -e
task_project=/path/to/lastbook_fr_work
task_python="$task_project/.venv/bin/python"
task_rebuild="$task_project/data/rebuild_fr63"
mkdir "$task_rebuild"
mkdir -p "$task_rebuild/derived/geo"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH="$task_project/data/sources/python_deps"
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
run_capped() (
  ulimit -v 20971520
  "$task_python" "$@"
)
run_capped tools/fr/build_map_fr.py 63 \
  --clipped "$task_project/data/sources/osm/clipped_fr_63_rebuild.gpkg" \
  --output "$task_rebuild/derived/geo/map.sqlite"
run_capped tools/fr/build_terrain_fr.py 63 --workers 4 \
  --output "$task_rebuild/derived/geo/terrain.sqlite"
run_capped tools/fr/build_places_fr.py 63 \
  --map "$task_rebuild/derived/geo/map.sqlite" \
  --output "$task_rebuild/derived/geo/places.sqlite"
run_capped tools/fr/build_buildings_fr.py 63 \
  --output "$task_rebuild/derived/geo/buildings.sqlite"
run_capped tools/fr/build_water_fr.py 63 \
  --output "$task_rebuild/derived/geo/water.sqlite"
run_capped tools/fr/cut_packs_fr.py 63 \
  --source "$task_rebuild/derived/geo" --output "$task_rebuild/packs/FR-63"
run_capped tools/fr/verify_fr.py 63 --pack "$task_rebuild/packs/FR-63"
```

To repeat just the upstream scan against an existing pack (no publication code):

```bash
"$task_python" - <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, 'tools/fr')
from cut_packs_fr import offline_scan, allowed_files
pack = Path('/path/to/lastbook_fr_work/data/packs/FR-63')
# Optional: pass terms_path=Path('/path/to/reviewer_terms.txt').
report = offline_scan(pack, 'FR-63', allowed_files())
print(report)
assert not report['failures']
PY
```

`state_maps.py` normally requires all US layers. This brief requests only built
layers, so the pack uses its ALLOWED set as a subset, and calls the applicable
upstream `Scan.name_rules` / `inspect_map` rules plus the real installer `check_map`.
The scan report explicitly says whether private terms were supplied.

## Retained inputs and acquisition

All snapshots remain in `data/sources/`:

| Folder | Inputs / provenance |
|---|---|
| `osm/` | Unchanged supplied Geofabrik Auvergne/Rhone-Alpes ZIPs, plus Limousin/Bourgogne ZIPs, all `261116-free.gpkg.zip`; extracted GPKG copies. Extras cover the FR-63 box's western/northern neighbours. ODbL 1.0. |
| `boundaries/` | data.gouv.fr Contours administratifs 2026: departments at 5 m, communes at 100 m. Underlying IGN ADMIN EXPRESS; published ODbL 1.0. |
| `terrain/` | IGN BD ALTI 25 m ASC archives/edition feeds for 03,15,19,23,42,43,63,71; original grids under `asc/`. Licence Ouverte 2.0. |
| `places/` | INSEE `v_commune_2026.csv`, La Poste `laposte_hexasmal.csv`. Licence Ouverte 2.0. The postal raw export uses CP1252; the importer detects that encoding. |
| `buildings/` | IGN `BDTOPO_3-5_TOUSTHEMES_GPKG_LAMB93_D063_2026-09-15.7z`, publisher feeds and extracted GPKG under `gpkg/`. Import reads BATIMENT `cleabs`, `hauteur`, geometry only. Licence Ouverte 2.0. |
| `water/FR-63/` | Sandre WFS exports, separate hits responses, original ZIPs, extracted GPKGs and manifests containing exact query URLs. BD TOPAGE 2026 PlanEau/CoursEau; ROE active validated reference retrieved 2026-11-17. Licence Ouverte 2.0. |
| `water/` | Source catalogues, WFS capabilities, Sandre nomenclature 284 XML snapshot (saved with `.html` extension). Confirms ROE dam/weir type families. |
| `python_deps/` | py7zr/Pillow and extraction dependencies installed separately; supplied virtualenv unchanged. Build-time tools only, excluded from the pack. |

`fetch_terrain_fr.py CODE...` resolves publisher feeds for **all departments intersecting
the selected padded box**, downloads archives if absent, then extracts ASC grids.
`fetch_water_fr.py CODE...` snapshots that box from WFS in EPSG:2154, handles the
server's zipped GPKG responses, paginates, and compares every export count to hits.
Both run under the same memory cap; each download preserves at least 40 GB free.

For another union, first supply OSM extracts covering its whole box (repeatable
`--gpkg` flags), and matching BD TOPO GPKGs (also `--gpkg`). The existing four OSM
extracts are checked only for FR-63; larger unions can require other neighbour
extracts. Commune/department and postal tables are national. Use the same code list
with every builder and the packer; the packer rejects metadata for a different list
or box. The full ARA source coverage/build has not been exercised.

## File compatibility and limits

The populated build `map.sqlite` is cloned to the pack's `national.sqlite`, with an
empty household `map.sqlite` and status JSONs. This follows the existing US layout
and makes France's POIs visible through the current reader's SoCal-specific selection.
`map-set.json` lists only the built files, with exact sizes.

Terrain reuses the US encoder, downsampler and zoom constants (4–12); sampling is
bilinear from EPSG:2154 / IGN69. ASC is the exercised input. The GeoTIFF path assumes
north-up, pixel-is-area, 25 m EPSG:2154 input; rotated/other-resolution inputs are
rejected or must be warped before use. Buildings reuse the US z14 bucket and record
format; exterior rings and positive `hauteur` are retained in decimetres, zero means
unknown. Water uses the upstream schema/packing; ROE weirs and other barriers are
kept distinct from dams, even though the current UI has no separate layers for them.

The app currently activates one map set at a time. To show two departments now,
build one union set; independent concurrent installation requires app changes.
See the read-only M7 audit and file:line references in `runs/brief2_status.md`.
No real app installation, browser rendering or full ARA build was tested.
