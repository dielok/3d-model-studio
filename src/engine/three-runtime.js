// Shared standalone Three.js runtime. Used verbatim by the editor AND exported model code.
import * as THREE from 'three';

/** @param {Array} solids @param {Record<string, object>} materialSpecs */
export function createThreeGroup(solids, materialSpecs) {
  const group = new THREE.Group();
  group.name = 'HackeburgFacadeModule';
  const cache = new Map();
  const material = (id) => {
    if (cache.has(id)) return cache.get(id);
    const spec = materialSpecs[id] || {};
    const params = {
      color: spec.color || '#b8b6ab',
      roughness: spec.roughness ?? 0.85,
      metalness: spec.metalness ?? 0,
      side: THREE.DoubleSide
    };
    let mat;
    if (spec.type === 'physical' || id === 'glass') {
      mat = new THREE.MeshPhysicalMaterial({ ...params,
        transmission: spec.transmission ?? 0.8,
        thickness: spec.thickness ?? 0.015,
        ior: spec.ior ?? 1.5,
        transparent: true,
        opacity: 0.77,
        depthWrite: false
      });
    } else {
      mat = new THREE.MeshStandardMaterial(params);
    }
    if(spec.emissive) {
      mat.emissive = new THREE.Color(spec.emissive);
      mat.emissiveIntensity = spec.emissive_intensity ?? 0.6;
    }
    cache.set(id, mat);
    return mat;
  };
  function append(object, part) {
    object.name = part.id;
    object.userData.partId = part.owner;
    object.castShadow = part.material !== 'glass';
    object.receiveShadow = true;
    group.add(object);
    return object;
  }
  function extruded(shape, depth) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24, steps: 1 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }
  for (const solid of solids) {
    const [x, y, z] = solid.position;
    const mat = material(solid.material);
    let geometry;
    if (solid.kind === 'box') {
      geometry = new THREE.BoxGeometry(...solid.size);
    } else if (solid.kind === 'sphere') {
      geometry = new THREE.SphereGeometry(solid.radius, 14, 10);
    } else if (solid.kind === 'arch') {
      const { ri, ro } = solid;
      const shape = new THREE.Shape();
      shape.moveTo(ro, 0);
      shape.absarc(0, 0, ro, 0, Math.PI, false);
      shape.lineTo(-ri, 0);
      shape.absarc(0, 0, ri, Math.PI, 0, true);
      shape.closePath();
      geometry = extruded(shape, solid.thickness);
    } else if (solid.kind === 'keystone') {
      const {ri, ro, wi, wo} = solid;
      const hi = Math.sqrt(Math.max(0, ri * ri - wi * wi));
      const ho = Math.sqrt(Math.max(0, ro * ro - wo * wo));
      const shape = new THREE.Shape();
      shape.moveTo(-wi, hi);
      shape.lineTo(-wo, ho);
      shape.quadraticCurveTo(0, ro, wo, ho);
      shape.lineTo(wi, hi);
      shape.quadraticCurveTo(0, ri, -wi, hi);
      shape.closePath();
      geometry = extruded(shape, solid.thickness);
    } else if (solid.kind === 'fanlight') {
      const r = solid.radius;
      const shape = new THREE.Shape();
      shape.moveTo(-r, 0);
      shape.absarc(0, 0, r, Math.PI, 0, true);
      shape.lineTo(-r, 0);
      geometry = extruded(shape, solid.thickness ?? .025);
    } else continue;
    const mesh = append(new THREE.Mesh(geometry, mat), solid);
    mesh.position.set(x, y, z);
    if (solid.kind === 'fanlight') {
      const count = Math.max(2, Math.round(solid.divisions ?? 5));
      const r = solid.radius;
      const frameMat = material('bronze');
      const segment = (x1, y1, x2, y2, radius, suffix) => {
        const a = new THREE.Vector3(x1, y1, z + .03), b = new THREE.Vector3(x2, y2, z + .03);
        const dir = b.clone().sub(a);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 6), frameMat);
        bar.position.copy(a).add(b).multiplyScalar(.5);
        bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        append(bar, { ...solid, id: `${solid.id}/${suffix}`, material: 'bronze' });
      };
      for (let i = 1; i < count; i++) {
        const angle = Math.PI * i / count;
        segment(0, 0, Math.cos(angle) * r, Math.sin(angle) * r, .017, `spoke${i}`);
      }
      for (let i = 0; i < 24; i++) {
        const a = Math.PI * i / 24, b = Math.PI * (i + 1) / 24;
        segment(Math.cos(a)*r,Math.sin(a)*r,Math.cos(b)*r,Math.sin(b)*r,.022,`rim${i}`);
      }
      segment(-r,0,r,0,.02,'sill');
    }
  }
  return group;
}
