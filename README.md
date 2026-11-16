# Hackeburg Model Studio 0.3

Parametrischer Fassaden-/Gebäudeprojektor. React + TypeScript + SCSS + Three.js + Vite.

## Start

Voraussetzung: Node.js 20.19+ oder Node.js 22.12+ und npm.

```bash
npm install
npm run dev
```

Dann die angezeigte lokale URL öffnen (normalerweise http://localhost:5173/).

```bash
npm run build
npm test
```

> Der bereitgestellte ZIP-Download enthält **Quellcode, aber keine `node_modules`**. Für die Installation werden npm-Pakete benötigt.

## Bedienung

1. Das v3-Eingangsmodul wird aus `public/models/ground-floor-entrance-lod0.yaml` geladen. Die Vorlage basiert auf der zuvor erarbeiteten v2-YAML; die beiden Pfeiler sind zur Straße hin nach vorne versetzt (z = +0,18 m).
2. Unter **YAML öffnen** eigene Modelle im Schema `hackeburg.model.v1` laden. Oder im rechten YAML-Editor ändern und **Änderungen übernehmen** auswählen.
3. Front (XY), Seite (ZY), Draufsicht (XZ) oder 3D wählen.
4. Auf ein Bauteil klicken, um seine ID und die Komponente in der Liste zu markieren.
5. SVG für die aktuelle orthografische Ansicht exportieren; Three.js-Modul für das Modell exportieren.

## Architektur

```text
YAML-Datei
  │
  ▼
parseModel (Schema-Checks)
  │
  ▼
resolveModel (neutrale Solid[]-IR)
  ├── ProjectionSVG → SVG-Datei
  ├── createThreeGroup → WebGL-Vorschau
  └── threeCode → standalone JavaScript-ES-Modul
```

`src/engine/three-runtime.js` wird sowohl für die Live-Vorschau importiert als auch **wortwörtlich** in den generierten JavaScript-Code übernommen. Der Codeexport nutzt dadurch dieselben Geometrieoperationen wie die Vorschau (kein separat nachimplementierter Exporter).

Das exportierte Modul benötigt `three`:

```js
import * as THREE from 'three';
import { createModel } from './historic_ground_floor_entrance.js';

const scene = new THREE.Scene();
scene.add(createModel());
```

## Geometrie und Koordinaten

- X = rechts, Y = oben, Z = Richtung Straße.
- Maße in Metern.
- `box`-Positionen sind Mittelpunkte; `sectioned_pillar`-Positionen sind untere Mittelpunkte.
- 4 × 4 m ist **nur das horizontale Weltraster**; die Erdgeschosshöhe ist unabhängig.
- Unterstützte YAML-Formen: `box`, `sectioned_pillar`, `instance_of`, `extruded_arch_ring`, `arched_keystone`, `rectangular_frame`, `double_swing_door`, `semicircular_glazing`, `sphere`, `group`. `arched_opening` wird als Aussparungs-Metadatum erkannt, aber noch nicht boolean-subtrahiert.
- `materials` unterstützen Basisfarben, Standard/Physical, grobe PBR-Werte und Emission. Benannte `normal_map`-Assets werden noch **nicht** automatisch geladen.
- Der Prototyp zeigt einen freistehenden Modul-Ausschnitt, keine vollständige hintere Fassadenwand. Der `host_ground_floor_shell`-Ausschnitt ist Aufgabe des späteren Gebäude-Assemblers.

## Bekannte Grenzen

- SVG-Seite und -Draufsicht sind einfache orthografische **Hüllprojektionen**, ohne vollständige verdeckte-Kanten-Berechnung oder Schnitte.
- Komplexe externe YAML-Primitive geben Warnungen aus und werden übersprungen. Es handelt sich nicht um einen universellen CAD- oder Blender-Projektor.
- Höhenregler: Für die bisherige v2-Eingangs-YAML werden obere Teile nach festgelegten Schwellen verschoben. Diese Legacy-Regel ist **noch keine vollständig generische Parametrisierung** beliebiger Modelle.
- WebGL, Transmissionsmaterialien und Schatten benötigen eine GPU/Browser mit WebGL-Unterstützung.
- Für eine spätere große Stadt: Geometrie-Instancing, LOD, Textur-Atlas, CSG-Aussparungen und echte Bauwerksanschlusslogik ergänzen.

## Projektstruktur

```text
src/
  App.tsx                        UI / YAML-Editor / Export
  components/ProjectionSVG.tsx   SVG-Projektor
  components/ThreeViewport.tsx   Three.js + OrbitControls
  engine/validate.ts            YAML Parser + Validator
  engine/resolve.ts             Gemeinsame Geometrie-IR
  engine/three-runtime.js       3D-Modellbau (auch im Export)
  engine/exporters.ts           SVG/Text/Three-Code Download
  styles/main.scss              Oberfläche
  types/model.ts                Typen / YAML-Schema
public/models/                   Beispielmodelle
tests/                           Vitest-Tests
```

### Round-arch cutouts

Use `shape: arched_opening`, `operation: subtract_from_wall` and `wall_id` to subtract the external semicircle of an arch from an existing `box` wall plate. The compiler turns the box into one `spandrel` shape with a continuous curved underside; both SVG and Three.js render the same contour. Currently supported when the arch spring line coincides with the target box bottom and the opening fits inside its width and height. External host-wall openings remain separate building-system responsibilities.

## Polygonale Bauteile und geneigte Dachflächen

Neue Formen im bestehenden `hackeburg.model.v1`:

- `polygon_prism`: `position`, `sides: 8`, `radius`, `height`, optional `rotation_y` in Grad. Achteckiger Kioskgrundkörper.
- `polygon_frustum`: `position`, `sides`, `bottom_radius`, `top_radius` (0 erlaubt), `height`, `rotation_y`. Polygonales geneigtes Dach mit echter Dachschräge.
- `mesh`: `position`, `vertices: [[x,y,z], ...]`, `faces: [[i,j,k], ...]` mit nullbasierten Indizes: beliebige triangulierte geneigte Flächen.
- `box` mit optionaler `rotation_y`: versetzte und radiale Glas- und Rahmenmodule.

`position` gibt den geometrischen Mittelpunkt an; +Y ist oben, +Z zur Straße. `rotation_y` ist in Grad. SVG und Three.js verwenden dieselben Vertex- und Face-Daten. Der Three.js-Codeexport übernimmt die Runtime und kann die neuen Formen ebenfalls darstellen.

### Demo

`public/models/octagonal-geometry-demo.yaml` im YAML-Editor importieren: achteckiger Korpus, geneigtes Dach, Laterne, Kugel und drei transparente Fassadenfelder.

Die orthografischen SVG-Projektionen verwenden die tatsächlichen Dreiecke, aber weiterhin nur eine einfache Tiefensortierung statt vollständiger CAD-Hidden-Line-Berechnung. Dies ist eine Geometrie-Testszene, **noch kein fertig ausgearbeitetes Kiosk-Asset**.

## PBR Texture maps in YAML

Materials support optional `textures.albedo`, `textures.normal`, `textures.roughness`, and `uv.repeat: [u, v]`. Example:

```yaml
materials:
  kiosk_green:
    type: standard
    color: '#ffffff' # multiplied with albedo (use white for unmodified texture colors)
    roughness: 0.8
    textures:
      albedo: textures/kiosk-green/color.svg
      normal: textures/kiosk-green/normal.svg
      roughness: textures/kiosk-green/roughness.svg
    uv:
      repeat: [1, 1]
```

Use local files in `public/textures/` (served by Vite at `/textures/`) or CORS-enabled https URLs. The three channels are optional; missing maps fall back to existing material values. Albedo uses sRGB; normal and roughness maps use no color-space conversion. Loaded textures are cached per scene/map/repeat combination and disposed when the preview unloads.

Every triangulated `mesh`, `polygon_prism`, `polygon_frustum`, and rotated box gets UV coordinates generated from physical coordinates (roof/ground projected on XZ, vertical walls projected onto the horizontal tangent and height). Ordinary box and extrusion shapes retain their Three.js-generated UVs. For roofs with arbitrary shapes this is a useful default, **not a full seam-aware unwrapping**. For the first iteration `uv.repeat` controls the map repetition; exact texel density can vary between native boxes and triangulated surfaces.

The exported Three.js function accepts optional `{assetBaseUrl:'/your-assets/'}` to locate relative files: `scene.add(createModel({assetBaseUrl:'/'}))`. The export is JavaScript and does not include texture image binaries; copy `public/textures` to your deployment or configure absolute URLs.

**Try it:** open `public/models/octagonal-textured-demo.yaml` in Model Studio. Its kiosk-green surface uses three locally included, simple generated SVG maps; replace these with CC0 PBR image maps once the pipeline is verified.

### Kiosk paving: Poly Haven cobblestone_pavement

The full kiosk model (`public/models/hackeburg_octagonal_newspaper_kiosk_colored_lod0.yaml`) now uses a tiled PBR material for `pavement_surface`. The 14 old geometrically modelled joint lines have been removed to avoid double joints. The existing `paving` material uses:

- `public/textures/cobblestone_pavement/color.jpg` (sRGB, 2K from the supplied diffuse JPG)
- `public/textures/cobblestone_pavement/normal.png` (linear, 2K converted from supplied OpenGL normal EXR)
- `public/textures/cobblestone_pavement/roughness.png` (linear, 2K converted from supplied roughness EXR)

**Important:** These image assets must be added to the repository's `public/textures/cobblestone_pavement/` directory before the material can render. They are *not* stored in this commit: the image conversions are delivered separately. The supplied displacement map is not connected (the current Studio material loader has no displacement support). `uv.repeat: [1,1]` maps the entire supplied cobblestone pattern once across the existing 3.98 m square box face; adjust after visual scale inspection. Missing assets will log warnings and the geometry remains visible.
