import yaml from 'js-yaml';
import type { BuildingModel } from '../types/model';

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const finite = (v:unknown):v is number => typeof v==='number'&&Number.isFinite(v);
const vec3=(v:unknown):boolean=>Array.isArray(v)&&v.length===3&&v.every(finite);

export function parseModel(source: string): {model:BuildingModel; warnings:string[]} {
  const raw: unknown = yaml.load(source, {json: false});
  if(!record(raw)) throw new Error('YAML muss ein Objekt an der Wurzel enthalten.');
  if(raw.schema !== 'hackeburg.model.v1') throw new Error('Nicht unterstütztes Schema. Erwartet: hackeburg.model.v1');
  if(typeof raw.id !== 'string' || !raw.id.trim()) throw new Error('Das Modell benötigt eine ID.');
  if(!record(raw.size) || !positive(raw.size.width) || !positive(raw.size.height) || !positive(raw.size.depth)) throw new Error('size.width, size.height und size.depth müssen positiv sein.');
  if(!record(raw.materials)) throw new Error('materials muss eine Material-Tabelle sein.');
  for(const [id,material] of Object.entries(raw.materials)){
    if(!record(material))throw new Error(`Material ${id}: muss ein Objekt sein.`);
    if(material.textures!==undefined){
      if(!record(material.textures))throw new Error(`Material ${id}: textures muss ein Objekt sein.`);
      for(const [channel,path] of Object.entries(material.textures)){
        if(!['albedo','normal','roughness'].includes(channel))throw new Error(`Material ${id}: unbekannter Texturkanal ${channel}.`);
        if(typeof path!=='string'||!path.trim()||path.length>2048||/^(?:javascript|file):/i.test(path)||path.startsWith('//'))throw new Error(`Material ${id}: ungültiger Pfad für ${channel}.`);
      }
    }
    if(material.uv!==undefined){
      if(!record(material.uv)||!Array.isArray(material.uv.repeat)||material.uv.repeat.length!==2||
        !material.uv.repeat.every((v:unknown)=>positive(v)&&v<=128))throw new Error(`Material ${id}: uv.repeat muss zwei positive Zahlen <= 128 enthalten.`);
    }
  }
  if(!Array.isArray(raw.components)) throw new Error('components muss eine Liste sein.');
  if(raw.components.length > 400) throw new Error('Maximal 400 Komponenten pro Modell.');
  const ids=new Set<string>();
  const warnings:string[]=[];
  for(const c of raw.components){
    if(!record(c) || typeof c.id !== 'string' || !c.id.trim()) throw new Error('Jede Komponente braucht eine gültige id.');
    if(ids.has(c.id)) throw new Error(`Doppelte Komponenten-ID: ${c.id}`);
    ids.add(c.id);
    if(c.rotation_y!==undefined&&!finite(c.rotation_y))throw new Error(`${c.id}: rotation_y muss eine endliche Gradzahl sein.`);
    if(c.shape==='polygon_prism'||c.shape==='polygon_frustum'){
      if(!Number.isInteger(c.sides)||Number(c.sides)<3||Number(c.sides)>64)throw new Error(`${c.id}: sides muss zwischen 3 und 64 liegen.`);
      if(!positive(c.height)||!vec3(c.position))throw new Error(`${c.id}: height > 0 und position [x,y,z] erforderlich.`);
      if(c.shape==='polygon_prism'&&!positive(c.radius))throw new Error(`${c.id}: radius muss positiv sein.`);
      if(c.shape==='polygon_frustum'&&(!positive(c.bottom_radius)||!finite(c.top_radius)||Number(c.top_radius)<0))throw new Error(`${c.id}: bottom_radius > 0 und top_radius >= 0 erforderlich.`);
    }
    if(c.shape==='mesh'){
      if(!vec3(c.position)||!Array.isArray(c.vertices)||c.vertices.length<3||c.vertices.length>1024||!c.vertices.every(vec3))throw new Error(`${c.id}: mesh benötigt 3–1024 gültige vertices.`);
      if(!Array.isArray(c.faces)||c.faces.length===0||c.faces.length>2048||!c.faces.every((f:unknown)=>Array.isArray(f)&&f.length===3&&f.every((i:unknown)=>Number.isInteger(i)&&Number(i)>=0&&Number(i)<(c.vertices as unknown[]).length)))throw new Error(`${c.id}: faces müssen gültige Dreiecksindizes sein.`);
    }
    if(typeof c.shape !== 'string' && typeof c.instance_of !== 'string') throw new Error(`Komponente ${c.id}: shape oder instance_of fehlt.`);
  }
  for(const c of raw.components){
    if(!record(c)) continue;
    if(typeof c.instance_of === 'string' && !ids.has(c.instance_of)) throw new Error(`${c.id}: unbekannte Vorlage ${c.instance_of}`);
  }
  return {model:raw as BuildingModel,warnings};
}
