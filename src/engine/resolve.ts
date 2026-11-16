import type { BuildingModel,ComponentSpec,ResolvedModel,Solid,Vec3 } from '../types/model';
import {polygonFrustum,rotatedBox,transformMesh} from './polygon-mesh';

const num=(v:unknown,fallback=0):number=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
const v3=(v:unknown,other:Vec3=[0,0,0]):Vec3=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n))?v as Vec3:other;
export const add3=(a:Vec3,b:Vec3):Vec3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const round=(n:number)=>Number(n.toFixed(5));

/** Compile YAML into renderer-agnostic geometry. Box positions are at their centres. */
export function resolveModel(model:BuildingModel, options:{height?:number;interior?:boolean}={}):ResolvedModel {
  const H=options.height??model.size.height;
  if(!Number.isFinite(H)||H<3||H>16) throw new Error('Geschosshöhe muss zwischen 3 und 16 m liegen.');
  const delta=H-model.size.height;
  const solids:Solid[]=[];
  const warnings:string[]=[];
  const components=new Map(model.components.map(c=>[c.id,c]));
  const legacyEntrance=model.id.includes('entrance');
  const lift=(y:number)=>legacyEntrance&&y>=3.99?y+delta:y; // Legacy entrance-specific height adjustment.
  const box=(id:string,owner:string,material:string,position:Vec3,size:Vec3)=>{
    if(size.some(n=>!Number.isFinite(n)||n<=0)){warnings.push(`${id}: ungültige Abmessung`);return;}
    solids.push({id,owner,kind:'box',material,position:position.map(round) as Vec3,size:size.map(round) as Vec3});
  };
  const add=(spec:ComponentSpec,owner=spec.id,offset:Vec3=[0,0,0])=>{
    if(spec.optional&&options.interior===false)return;
    const source=spec.instance_of?components.get(spec.instance_of):undefined;
    const c=source?{...source,id:spec.id,position:spec.position??source.position}:spec;
    const pos=add3(v3(c.position),offset);
    const material=c.material??'sandstone';
    const shape=c.shape;
    if(shape==='box'){
      const p:Vec3=[pos[0],lift(pos[1]),pos[2]];
      const size=v3(c.size);
      if(c.rotation_y!==undefined&&c.rotation_y!==0){
        const mesh=rotatedBox(size,num(c.rotation_y));
        solids.push({id:owner,owner,kind:'mesh',material,position:p,...mesh});
      }else box(owner,owner,material,p,size);
      return;
    }
    if(shape==='polygon_prism'||shape==='polygon_frustum'){
      const sides=num(c.sides);
      const bottom=shape==='polygon_prism'?num(c.radius):num(c.bottom_radius);
      const top=shape==='polygon_prism'?bottom:num(c.top_radius);
      const mesh=polygonFrustum(sides,bottom,top,num(c.height),num(c.rotation_y));
      solids.push({id:owner,owner,kind:'mesh',material,position:pos,...mesh});
      return;
    }
    if(shape==='mesh'){
      solids.push({id:owner,owner,kind:'mesh',material,position:pos,vertices:transformMesh(c.vertices??[],num(c.rotation_y)),faces:c.faces??[]});
      return;
    }
    if(shape==='sectioned_pillar'){
      for(const part of c.sections??[]){const a=lift(num(part.from_y)),b=lift(num(part.to_y));
        box(`${owner}/${part.id}`,owner,part.material??material,[pos[0],pos[1]+(a+b)/2,pos[2]],[part.width,b-a,part.depth]);
      }return;
    }
    if(shape==='arched_opening')return; // Subtractions are resolved against their target boxes below.
    if(shape==='extruded_arch_ring'){
      solids.push({id:owner,owner,kind:'arch',material,position:v3(c.center),ri:num(c.inner_radius),ro:num(c.outer_radius),thickness:num(c.extrusion_depth,.25)});return;
    }
    if(shape==='arched_keystone'){
      solids.push({id:owner,owner,kind:'keystone',material,position:v3(c.center),ri:num(c.inner_radius),ro:num(c.outer_radius),wi:num(c.inner_half_width),wo:num(c.outer_half_width),thickness:num(c.extrusion_depth,.3)});return;
    }
    if(shape==='rectangular_frame'){
      const [w,h]=c.opening_size??[2,2],rail=num(c.rail_width,.06),d=num(c.depth,.08);
      box(`${owner}/left`,owner,material,[pos[0]-(w+rail)/2,pos[1],pos[2]],[rail,h+2*rail,d]);
      box(`${owner}/right`,owner,material,[pos[0]+(w+rail)/2,pos[1],pos[2]],[rail,h+2*rail,d]);
      box(`${owner}/top`,owner,material,[pos[0],pos[1]+(h+rail)/2,pos[2]],[w+2*rail,rail,d]);
      box(`${owner}/bottom`,owner,material,[pos[0],pos[1]-(h+rail)/2,pos[2]],[w+2*rail,rail,d]);return;
    }
    if(shape==='double_swing_door'){
      const [w,h,d]=v3(c.size,[2.2,2.35,.06]);
      for(const sign of [-1,1]){
        const center=pos[0]+sign*w/4,kw=w/2;
        box(`${owner}/glass${sign}`,owner,'glass',[center,pos[1],pos[2]],[kw-.14,h-.29,.025]);
        box(`${owner}/base${sign}`,owner,'bronze',[center,pos[1]-h/2+.1,pos[2]+.025],[kw,.2,d]);
        for(const dir of [-1,1])box(`${owner}/upright${sign}.${dir}`,owner,'bronze',[center+dir*(kw/2-.035),pos[1],pos[2]+.025],[.07,h,d]);
        box(`${owner}/upper${sign}`,owner,'bronze',[center,pos[1]+h/2-.045,pos[2]+.025],[kw,.09,d]);
        box(`${owner}/handle${sign}`,owner,'bronze',[pos[0]+sign*.09,pos[1]-.16,pos[2]+.12],[.035,.25,.05]);
      }
      box(`${owner}/divider`,owner,'bronze',[pos[0],pos[1],pos[2]+.04],[.045,h,.07]);return;
    }
    if(shape==='semicircular_glazing'){
      solids.push({id:owner,owner,kind:'fanlight',material,position:pos,radius:num(c.radius,1.2),divisions:num(c.muntins?.radial_divisions,5),thickness:.025});return;
    }
    if(shape==='sphere'){
      solids.push({id:owner,owner,kind:'sphere',material,position:pos,radius:num(c.radius,.1)});return;
    }
    if(shape==='group'){for(const child of c.children??[])add(child,owner,offset);return;}
    warnings.push(`${owner}: unbekannte Geometrie ${shape??'null'} (ausgelassen)`);
  };
  for(const c of model.components)add(c);
  // Resolve semicircular openings against a named box, preserving one solid.
  for(const cut of model.components){
    if(cut.shape!=='arched_opening'||cut.operation!=='subtract_from_wall')continue;
    const target=solids.find(s=>s.id===cut.wall_id && s.kind==='box');
    if(!target){
      if(cut.wall_id!=='host_ground_floor_shell')warnings.push(`${cut.id}: Zielwand ${cut.wall_id} nicht gefunden`);
      continue;
    }
    const radius=num(cut.arch?.inner_radius);
    const [w,h]=target.size!;
    const bottom=target.position[1]-h/2;
    const center=v3(cut.position);
    const spring=num(cut.arch?.spring_y,center[1]);
    if(radius<=0||Math.abs(center[0]-target.position[0])>1e-5||
       Math.abs(spring-bottom)>1e-4||radius>w/2+1e-5||radius>h+1e-5){
      warnings.push(`${cut.id}: Ausschnitt liegt außerhalb oder nicht an der Unterkante von ${target.id}`);
      continue;
    }
    target.kind='spandrel';
    target.radius=radius;
    target.cutoutX=center[0]-target.position[0];
  }
  // Keep pillar geometry in front of the portal jambs in the street-facing +Z axis.
  // The YAML v2 coordinates already position the jamb at z=.22 and the pillars centred z=0,
  // with pillar front at ~.35. No layer hacks required in the 3D projector.
  // A free-standing facade bay does not include a solid host wall; the arched_opening
  // references an external host_ground_floor_shell that must be cut by the building system.
  if(model.components.some(c=>c.id==='portal_opening'))warnings.push('portal_opening ist eine Aussparung im externen host_ground_floor_shell. In der Modul-Vorschau wird keine geschlossene Wand erzeugt.');
  if(legacyEntrance&&Math.abs(delta)>1e-6)warnings.push('Höhenvariation: obere Pfeiler-/Gesimsteile verschoben; vollständige parametrisierte Neuproportionierung folgt.');
  return {id:model.id,size:{...model.size,height:H},materials:model.materials,solids,warnings};
}
