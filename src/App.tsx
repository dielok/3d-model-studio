import {useEffect,useMemo,useRef,useState} from 'react';
import yaml from 'js-yaml';
import {parseModel} from './engine/validate';
import {resolveModel} from './engine/resolve';
import {downloadText,threeCode} from './engine/exporters';
import {ProjectionSVG,type View} from './components/ProjectionSVG';
import {ThreeViewport} from './components/ThreeViewport';
import type {BuildingModel} from './types/model';
import './styles/main.scss';

type Tab=View|'3d';
const views:{id:Tab;label:string}[]=[{id:'front',label:'Front · XY'},{id:'side',label:'Seite · ZY'},{id:'top',label:'Oben · XZ'},{id:'3d',label:'3D · Three.js'}];

function App(){
 const [source,setSource]=useState('');
 const [applied,setApplied]=useState<BuildingModel|null>(null);
 const [parseError,setParseError]=useState('');
 const [view,setView]=useState<Tab>('front');
 const [height,setHeight]=useState(4.6);
 const [selected,setSelected]=useState<string|null>('portal_keystone');
 const [grid,setGrid]=useState(true);
 const [dimensions,setDimensions]=useState(true);
 const [interior,setInterior]=useState(true);
 const [panel,setPanel]=useState<'inspector'|'yaml'>('inspector');
 const [fileName,setFileName]=useState('ground-floor-entrance-lod0.yaml');
 const fileInput=useRef<HTMLInputElement>(null);
 const svgRef=useRef<HTMLDivElement>(null);
 const [message,setMessage]=useState('');
 useEffect(()=>{fetch('/models/ground-floor-entrance-lod0.yaml').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(text=>{
   setSource(text);try{const res=parseModel(text);setApplied(res.model);setHeight(res.model.size.height);setParseError('')}catch(e){setParseError(String(e))}
 }).catch(e=>setParseError(`Beispiel konnte nicht geladen werden: ${String(e)}`))},[]);
 const resolved=useMemo(()=>applied?resolveModel(applied,{height,interior}):null,[applied,height,interior]);
 const component=applied?.components.find(c=>c.id===selected);
 const errors=resolved?.warnings??[];
 function notify(text:string){setMessage(text);window.setTimeout(()=>setMessage(''),3500)}
 function apply(){try{const {model}=parseModel(source);const newHeight=model.size.height;resolveModel(model,{height:newHeight,interior});setApplied(model);setHeight(newHeight);setSelected(null);setParseError('');setPanel('inspector');notify('YAML erfolgreich geladen')}catch(e){setParseError(e instanceof Error?e.message:String(e))}}
 async function importFile(file:File){try{const text=await file.text();setSource(text);setFileName(file.name);const {model}=parseModel(text);resolveModel(model,{height:model.size.height,interior});setApplied(model);setHeight(model.size.height);setSelected(null);setParseError('');notify(`${file.name} geladen`)}catch(e){setParseError(e instanceof Error?e.message:String(e))}}
 function exportSVG(){if(view==='3d'){notify('Für SVG eine orthogonale Ansicht auswählen');return}
  const svg=svgRef.current?.querySelector('svg');if(!svg)return;
  const result=svg.cloneNode(true) as SVGSVGElement;result.setAttribute('xmlns','http://www.w3.org/2000/svg');
  result.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));
  // Explicit inline styles preserve the appearance in a standalone SVG viewer.
  result.querySelectorAll('.part').forEach(e=>e.setAttribute('style',''));
  const defs=result.querySelector('defs');if(defs){ /* embedded pattern retained */ }
  downloadText(`${applied?.id??'model'}-${view}.svg`,new XMLSerializer().serializeToString(result),'image/svg+xml');
 }
 function exportThree(){if(!resolved)return;downloadText(`${resolved.id}.js`,threeCode(resolved),'text/javascript')}
 function exportModel(){downloadText(fileName,source,'application/x-yaml')}
 return <div className="app">
  <aside className="left-panel">
   <div className="eyebrow">HACKEBURG / TOOLING</div><h1>Model Studio<span className="version">v0.3</span></h1>
   <p className="intro">Ein Gebäudemodell. Drei CAD-Projektionen. Eine 3D-Szene. Exportierbarer Three.js-Code.</p>
   <div className="divider"/>
   <h2>Modell</h2>
   <div className="model-name">{applied?.id??'Kein Modell geladen'}</div>
   <div className="metadata"><span>Schema</span><strong>{applied?.schema??'—'}</strong></div>
   <div className="metadata"><span>LOD</span><strong>{applied?.lod??'—'}</strong></div>
   <div className="metadata"><span>Fassadenbreite</span><strong>{applied?.size.width.toFixed(2)??'—'} m</strong></div>
   <div className="metadata"><span>Geometrieprimitive</span><strong>{resolved?.solids.length??0}</strong></div>
   <div className="buttonline"><button onClick={()=>fileInput.current?.click()}>YAML öffnen</button><button onClick={()=>setPanel('yaml')}>YAML bearbeiten</button></div>
   <input ref={fileInput} type="file" accept=".yaml,.yml,text/yaml,application/x-yaml" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value=''}}/>
   <h2>Darstellung</h2>
   <label className="range-label" htmlFor="floor-height"><span>Erdgeschosshöhe</span><strong>{height.toFixed(2)} m</strong></label>
   <input id="floor-height" type="range" min="3.8" max="6.2" step="0.05" value={height} onChange={e=>setHeight(Number(e.target.value))} disabled={!applied}/>
   <p className="hint">Die 4-m-Weltrastergröße begrenzt nicht die Gebäudehöhe.</p>
   <label className="check"><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>Konstruktionsraster</label>
   <label className="check"><input type="checkbox" checked={dimensions} onChange={e=>setDimensions(e.target.checked)}/>Bemaßung (SVG)</label>
   <label className="check"><input type="checkbox" checked={interior} onChange={e=>setInterior(e.target.checked)}/>Innenraum-Vorschau</label>
   <h2>Export</h2><div className="export-stack">
    <button onClick={exportSVG} disabled={!resolved||view==='3d'}>↓ SVG-Ansicht exportieren</button>
    <button className="highlight" onClick={exportThree} disabled={!resolved}>↓ Three.js-Modul (.js)</button>
    <button onClick={exportModel}>↓ YAML herunterladen</button>
   </div>
   <div className="note"><strong>Projektionsvertrag</strong><p>YAML → Normalisierung → SVG und Three.js. Eine Schnittstelle für beide Renderer. +Z zeigt zur Straße.</p></div>
  </aside>
  <main className="center-panel">
   <div className="toolbar"><div><div className="eyebrow">CAD / SZENENPROJEKTOR</div><h2>Fassadenmodul</h2></div><div className="view-buttons">{views.map(v=><button key={v.id} className={view===v.id?'active':''} onClick={()=>setView(v.id)}>{v.label}</button>)}</div></div>
   <div className="drawing" ref={svgRef}>
    {resolved?(view==='3d'?<ThreeViewport model={resolved} selected={selected} onSelect={setSelected} showGrid={grid}/>:<ProjectionSVG model={resolved} view={view} selected={selected} onSelect={setSelected} grid={grid} dimensions={dimensions}/>):<div className="empty-state">YAML-Modell laden, um mit der Projektion zu beginnen.</div>}
   </div>
   <div className="status"><span><i className="status-dot"/>{applied?'Modell geladen':'Kein Modell'}</span><span>Einheiten: Meter</span><span>Front: XY · Höhe: Y · Straße: +Z</span><span>{view==='3d'?'OrbitControls aktiv':'Orthogonale SVG-Projektion'}</span></div>
   {message&&<div className="toast">{message}</div>}
  </main>
  <aside className="right-panel">
   <div className="panel-switch"><button onClick={()=>setPanel('inspector')} className={panel==='inspector'?'active':''}>Inspector</button><button onClick={()=>setPanel('yaml')} className={panel==='yaml'?'active':''}>YAML</button></div>
   {panel==='inspector'?<>
      <h2>Bauteile</h2><div className="parts">{applied?.components.filter(c=>c.shape!=='arched_opening').map(c=><button className={selected===c.id?'current':''} key={c.id} onClick={()=>setSelected(c.id)}><span>{c.id}</span><small>{c.shape??`↳ ${c.instance_of}`}</small></button>)}</div>
      <div className="divider"/><h2>Auswahl</h2>
      {component?<><div className="selected-title">{component.id}</div><div className="metadata"><span>Form</span><strong>{component.shape??component.instance_of}</strong></div><div className="metadata"><span>Material</span><strong>{component.material??'vererbt'}</strong></div><div className="metadata"><span>Primitiv-Teile</span><strong>{resolved?.solids.filter(s=>s.owner===component.id).length??0}</strong></div></>:<p className="hint">Ein Bauteil anklicken, um seine Daten zu sehen.</p>}
      <h2>Hinweise ({errors.length})</h2><div className="warnings">{errors.map((w,i)=><p key={i}>{w}</p>)}</div>
     </>:<>
      <div className="editor-title"><h2>YAML-Quelle</h2><span>{fileName}</span></div>
      <textarea className="yaml-editor" value={source} spellCheck={false} onChange={e=>setSource(e.target.value)} aria-label="YAML-Quelldatei bearbeiten"/>
      {parseError&&<div className="error">{parseError}</div>}
      <div className="buttonline"><button className="highlight" onClick={apply}>Änderungen übernehmen</button><button onClick={()=>{setSource(yaml.dump(applied??{}));notify('YAML aus geladenem Modell wiederhergestellt')}}>Zurücksetzen</button></div>
      <p className="hint">Die Ansicht aktualisiert sich nach „Änderungen übernehmen“. Fehler ändern das zuvor geladene Modell nicht.</p>
     </>}
  </aside>
 </div>;
}
export default App;
