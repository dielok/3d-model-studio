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
