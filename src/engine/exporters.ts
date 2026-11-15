import rawThreeRuntime from './three-runtime.js?raw';
import type { ResolvedModel } from '../types/model';

export function downloadText(filename:string,text:string,mime='text/plain;charset=utf-8'){
  const blob=new Blob([text],{type:mime});const href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),2000);
}
export function threeCode(model:ResolvedModel){
  return `/** Hackeburg: ${model.id} — generierter Three.js-Code.\n * npm install three\n * import { createModel } from './${model.id}.js';\n * scene.add(createModel());\n * Hinweis: host shell / Öffnungs-Boolean wird vom Gebäude-Generator bereitgestellt.\n */\n`
  + rawThreeRuntime + `\n\nconst solids = ${JSON.stringify(model.solids,null,2)};\n`
  + `const materials = ${JSON.stringify(model.materials,null,2)};\n`
  + `export function createModel() { return createThreeGroup(solids, materials); }\n`;
}
