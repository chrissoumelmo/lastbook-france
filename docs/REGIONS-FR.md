# Detailed maps for France: a proposal

This is a proposal for discussion, not a decision. It answers, for France, the questions [MAPS.md](MAPS.md) asks before
coverage can go beyond the United States: which open source replaces each federal list, under what licence, what a
"state" is there, and how addresses are written. It follows the shape of [REGIONS-DE.md](REGIONS-DE.md) and is meant to
feed the same design discussion. The machine-readable version is [regions-fr-proposed.json](regions-fr-proposed.json).

Nothing here changes the app, the engine or a build. No code reads the JSON, and nothing here ships: builds package
`web/` and `content/` only. The first proposed test is Auvergne-Rhône-Alpes.

**How things were checked.** Research was done on 17 November 2026 by reading publishers’ pages, catalogue metadata,
and download feeds. This document has not had a separate human review. Each source carries one of three marks:

- **opened**: the dataset, publisher catalogue or licence page itself was opened and read;
- **search only**: a fact was visible in a search result from the publisher’s own site, but the source content could
  not be opened;
- **not checked**: no usable source content could be read; the row says what is missing.

Opening metadata does not mean opening a large data archive. Except for the boundary file, archives were not downloaded.
The source register below has 22 distinct entries: 18 opened, two search only and two not checked (82% opened).
The delivery tables describe the same entries and are not additional checks. Unknown sizes and licences are left unknown.

## Why France is a useful next case

Several layers have nationwide public sources: IGN terrain and buildings, the BAN for addresses, the RPG for agricultural
parcels, and Sandre’s water reference data. Most of the map sources checked name Licence Ouverte 2.0. The work is therefore
mainly to read new formats, preserve French address forms and fit the data to Lastbook’s existing files.

This is not evidence that an installed map will fit a particular drive. Source archives and finished map files have
different sizes. The proposed 5–15 GB map estimate in the draft has not been tested.

## What a region is

The proposal is one map for each of the 13 metropolitan régions, including Corsica. Here “mainland” means this
metropolitan set; Corsica is an island and has a different administrative status. Use Auvergne-Rhône-Alpes first. If its
finished map is too large, département maps such as a proposed `FR-63` are an option to discuss, not a second scheme
implemented here. INSEE’s parent-area tables identify the twelve ARA départements listed below.

The five overseas régions are **later**: Guadeloupe, Martinique, Guyane, La Réunion and Mayotte. No overseas boxes or map
builds are proposed here. Other overseas collectivités are outside this first set.

### Codes

Use country-prefixed, ISO 3166-2-style identifiers: `FR-ARA`, `FR-IDF`, `FR-OCC` and the other proposals in the table.
**The ISO code list could not be read**, so the identifiers remain provisional, including `FR-20R` for Corsica.
The ISO check is recorded in the source register; a typed code is not verification.
INSEE’s numeric region codes are separate and are retained for joins to French data.

Hyphenated identifiers keep the country visible and apart from existing US state map names. Setup, manifests, archive
names and address indexes would still need the maintainers’ decision before any code follows this proposal.

### Boxes

The boxes were computed from data.gouv.fr’s **Contours administratifs 2026**, `regions-5m.geojson.gz`, published on
4 May 2026. Its publisher says metropolitan boundaries come from IGN ADMIN EXPRESS; the combined dataset is labelled
**ODbL**, not Licence Ouverte. The separate IGN catalogue record is also recorded below.

The downloaded gzip file has 8,696,324 bytes and SHA-256
`84acbadd742107a8f2906c806bffafb9259d454ad8a3877a48b529d76ee29ee6`. All coordinate pairs in each selected region’s
Polygon or MultiPolygon were visited, taking minimum and maximum longitude and latitude. This includes islands in the
published geometry. Coordinates were used as supplied in GeoJSON; no projection conversion was needed. Each box was
expanded by 0.15° on all sides and rounded outward to 0.01°, as in the German proposal. Unpadded numbers below are
rounded to four decimals for display; the JSON retains the six-decimal extrema from the file.

