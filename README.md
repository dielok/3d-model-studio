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
