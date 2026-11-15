import yaml from 'js-yaml';
import type { BuildingModel } from '../types/model';

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

export function parseModel(source: string): {model:BuildingModel; warnings:string[]} {
  const raw: unknown = yaml.load(source, {json: false});
  if(!record(raw)) throw new Error('YAML muss ein Objekt an der Wurzel enthalten.');
  if(raw.schema !== 'hackeburg.model.v1') throw new Error('Nicht unterstütztes Schema. Erwartet: hackeburg.model.v1');
  if(typeof raw.id !== 'string' || !raw.id.trim()) throw new Error('Das Modell benötigt eine ID.');
  if(!record(raw.size) || !positive(raw.size.width) || !positive(raw.size.height) || !positive(raw.size.depth)) throw new Error('size.width, size.height und size.depth müssen positiv sein.');
  if(!record(raw.materials)) throw new Error('materials muss eine Material-Tabelle sein.');
  if(!Array.isArray(raw.components)) throw new Error('components muss eine Liste sein.');
  if(raw.components.length > 400) throw new Error('Maximal 400 Komponenten pro Modell.');
  const ids=new Set<string>();
  const warnings:string[]=[];
  for(const c of raw.components){
    if(!record(c) || typeof c.id !== 'string' || !c.id.trim()) throw new Error('Jede Komponente braucht eine gültige id.');
    if(ids.has(c.id)) throw new Error(`Doppelte Komponenten-ID: ${c.id}`);
    ids.add(c.id);
    if(typeof c.shape !== 'string' && typeof c.instance_of !== 'string') throw new Error(`Komponente ${c.id}: shape oder instance_of fehlt.`);
  }
  for(const c of raw.components){
    if(!record(c)) continue;
    if(typeof c.instance_of === 'string' && !ids.has(c.instance_of)) throw new Error(`${c.id}: unbekannte Vorlage ${c.instance_of}`);
  }
  return {model:raw as BuildingModel,warnings};
}
