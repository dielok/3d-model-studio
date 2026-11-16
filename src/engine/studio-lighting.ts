import * as THREE from 'three';

/**
 * Low, warm afternoon light for comparing the model to the Hackeburg concept art.
 *
 * World coordinates: +Z = building front/street, +Y = up.
 * The sun is behind the building (-Z), left in the front view (-X),
 * and low relative to its horizontal distance.
 */
export const STUDIO_SUN_POSITION = [-8, 5, -6] as const;

export function createStudioLighting() {
  const ambient = new THREE.HemisphereLight('#d9c7b8', '#5e5a56', 0.65);
  const sun = new THREE.DirectionalLight('#ffe1b3', 3.0);
  sun.position.set(...STUDIO_SUN_POSITION);
  sun.target.position.set(0, 1.2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 35;
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.02;
  return {ambient, sun};
}
