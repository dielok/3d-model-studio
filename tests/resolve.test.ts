import {describe,it,expect} from 'vitest';
import {parseModel} from '../src/engine/validate';
import {resolveModel} from '../src/engine/resolve';

const sample=`
schema: hackeburg.model.v1
id: test_module
size: {width: 4, height: 4.6, depth: 0.9}
materials: {stone: {color: '#abcdef'}}
components:
  - id: pillar_left
    shape: sectioned_pillar
    material: stone
    position: [-1.62, 0, 0.18]
    sections:
      - {id: foot, from_y: 0, to_y: 0.4, width: 0.7, depth: 0.6}
  - id: pillar_right
    instance_of: pillar_left
    position: [1.62, 0, 0.18]
  - id: arch
    shape: extruded_arch_ring
    material: stone
    center: [0, 2.45, 0.22]
    inner_radius: 1.2
    outer_radius: 1.43
    extrusion_depth: 0.38
  - id: keystone
    shape: arched_keystone
    material: stone
    center: [0, 2.45, 0.27]
    inner_radius: 1.19
    outer_radius: 1.51
    inner_half_width: 0.115
    outer_half_width: 0.235
    extrusion_depth: 0.36
`;

describe('shared model compiler',()=>{
 it('accepts the schema and expands a pillar instance',()=>{
   const {model}=parseModel(sample);const resolved=resolveModel(model);
   expect(resolved.solids.filter(s=>s.kind==='box')).toHaveLength(2);
   expect(resolved.solids.find(s=>s.owner==='pillar_right')?.position).toEqual([1.62,.2,.18]);
 });
 it('preserves an arched frame and projecting keystone',()=>{
   const {model}=parseModel(sample);const result=resolveModel(model);
   expect(result.solids.find(s=>s.kind==='arch')?.ro).toBe(1.43);
   expect(result.solids.find(s=>s.kind==='keystone')?.ro).toBe(1.51);
 });
 it('rejects duplicated ids and wrong schema',()=>{
   expect(()=>parseModel(sample.replace('hackeburg.model.v1','other'))).toThrow(/Schema/);
   expect(()=>parseModel(sample.replace('id: pillar_right','id: pillar_left'))).toThrow(/Doppelte/);
 });
 it('preserves footprint width when changing height',()=>{
   const {model}=parseModel(sample);const result=resolveModel(model,{height:5.2});
   expect(result.size.width).toBe(4);expect(result.size.height).toBe(5.2);
 });
});


describe('arched spandrel subtraction',()=>{
 const modelText=`
schema: hackeburg.model.v1
id: spandrel_test
size: {width: 4, height: 4.6, depth: 0.9}
materials: {sandstone: {color: '#ddd'}}
components:
 - id: spandrel_plate
   shape: box
   material: sandstone
   position: [0, 3.36, 0.22]
   size: [2.86, 1.82, 0.23]
 - id: spandrel_arch_cutout
   shape: arched_opening
   operation: subtract_from_wall
   wall_id: spandrel_plate
   position: [0, 2.45, 0.22]
   clear_width: 2.86
   straight_height: 0
   arch: {type: semicircular, inner_radius: 1.43, spring_y: 2.45}
`;
 it('replaces the plate with one continuous extruded spandrel',()=>{
   const {model}=parseModel(modelText);const result=resolveModel(model);
   const plate=result.solids.find(s=>s.id==='spandrel_plate');
   expect(plate?.kind).toBe('spandrel');
   expect(plate?.radius).toBe(1.43);
   expect(plate?.size).toEqual([2.86,1.82,.23]);
   expect(plate?.position).toEqual([0,3.36,.22]);
   expect(result.solids).toHaveLength(1);
 });
 it('rejects an oversized arch rather than silently corrupting the plate',()=>{
   const {model}=parseModel(modelText.replace('inner_radius: 1.43','inner_radius: 2.5'));
   const result=resolveModel(model);
   expect(result.solids[0].kind).toBe('box');
   expect(result.warnings.some(w=>w.includes('spandrel_arch_cutout'))).toBe(true);
 });
});

describe('polygonal kiosk primitives',()=>{
 const yaml=`
schema: hackeburg.model.v1
id: octagonal_test
size: {width: 4, height: 4, depth: 4}
materials: {roof: {color: '#235544'}, glass: {color: '#9fccee'}}
components:
  - id: kiosk_body
    shape: polygon_prism
    material: roof
    sides: 8
    radius: 1.4
    height: 2.5
    position: [0, 1.25, 0]
    rotation_y: -22.5
  - id: kiosk_roof
    shape: polygon_frustum
    material: roof
    sides: 8
    bottom_radius: 1.8
    top_radius: 0.35
    height: 0.8
    position: [0, 2.9, 0]
    rotation_y: -22.5
  - id: window
    shape: box
    material: glass
    position: [0, 1.45, 1.32]
    size: [0.8, 1.2, 0.03]
    rotation_y: 45
  - id: slope
    shape: mesh
    material: roof
    position: [0, 0, 0]
    vertices: [[-1, 0, -1], [1, 0, -1], [1, 1, 1], [-1, 1, 1]]
    faces: [[0, 1, 2], [0, 2, 3]]
`;
 it('resolves eight-sided volumes, roof and rotated windows to real meshes',()=>{
   const {model}=parseModel(yaml);
   const result=resolveModel(model);
   expect(result.solids).toHaveLength(4);
   expect(result.solids.every(s=>s.kind==='mesh')).toBe(true);
   expect(result.solids[0].vertices).toHaveLength(16);
   expect(result.solids[0].faces).toHaveLength(28);
   expect(result.solids[1].vertices?.some(v=>v[1]===0.4)).toBe(true);
   expect(result.solids[2].faces).toHaveLength(12);
   expect(result.solids[3].faces).toHaveLength(2);
 });
 it('rejects invalid polygon radius and invalid mesh face indices',()=>{
   expect(()=>parseModel(yaml.replace('bottom_radius: 1.8','bottom_radius: -1'))).toThrow(/bottom_radius/);
   expect(()=>parseModel(yaml.replace('faces: [[0, 1, 2], [0, 2, 3]]','faces: [[0, 1, 99]]'))).toThrow(/faces/);
 });
});