| Code | INSEE | Name | Box (west, south, east, north) | Box with 0.15° margin | Box taken from |
|---|---|---|---|---|---|
| `FR-IDF` | 11 | Île-de-France | 1.4463, 48.1201, 3.5590, 49.2415 | 1.29, 47.97, 3.71, 49.40 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-CVL` | 24 | Centre-Val de Loire | 0.0527, 46.3469, 3.1287, 48.9410 | -0.10, 46.19, 3.28, 49.10 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-BFC` | 27 | Bourgogne-Franche-Comté | 2.8449, 46.1561, 7.1434, 48.4001 | 2.69, 46.00, 7.30, 48.56 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-NOR` | 28 | Normandie | -1.9550, 48.1799, 1.8029, 50.0722 | -2.11, 48.02, 1.96, 50.23 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-HDF` | 32 | Hauts-de-France | 1.3802, 48.8372, 4.2558, 51.0892 | 1.23, 48.68, 4.41, 51.24 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-GES` | 44 | Grand Est | 3.3837, 47.4203, 8.2325, 50.1693 | 3.23, 47.27, 8.39, 50.32 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-PDL` | 52 | Pays de la Loire | -2.6254, 46.2667, 0.9167, 48.5680 | -2.78, 46.11, 1.07, 48.72 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-BRE` | 53 | Bretagne | -5.1412, 47.2779, -1.0156, 48.9008 | -5.30, 47.12, -0.86, 49.06 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-NAQ` | 75 | Nouvelle-Aquitaine | -1.7924, 42.7779, 2.6113, 47.1760 | -1.95, 42.62, 2.77, 47.33 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-OCC` | 76 | Occitanie | -0.3272, 42.3329, 4.8456, 45.0467 | -0.48, 42.18, 5.00, 45.20 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-ARA` | 84 | Auvergne-Rhône-Alpes | 2.0629, 44.1155, 7.1856, 46.8043 | 1.91, 43.96, 7.34, 46.96 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-PAC` | 93 | Provence-Alpes-Côte d'Azur | 4.2302, 42.9820, 7.7190, 45.1268 | 4.08, 42.83, 7.87, 45.28 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |
| `FR-20R` | 94 | Corse | 8.5347, 41.3336, 9.5600, 43.0276 | 8.38, 41.18, 9.71, 43.18 | [Contours 2026](https://www.data.gouv.fr/datasets/contours-administratifs), opened |

These are boxes around a generalised boundary, not a claim about exact legal limits. A box can include neighbouring
régions or countries. Keep source rows needed for the margin rather than filtering strictly to administrative membership.

| Source | Publisher | Licence | Checked |
|---|---|---|---|
| [ADMIN EXPRESS](https://www.data.gouv.fr/datasets/admin-express) | IGN | etalab-2.0 | **opened** — IGN catalogue metadata read through data.gouv.fr. The product page redirects to a JavaScript application. The boxes in this proposal use the separately published contours instead. |
| [Contours administratifs 2026, regions, 5 m generalisation](https://www.data.gouv.fr/datasets/contours-administratifs) | data.gouv.fr, from IGN ADMIN EXPRESS | ODbL-1.0 | **opened** — Archive downloaded and every region vertex read. SHA-256 84acbadd742107a8f2906c806bffafb9259d454ad8a3877a48b529d76ee29ee6. Published licence is ODbL; do not relabel this combined dataset as Licence Ouverte. |
| [ISO 3166-2:FR subdivision codes](https://www.iso.org/obp/ui/#iso:code:3166:FR) | ISO | Not confirmed | **not checked** — Only a JavaScript-required message was readable. Browser automation could not start. All ISO-style codes here, including proposed FR-20R for Corsica, remain unverified against ISO. |

| Source | Format | Région or département downloads | Download URL | Auvergne-Rhône-Alpes size | Checked |
|---|---|---|---|---|---|
| ADMIN EXPRESS | Shapefile in the catalogue | National product; regional delivery not confirmed | [download 1](https://geoservices.ign.fr/adminexpress#telechargement) | Not shown | **opened** |
| Contours administratifs 2026, regions, 5 m generalisation | GeoJSON; gzip | National region file; select features locally | [download 1](https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2026/geojson/regions-5m.geojson.gz) | No separate ARA download; national archive 8,696,324 bytes | **opened** |
| ISO 3166-2:FR subdivision codes | JavaScript application | Not applicable | Not resolved; see source page | Not applicable | **not checked** |

## Sources, layer by layer

### Nationwide

The replacements for the current US sources are:

| Layer (file) | US source today | Proposed for France | Checked |
|---|---|---|---|
| Terrain (`terrain.sqlite`) | USGS 3DEP | BD ALTI 25 m first; RGE ALTI 5 m or 1 m as alternatives, resampled for the existing terrain tiles | **opened** |
| Water (`water.sqlite`) | NHD | BD TOPAGE watercourses, water bodies and related surface layers | **opened** |
| Dams | NID | ROE barriers, with an explicit distinction between dams, weirs and other obstacles | **opened** |
| Crops (`crops.sqlite`) | USDA Cropland Data Layer | Anonymised RPG agricultural parcels; a crop-code mapping is still needed | **opened** |
| Buildings (`buildings.sqlite`) | Microsoft footprints, OSM heights | BD TOPO footprints and height attributes | **opened** |
| Places (`places.sqlite`) | GNIS, Census gazetteers, OSM | BD TOPO named places, INSEE commune names and codes, La Poste postcodes, OSM named places | **opened** |
| Addresses (`addresses/<code>.sqlite`) | Overture addresses | BAN département exports, assembled for each map | **opened** |
| Roads, base map and ordinary `poi` rows | OSM | OSM France extracts from Geofabrik | **opened** |

The following register gives the publisher, licence and precise extent of each check.

| Source | Publisher | Licence | Checked |
|---|---|---|---|
| [RGE ALTI, 1 m and 5 m](https://www.data.gouv.fr/datasets/rge-alti-r) | IGN | etalab-2.0 | **opened** — Bare-earth terrain. Catalogue says source updating stopped in 2024 pending a new elevation reference. All twelve département edition feeds read; selected editions range from 2020 to 2023. Total excludes checksum sidecars and neighbouring areas needed for the margin. |
| [BD ALTI, 25 m and 75 m](https://www.data.gouv.fr/datasets/bd-alti-r-1) | IGN | etalab-2.0 | **opened** — Proposed first terrain input because 25 m is close to the existing US 1 arc-second input. All twelve département edition feeds read; total excludes checksum sidecars and neighbouring areas needed for the margin. |
| [BD TOPAGE, Métropole 2026](https://www.data.gouv.fr/datasets/bd-topage-r-metropole-2026) | IGN / OFB; Sandre distribution | etalab-2.0 | **opened** — Sandre announcement and publisher catalogue resources read. Includes watercourses, water bodies and catchments. Listed download URLs were read from metadata; bulk archives were not downloaded. |
| [Ouvrages faisant obstacle à l’écoulement (ROE / OBS)](https://www.data.gouv.fr/datasets/ouvrages-faisant-obstacle-a-lecoulement-obs) | OFB; Sandre distribution | etalab-2.0 | **opened** — Publisher metadata lists active and frozen exports separately. A barrier register is not a dam safety or storage-capacity inventory. An old obs_FXX service URL returned 404; the current catalogue points to geo/obs. |
| [RPG 2025, anonymised agricultural parcels](https://www.data.gouv.fr/datasets/rpg) | ASP / IGN / Ministry of Agriculture | etalab-2.0 | **opened** — IGN feed and Ministry announcement read. Edition in feed: 2025-01-01; publication in 2026. Covers declared agricultural parcels, not a complete land-cover raster. Crop-code mapping was not checked. |
| [BD TOPO 3.5, buildings and named places](https://www.data.gouv.fr/datasets/bd-topo-r) | IGN | etalab-2.0 | **opened** — Catalogue explicitly includes building heights and named places. Archive is all themes, not buildings alone. Height completeness and meaning of each height field were not checked. |
| [Code officiel géographique, 1 January 2026](https://www.insee.fr/fr/information/8740222) | INSEE | etalab-2.0 | **opened** — Code/name and parent-area tables, not coordinate points. INSEE terms explicitly name Licence Ouverte 2.0. Join to boundary or BAN geometry. |
| [Base officielle des codes postaux](https://data.laposte.fr/datasets/laposte-hexasmal) | La Poste | etalab-2.0 | **opened** — Own page and publisher data.gouv.fr metadata opened. Maps postcodes to communes; postcode boundaries are explicitly not supplied as open data. The portal’s 460 Mo display is not the raw CSV size. |
| [Base Adresse Nationale (BAN)](https://www.data.gouv.fr/datasets/base-adresse-nationale) | IGN / DINUM; commune address authorities | etalab-2.0 | **opened** — Department labels read on 2026-11-17: 01 9.13 MB; 03 6.81; 07 6.95; 15 3.46; 26 8.87; 38 15.54; 42 9.71; 43 5.43; 63 12.38; 69 12.58; 73 6.90; 74 10.73. Not an exact byte total or an installed-index estimate. |
| [OpenStreetMap France extracts](https://download.geofabrik.de/europe/france.html) | OpenStreetMap contributors / Geofabrik | ODbL-1.0 | **opened** — Two older-region extracts would need merging and deduplication, then cutting to the proposed box. Their combined extent was not compared with the padded box. National PBF is an alternative; parent page says 4.8 GB. |

### Download units and sizes

IGN’s old product URLs redirect to a JavaScript catalogue. The publisher’s Atom download service was readable with a
standard browser user agent. Queries such as `resource/BDTOPO?zone=R84&limit=50` list editions; the linked edition feed
lists binary URLs and `gpf_dl:length` in bytes. The selected regional BD TOPO and RPG feeds each listed one archive.
The short terrain links below are **D063 examples**. The JSON also lists all twelve ARA terrain archives and their
individual edition-feed URLs; the totals exclude neighbouring areas required for the padded box.

| Source | Format | Région or département downloads | Download URL | Auvergne-Rhône-Alpes size | Checked |
|---|---|---|---|---|---|
| RGE ALTI, 1 m and 5 m | ASCII grid; 1 m TIFF also listed for D063; 7z archives | By département; combine and clip locally | [download 1](https://data.geopf.fr/telechargement/resource/RGEALTI?zone=D063&limit=50); [download 2](https://data.geopf.fr/telechargement/download/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D063_2021-01-22/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D063_2021-01-22.7z) | 5,530,775,007 bytes (twelve 5 m ASCII archives; administrative ARA only) | **opened** |
| BD ALTI, 25 m and 75 m | ASCII grid in 7z (25 m D063 feed read) | By département for the checked 25 m delivery | [download 1](https://data.geopf.fr/telechargement/resource/BDALTI?zone=D063&limit=50); [download 2](https://data.geopf.fr/telechargement/download/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D063_2021-01-22/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D063_2021-01-22.7z) | 504,640,761 bytes (twelve 25 m ASCII archives; administrative ARA only) | **opened** |
| BD TOPAGE, Métropole 2026 | ZIP Shapefile; individual layers also GeoPackage and GeoJSON | Metropolitan bulk files; no région or département archive confirmed | [download 1](https://services.sandre.eaufrance.fr/telechargement/geo/ETH/BDTopage/2026/BD_Topage_FXX_2026-shp.zip); [download 2](https://services.sandre.eaufrance.fr/telechargement/geo/ETH/BDTopage/2026/PlanEau/PlanEau_FXX-gpkg.zip) | Not shown | **opened** |
| Ouvrages faisant obstacle à l’écoulement (ROE / OBS) | WFS export: GeoPackage or zipped Shapefile | National export; no pre-cut région or département archive confirmed | [download 1](https://services.sandre.eaufrance.fr/geo/obs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typename=ObstEcoul&SRSNAME=EPSG:4326&OUTPUTFORMAT=GPKG) | Not shown | **opened** |
| RPG 2025, anonymised agricultural parcels | GeoPackage in 7z for R84, RPG delivery version 4.0 | France and région files; département archive not confirmed | [download 1](https://data.geopf.fr/telechargement/resource/RPG?zone=R84&limit=50); [download 2](https://data.geopf.fr/telechargement/download/RPG/RPG_4-0__GPKG_LAMB93_R84_2025-01-01/RPG_4-0__GPKG_LAMB93_R84_2025-01-01.7z) | 1,704,509,678 bytes (R84 2025 archive) | **opened** |
| BD TOPO 3.5, buildings and named places | GeoPackage or Shapefile; 7z archive checked for R84 | Région and département deliveries; national alternatives in catalogue | [download 1](https://data.geopf.fr/telechargement/resource/BDTOPO?zone=R84&limit=50); [download 2](https://data.geopf.fr/telechargement/download/BDTOPO/BDTOPO_3-5_TOUSTHEMES_GPKG_LAMB93_R84_2026-09-15/BDTOPO_3-5_TOUSTHEMES_GPKG_LAMB93_R84_2026-09-15.7z) | 3,496,077,209 bytes (R84 all themes, GeoPackage) | **opened** |
| Code officiel géographique, 1 January 2026 | UTF-8 CSV; dBase; ZIP bundle | National tables with REG and DEP fields; filter locally | [download 1](https://www.insee.fr/fr/statistiques/fichier/8740222/v_commune_2026.csv); [download 2](https://www.insee.fr/fr/statistiques/fichier/8740222/v_region_2026.csv); [download 3](https://www.insee.fr/fr/statistiques/fichier/8740222/v_departement_2026.csv) | Not shown; national commune CSV advertised as 3 Mo | **opened** |
| Base officielle des codes postaux | CSV; alternative CSV with commune centroids | National table; filter through commune codes locally | [download 1](https://data.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/raw); [download 2](https://data.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/metadata-attachments/base-officielle-codes-postaux.csv) | Not shown; raw national CSV metadata 1,555,485 bytes | **opened** |
| Base Adresse Nationale (BAN) | CSV.gz; Addok and BAL alternatives in catalogue | National and département CSVs; no région CSV in checked directory | [download 1](https://adresse.data.gouv.fr/data/ban/adresses/latest/csv); [download 2](https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-63.csv.gz) | About 108.49 MB, sum of twelve rounded directory labels | **opened** |
| OpenStreetMap France extracts | OSM PBF; regional GeoPackage links also listed | Older régions, not the present thirteen; no département split listed | [download 1](https://download.geofabrik.de/europe/france/auvergne-latest.osm.pbf); [download 2](https://download.geofabrik.de/europe/france/rhone-alpes-latest.osm.pbf) | Auvergne 149 MB + Rhône-Alpes 508 MB (rounded page labels) | **opened** |

Notes:

- **Terrain.** BD ALTI 25 m is a more modest first input than RGE ALTI 1 m and is close to the existing US 1 arc-second
  input. The catalogue describes both as ground models. RGE ALTI’s source updates stopped in 2024 according to the current
  record; a recently edited catalogue page does not make every terrain tile recent. A slower metadata pass completed
  the twelve-département totals after an initial HTTP 429 response. The 25 m ASCII archives total 504,640,761 bytes;
  the 5 m ASCII alternative totals 5,530,775,007 bytes. These are sums of archive lengths in the edition feeds, excluding
  `.md5` sidecars, not installed sizes or the extra sources needed around the region’s margin. No 1 m ARA total was read.
- **Water.** BD TOPAGE provides a hydrographic reference, while ROE describes artificial barriers. Neither check proves
  that the US dam attributes, capacities or emergency information have French equivalents. The obsolete `geo/obs_FXX`
  endpoint returned 404; use the current `geo/obs` URL recorded above. National files would need local spatial filtering.
- **Crops.** RPG records declared parcels, so missing land must remain unknown rather than being called uncultivated.
  It is vector data, while the existing crop builder reads a US raster. The 2025 delivery is now available as GeoPackage.
  Its crop tables and their mapping to orchards, vineyards and berries were not read.
- **Buildings.** IGN explicitly states that BD TOPO contains building heights. That is a useful input, but not proof
  that every building has a usable height. The 3.50 GB archive is for all themes. No building-only size, field-level
  check or comparison with US coverage was made.
- **Places.** INSEE’s commune list provides codes and names rather than place coordinates. La Poste maps postcodes to
  communes; it explicitly does not publish postcode boundaries as open data. Join by commune code and preserve
  many-to-many postcode relationships. Do not infer all administrative membership from postcode prefixes.
- **OSM.** Geofabrik lists Auvergne and Rhône-Alpes separately, using the older régions. Their labels total about
  657 MB, but that is neither one modern-region file nor proof of coverage of the padded ARA box. Merge and deduplicate
  shared OSM objects, check the `.poly` coverage, or cut from the metropolitan France extract.
- **BAN.** The twelve ARA département files are `01`, `03`, `07`, `15`, `26`, `38`, `42`, `43`, `63`, `69`, `73`, `74`.
  The sum of their rounded directory labels is about 108.49 MB on this date. Each file’s URL is the CSV directory plus
  `adresses-<département>.csv.gz`. This is download size, not SQLite index size. For the 0.15° margin, neighbouring
  département files may also be needed. Handle commune codes and parent areas through the matching INSEE vintage.

### Auvergne-Rhône-Alpes terrain

Both products offer the selected département editions below. Sizes are compressed archive bytes from IGN’s edition
feeds (opened), not a recomputation from the terrain grids. Each JSON archive entry retains its binary URL and metadata
URL. The dates differ between départements, so the regional mosaic is not one survey date.

| Département | Edition date | BD ALTI 25 m ASCII bytes | RGE ALTI 5 m ASCII bytes | Source | Checked |
|---|---|---|---|---|---|
| 01 | 2023-08-08 | 44,028,107 | 465,249,019 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D001_2023-08-08), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D001_2023-08-08) | **opened** |
| 03 | 2023-08-10 | 41,420,952 | 373,807,760 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D003_2023-08-10), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D003_2023-08-10) | **opened** |
| 07 | 2022-12-16 | 41,960,967 | 552,404,759 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D007_2022-12-16), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D007_2022-12-16) | **opened** |
| 15 | 2022-09-29 | 48,150,540 | 577,763,911 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D015_2022-09-29), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D015_2022-09-29) | **opened** |
| 26 | 2022-12-16 | 51,670,671 | 635,868,902 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D026_2022-12-16), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D026_2022-12-16) | **opened** |
| 38 | 2020-11-13 | 50,536,882 | 505,357,331 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D038_2020-11-13), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D038_2020-11-13) | **opened** |
| 42 | 2023-08-10 | 42,424,463 | 433,958,725 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D042_2023-08-10), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D042_2023-08-10) | **opened** |
| 43 | 2022-10-03 | 45,474,296 | 524,383,720 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D043_2022-10-03), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D043_2022-10-03) | **opened** |
| 63 | 2021-01-22 | 39,172,254 | 408,633,572 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D063_2021-01-22), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D063_2021-01-22) | **opened** |
| 69 | 2023-08-10 | 30,722,066 | 276,183,196 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D069_2023-08-10), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D069_2023-08-10) | **opened** |
| 73 | 2020-10-15 | 38,395,316 | 447,919,250 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D073_2020-10-15), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D073_2020-10-15) | **opened** |
| 74 | 2020-10-15 | 30,684,247 | 329,244,862 | [BD ALTI feed](https://data.geopf.fr/telechargement/resource/BDALTI/BDALTIV2_2-0_25M_ASC_LAMB93-IGN69_D074_2020-10-15), [RGE ALTI feed](https://data.geopf.fr/telechargement/resource/RGEALTI/RGEALTI_2-0_5M_ASC_LAMB93-IGN69_D074_2020-10-15) | **opened** |
| Total | Mixed editions | 504,640,761 | 5,530,775,007 | Sum of the twelve archives above | **opened** metadata; totals calculated |

## Help points

The health and defibrillator sources could add public help locations. Géorisques would add context about risks and
administrative procedures, rather than another class of help point.

| Source | Publisher | Licence | Checked |
|---|---|---|---|
| [FINESS Extraction du Fichier des établissements (legacy)](https://www.data.gouv.fr/datasets/finess-extraction-du-fichier-des-etablissements) | Ministry of Health / ANS / Atlasanté | etalab-2.0 | **opened** — Legacy page opened: data stopped at 2026-05-04 after FINESS+ launch on 2026-07-20. Current binary URLs were not resolved. Geocodes can be street, locality or commune-level, not necessarily the establishment entrance. |
| [FINESS structures, new daily feed](https://www.data.gouv.fr/datasets/finess-structures-1) | Agence du Numérique en Santé | etalab-2.0 | **opened** — Publisher metadata read via data.gouv.fr API after HTML fetch timed out. Includes closed structures: retain active geographic establishments, not legal entities. Current coordinate schema and emergency-service categories not checked. |
| [Géo’DAE, public national defibrillator register](https://www.data.gouv.fr/datasets/geodae-base-nationale-des-defibrillateurs) | Atlasanté / Ministry of Health | etalab-2.0 | **opened** — Only public operator-declared data is exported. Field-level access hours, status and completeness were not inspected. |
| [Géorisques: GASPAR, ground movements, risk layers](https://www.georisques.gouv.fr/donnees/bases-de-donnees) | Ministry of Ecological Transition / BRGM | Licence Ouverte (version not specified on legal page) | **opened** — Dataset pages opened, but download selectors displayed a loading error; no working archive URL resolved. Legal page applies Licence Ouverte to downloads with exceptions for third-party-owned information. Contextual risk records, not help points. |

| Source | Format | Région or département downloads | Download URL | Auvergne-Rhône-Alpes size | Checked |
|---|---|---|---|---|---|
| FINESS Extraction du Fichier des établissements (legacy) | CSV; legacy archive | National files; no région or département file confirmed | Not resolved; see source page | Not shown; national CSVs advertised as 45.7 Mo and 34.1 Mo | **opened** |
| FINESS structures, new daily feed | JSON.gz | National daily file; filter locally; pre-cut area files not listed | [download 1](https://static.data.gouv.fr/resources/finess-structures-1/20261117-032250/finess-structures-journalier-20261117.json.gz) | No ARA file; national daily archive 51,897,398 bytes | **opened** |
| Géo’DAE, public national defibrillator register | CSV; JSON | National public exports; filter locally; area archives not listed | [download 1](https://static.data.gouv.fr/resources/geodae-base-nationale-des-defibrillateurs/20261117-140021/geodae.csv); [download 2](https://static.data.gouv.fr/resources/geodae-base-nationale-des-defibrillateurs/20261117-140156/geodae.json) | No ARA file; national CSV 80,714,753 bytes; JSON 220,392,433 bytes | **opened** |
| Géorisques: GASPAR, ground movements, risk layers | GASPAR delimited UTF-8 text; RGA 2026 Shapefile | RGA explicitly by département; GASPAR and movement pages show regional/département selectors, which failed to load | Not resolved; see source page | Not shown | **opened** |

- **FINESS.** Use the new ANS feed as the candidate source. The familiar legacy CSV page says updates stopped at
  4 May 2026. The new structure feed includes closed entries and legal entities as well as geographic establishments;
  it needs filtering before creating pins. Confirm hospital and pharmacy categories and coordinates in the current
  schema. A health establishment’s registration does not by itself mean it has an emergency department, is open now,
  or can receive a person during a crisis. The legacy geocoding notes include commune-level positions, so do not draw
  such a point as an exact entrance.
- **Géo’DAE.** Its public export is a candidate for defibrillator pins. Before building, inspect location, access and
  availability fields and preserve the observation date. A declared location does not establish that a device is
  accessible or working at the time of use. No operator contact names or private records are needed in this proposal.
- **Géorisques.** [GASPAR](https://www.georisques.gouv.fr/donnees/bases-de-donnees/procedures-administratives-relatives-aux-risques)
  describes procedures, plans and information documents. The
  [ground-movement page](https://www.georisques.gouv.fr/donnees/bases-de-donnees/base-de-donnees-mouvements-de-terrain)
  describes recorded events. The
  [2026 clay-exposure page](https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles-version-2026)
  explicitly offers département Shapefiles. All three pages were opened, but their download selectors displayed a
  loading error. GASPAR also explains seismic zones; a separate working seismic-zone file was not obtained. These
  sources do not provide live warnings or a safe-route calculation. The build must obtain static files; the app must
  continue to work offline.

## Licence notes and attribution

- **Licence Ouverte 2.0.** The
  [licence text](https://www.data.gouv.fr/pages/legal/licences/etalab-2-0) was opened. It permits copying, modification
  and redistribution, including commercial use, with the source name (at least the licensor) and the reused data’s
  last-update date. Do not imply publisher endorsement or mislead about source, date or content. A build should retain
  a notice for each dataset, edition and publisher, for example “Source: IGN, BD TOPO, edition 2026-09-15; extracted
  and converted for Lastbook.” Link the licence and say what was changed. INSEE’s
  [terms](https://www.insee.fr/fr/information/2008466), opened, ask for “Source : Insee” and the known update date.
- **ODbL.** The [licence](https://opendatacommons.org/licenses/odbl/1-0/) was opened. Keep licence and attribution
  notices, credit “© OpenStreetMap contributors” for OSM, and offer a publicly used derivative database under ODbL,
  with the required access to that database or its alterations. The data.gouv.fr contours record also names ODbL;
  retain its publisher and underlying-source credit. ODbL applies to database rights, not to the app’s source code.
  Keep source provenance when combining data; the final database arrangement needs review before distribution.
- **Unconfirmed terms.** Géorisques’ [legal page](https://www.georisques.gouv.fr/mentions-legales), opened, names
  Licence Ouverte for downloadable data but does not state its version and excepts information owned by third parties.
  The SGDSN PDF and Kiwix archives have not had their reuse notices read. Do not infer a PDF’s licence from its being
  on a government site, or a ZIM’s licence from its file format.

These notices would belong wherever the map already credits its sources, and in `THIRD_PARTY_NOTICES.md` if that is
where the maintainers keep data licences. This proposal adds no shipped notice or dependency.

## How addresses are written

- **Order.** Number, optional suffix, street type and name, then the five-digit postcode and locality. French street
  types include *rue*, *avenue*, *boulevard*, *chemin*, *impasse*, *place*, *allée* and *route*. A named locality may
  need handling without a numbered street.
- **Suffixes.** Preserve *bis*, *ter* and letters with the house number; they are part of the address identity.
  [La Poste’s abbreviation list](https://www.laposte.fr/envoyer/abreviation-adresses-postales), opened, includes BIS.
- **Postcodes.** Store all five digits as text, including leading zeroes. A postcode is not an INSEE commune code.
  CEDEX labels also occur, as in IGN’s published address below.
- **Postal presentation and search.** La Poste’s
  [address guide](https://www.laposte.fr/conseils-pratiques/bien-rediger-l-adresse-d-une-lettre-ou-d-un-colis), opened,
  recommends ordered lines, no punctuation and uppercase final lines for mail. Search should also accept the accents,
  apostrophes and punctuation that institutions publish, while keeping the original address for display.

### What the existing normaliser does

The following five real addresses are public institutional premises, not homes. Their publisher pages were opened.
The strings were passed to the repository’s actual `engine.address_search.normalize()` with `python3 -B`; the code was
not copied into a substitute normaliser and was not changed. Commas below join address lines for the test.

| Public address entered | `normalize()` returned | Publisher page |
|---|---|---|
| 73 avenue de Paris, 94165 Saint-Mandé Cedex | `73 ave de paris 94165 st mand cedex` | [IGN (opened)](https://www.ign.fr/institut/toutes-nos-adresses) |
| 12 rue de l’École de Médecine, 75006 Paris | `12 rue de l cole de m decine 75006 paris` | [Université Paris Cité (opened)](https://u-paris.fr/siege-de-luniversite-un-symbole-universitaire-au-coeur-de-paris/) |
| 100 bis rue d’Assas, 75006 Paris | `100 bis rue d assas 75006 paris` | [Paris Musées (opened)](https://www.zadkine.paris.fr/votre-visite/informations-pratiques) |
| 1 place du Trocadéro et du 11 novembre, 75116 Paris | `1 pl du trocad ro et du 11 novembre 75116 paris` | [Cité de l’architecture et du patrimoine (opened)](https://citedelarchitecture.fr/fr/informations-pratiques) |
| 2 rue de la Légion-d'Honneur, 75007 Paris | `2 rue de la l gion d honneur 75007 paris` | [La grande chancellerie (opened)](https://www.legiondhonneur.fr/fr/page/le-musee) |

What breaks, and what does not:

- Accented letters are removed rather than folded: `École` becomes `cole`, `Médecine` becomes `m decine`, and
  `Saint-Mandé` becomes `st mand`. Accented and accentless queries therefore produce different keys. Identically
  damaged input and stored data may still match; this is not an end-to-end search test.
- Straight and curly apostrophes, hyphens and commas become spaces. Both apostrophe forms yield the same split tokens,
  but attached and spaced variants such as `d’Assas` and `dAssas` do not produce the same key.
- `bis` survives `normalize()` unchanged. Calling `_parts()` on the third address yields number `100`, with `bis`
  among the street words, rather than treating `100 bis` as one house number. The current exact-number lookup needs a
  policy for BAN suffixes.
- In all five `_parts()` calls, `postcode` is empty: it only extracts five digits when they are the last token, while
  these French addresses put the town after the postcode. All five pass `is_address_query()` because they start with
  a number. A numberless *lieu-dit* would not use that address-query route.
- Digits themselves survive, including leading zeroes. Some US word substitutions already apply: `avenue` becomes
  `ave`, `place` becomes `pl`, and `saint` becomes `st`. French abbreviations need an explicit, consistent policy in
  both the builder and reader; preserving a word is not the same as understanding its variants.

`tools/build_addresses.py` currently filters to `country = 'US'` and reads Overture rather than BAN. A BAN importer and
matching number/street normalisation would be new work. The reader scans installed `*.sqlite` files; French region
routing and metadata still need design. No French address index was built or queried in this check.

To re-run the five exact normalisation and parsing checks from the repository root, using the recorded public strings:

```bash
python3 -B - <<'PYTEST'
import json
from engine.address_search import normalize, _parts
p = json.load(open('docs/regions-fr-proposed.json'))
for t in p['addressing']['tests']:
    assert normalize(t['input']) == t['normalized']
    assert list(_parts(t['input'])) == list(t['parts'].values())
    print(t['input'], '=>', normalize(t['input']), _parts(t['input']))
