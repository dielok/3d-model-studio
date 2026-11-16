import {describe,it,expect,vi,afterEach} from 'vitest';
import * as THREE from 'three';
import {parseModel} from '../src/engine/validate';
import {resolveModel} from '../src/engine/resolve';
import {createThreeGroup} from '../src/engine/three-runtime.js';

const yaml = `
schema: hackeburg.model.v1
id: textured_octagon
size: {width: 4, height: 4, depth: 4}
materials:
  green:
    type: standard
    color: '#ffffff'
    textures: {albedo: textures/green/color.svg, normal: textures/green/normal.svg, roughness: textures/green/roughness.svg}
    uv: {repeat: [2, 3]}
components:
  - {id: body, shape: polygon_prism, sides: 8, radius: 1.4, height: 2.4, position: [0, 1.2, 0], material: green}
  - {id: roof, shape: polygon_frustum, sides: 8, bottom_radius: 1.7, top_radius: 0.3, height: 0.5, position: [0, 2.8, 0], material: green}
  - {id: frame, shape: box, size: [0.8, 1.2, 0.03], position: [0, 1.2, 1.2], rotation_y: 45, material: green}
`;

afterEach(()=>vi.restoreAllMocks());
describe('YAML PBR maps and UVs',()=>{
  it('accepts texture paths and rejects invalid repetitions',()=>{
    expect(parseModel(yaml).model.materials.green.textures?.albedo).toContain('color.svg');
    expect(()=>parseModel(yaml.replace('[2, 3]','[0, -1]'))).toThrow(/uv.repeat/);
    expect(()=>parseModel(yaml.replace('textures/green/color.svg','javascript:alert(1)'))).toThrow(/ungültiger Pfad/);
  });
  it('creates UVs and respects color space and repeat for 3 channels',()=>{
    const loaded:THREE.Texture[]=[];
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation((_url,onLoad)=>{
      const t=new THREE.Texture();
      loaded.push(t);
      if(onLoad)onLoad(t);
      return t;
    });
    const {model}=parseModel(yaml);
    const resolved=resolveModel(model);
    const group=createThreeGroup(resolved.solids,resolved.materials,{assetBaseUrl:'/assets/'});
    const meshes=group.children.filter((x):x is THREE.Mesh=>x instanceof THREE.Mesh);
    expect(meshes).toHaveLength(3);
    for(const mesh of meshes)expect(mesh.geometry.getAttribute('uv')?.count).toBeGreaterThan(0);
    const mat=meshes[0].material as THREE.MeshStandardMaterial;
    expect(mat.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(mat.normalMap?.colorSpace).toBe(THREE.NoColorSpace);
    expect(mat.roughnessMap?.colorSpace).toBe(THREE.NoColorSpace);
    expect(mat.map?.repeat.toArray()).toEqual([2,3]);
    expect(loaded).toHaveLength(3);
    group.userData.disposeTextures();
    meshes.forEach(mesh=>mesh.geometry.dispose());
    mat.dispose();
  });
  it('keeps untextured materials working',()=>{
    const {model}=parseModel(yaml.replace('    textures: {albedo: textures/green/color.svg, normal: textures/green/normal.svg, roughness: textures/green/roughness.svg}',''));
    const group=createThreeGroup(resolveModel(model).solids,model.materials);
    const mesh=group.children[0] as THREE.Mesh;
    expect((mesh.material as THREE.MeshStandardMaterial).map).toBeNull();
    group.userData.disposeTextures();
    group.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});
    (mesh.material as THREE.Material).dispose();
  });
});

import {readFileSync} from 'node:fs';

describe('committed kiosk model regression',()=>{
 it('parses a complete component list without dangling paving-joint properties',()=>{
   const source=readFileSync(new URL('../public/models/hackeburg_octagonal_newspaper_kiosk_colored_lod0.yaml',import.meta.url),'utf8');
   const {model}=parseModel(source);
   expect(model.components).toHaveLength(131);
   expect(model.components.every(c=>typeof c.id==='string'&&!!c.shape)).toBe(true);
   expect(model.components.some(c=>c.id.startsWith('paving_joint_'))).toBe(false);
   expect(model.components.find(c=>c.id==='pavement_surface')?.material).toBe('paving');
   expect(model.materials.paving.textures).toEqual({
     albedo: 'textures/cobblestone_pavement/color.jpg',
     normal: 'textures/cobblestone_pavement/normal.png',
     roughness: 'textures/cobblestone_pavement/roughness.png'
   });
 });
});