PYTEST
```

## Related French guides and library sources

Part B of the draft is recorded here so its unchecked sources are not mistaken for map work already done. It does not
propose translated guide cards, a library pack, an interface translation or an AI model change in this patch.

| Source | Publisher | Licence | Checked |
|---|---|---|---|
| [Emergency and listening numbers, F33954](https://www.service-public.gouv.fr/particuliers/vosdroits/F33954) | Service Public / DILA | Not confirmed | **opened** — Page verified by publisher on 2026-08-25. Read 112, 15, 17, 18, 114 including SMS when unable to speak, 115, 119 and 196. The checked page did not contain 3114. Content reuse terms not checked. |
| [3114, national suicide prevention number](https://sante.gouv.fr/prevention-en-sante/sante-mentale/promotion-et-prevention/la-prevention-du-suicide/article/le-numero-national-de-prevention-du-suicide) | Ministry of Health | Not confirmed | **search only** — Publisher search result names 3114; opening the page reached a human-verification challenge. Not confirmed on the Service Public page read. |
| [Tous responsables](https://www.sgdsn.gouv.fr/publications/guide-tous-responsables) | SGDSN | Not confirmed | **search only** — Publisher search result dates publication 2025-11-20 and advertises a PDF of 13,666.4 KB. Page and candidate PDF URL reached a cookie/JavaScript security wall; this URL did not yield a readable PDF. Page count, page references and reuse licence not confirmed. |
| [French Wikipedia, medicine selection, Wikivoyage and Wiktionary ZIMs](https://download.kiwix.org/zim/) | Kiwix | Not confirmed | **opened** — Publisher directories read: Wikipedia maxi 52G, nopic 12G; medicine maxi 824M; Wikivoyage maxi 237M; Wiktionary nopic 4.6G. These are directory labels, not exact byte counts. ZIMs, embedded notices and the French WikiMed app were not opened; content licences not checked. |
| [FR-Alert](https://www.fr-alert.gouv.fr/) | Ministry of the Interior | Not confirmed | **not checked** — Opening the official site timed out. No alert-system detail, download or reuse terms confirmed. |

| Source | Format | Région or département downloads | Download URL | Auvergne-Rhône-Alpes size | Checked |
|---|---|---|---|---|---|
| Emergency and listening numbers, F33954 | HTML | National guidance; no area split | [download 1](https://www.service-public.gouv.fr/particuliers/vosdroits/F33954) | Not applicable | **opened** |
| 3114, national suicide prevention number | HTML | National guidance; no area split | Not resolved; see source page | Not applicable | **search only** |
| Tous responsables | PDF advertised; contents unread | National guide; no area split | [download 1](https://www.sgdsn.gouv.fr/files/files/Publications/Guide_Tous%20responsables.pdf) | Not applicable | **search only** |
| French Wikipedia, medicine selection, Wikivoyage and Wiktionary ZIMs | ZIM | By language and project; no région or département split | [download 1](https://download.kiwix.org/zim/wikipedia/wikipedia_fr_all_maxi_2026-05.zim); [download 2](https://download.kiwix.org/zim/wikipedia/wikipedia_fr_medicine_maxi_2026-10.zim); [download 3](https://download.kiwix.org/zim/wikivoyage/wikivoyage_fr_all_maxi_2026-10.zim); [download 4](https://download.kiwix.org/zim/wiktionary/wiktionary_fr_all_nopic_2026-08.zim) | Not applicable | **opened** |
| FR-Alert | Not confirmed | Not confirmed | Not resolved; see source page | Not applicable | **not checked** |

The opened Service Public page supports 112 for European emergency calls, 15 for medical help, 17 for police, 18 for
fire and rescue, and 114 for accessible emergency communication, including SMS when someone cannot speak aloud. It also
lists 115 for people without shelter, 119 for children in danger, and 196 for sea rescue; it advises VHF channel 16 at
sea and 196 or 112 from the coast. These are source notes for later guide work, not new advice cards. The page did not
contain 3114, so that number remains a separate search-only check here. Poison-centre numbers were not collected.

The SGDSN search result dates *Tous responsables* to 20 November 2025, but the page and candidate PDF returned a
security screen. The draft’s 26-page count and any proposed page citations remain unconfirmed. The opened Kiwix
directories do establish French ZIM downloads, and their size labels change the draft’s Wikipedia estimate: the listed
May 2026 maxi file is 52G, with a 12G nopic alternative. No SSD capacity promise follows from these labels.

## Still undecided

1. **Region identifiers and setup.** Confirm the proposed codes against ISO, including Corsica, and agree how the
   thirteen regions and any later département fallback appear in setup and manifests.
2. **The box rule.** Accept the official derived boundary source, its ODbL notice and the 0.15° margin. Decide whether
   address indexes also include neighbouring areas inside that margin.
3. **First ARA build.** Choose BD ALTI 25 m or a finer input, acquire matching vintages, implement the required readers,
   and measure finished map and index sizes. The BD TOPO and RPG archives alone exceed 5.2 billion bytes compressed;
   they include themes the map may not use. This is not a prediction of the installed map size.
4. **Addresses.** Agree accent folding, apostrophes, suffixes, CEDEX, French abbreviations and postcode/locality parsing
   before importing BAN. Keep original labels and commune codes.
5. **Layer meaning.** Map RPG crop codes, validate BD TOPO height fields and ROE barrier kinds, and decide which FINESS
   categories and DAE accessibility fields belong in offline help layers. Keep Géorisques context separate from help pins.
6. **Library material.** Open the SGDSN guide and its reuse terms, verify all numbers for eventual guide cards, read ZIM
   notices, and determine library size from selected files before choosing a drive capacity.

## What was checked, and what was not

Opened: the 18 entries marked **opened** in the source register, including publisher catalogue records, IGN edition
feeds, Sandre metadata, INSEE terms, La Poste pages, BAN and Kiwix directories, and the main Service Public numbers page.
The 2026 boundary archive was downloaded and its thirteen metropolitan extrema calculated. Five public addresses were
run through the actual `normalize()` and `_parts()` functions. The JSON is a proposal and has no runtime consumer.

The two **search only** entries are the SGDSN guide and the Ministry of Health’s 3114 page; both reached security screens
when opened. The two **not checked** entries are ISO’s JavaScript-only code list and the FR-Alert site, which timed out.
The browser could not start, and no interactive publisher portal was tested.

Still missing: a 1 m ARA terrain total, working Géorisques binary links and sizes, ISO verification,
SGDSN PDF contents and licence, current FINESS coordinate/category validation, DAE field checks, RPG crop mappings,
building-height completeness, coverage of the padded boxes, and Kiwix content licences. Bulk map archives were not opened,
no new importer or map was built, no installed pack size was measured, and no end-to-end French address search was run.
The proposal and its source interpretations still need the separate maintainer review.
