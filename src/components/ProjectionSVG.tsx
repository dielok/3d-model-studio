import {useMemo} from 'react';
import type {ResolvedModel, Solid} from '../types/model';
export type View='front'|'side'|'top';
type Props={model:ResolvedModel;view:View;selected:string|null;onSelect:(id:string)=>void;grid:boolean;dimensions:boolean;};
const palette:Record<string,string>={sandstone:'#d1b896',sandstone_light:'#ecddc1',sandstone_base:'#a89981',bronze:'#414c47',wood:'#625040',glass:'#8ebfc5',interior_wood:'#927256',lamp_emissive:'#ffdf9e'};
export function ProjectionSVG({model,view,selected,onSelect,grid,dimensions}:Props){
 const width=model.size.width,height=model.size.height,depth=model.size.depth;
 const frame= view==='top'?[-width/2-1.0,-depth/2-1.0,width+2,depth+2]:view==='front'?[-width/2-1.0,-height-.9,width+2,height+1.8]:[-depth/2-1.1,-height-.9,depth+2.2,height+1.8];
 const project=(x:number,y:number,z:number):[number,number]=>view==='front'?[x,-y]:view==='side'?[z,-y]:[x,-z];
 const extents=(s:Solid)=>view==='front'?[s.size?.[0]??(s.radius??s.ro??.3)*2,s.size?.[1]??s.ro??s.radius??.3]:view==='side'?[s.size?.[2]??s.thickness??.1,s.size?.[1]??s.ro??s.radius??.3]:[s.size?.[0]??(s.radius??s.ro??.3)*2,s.size?.[2]??s.thickness??.1];
 const ordered=useMemo(()=>model.solids.slice().sort((a,b)=>{
  const val=(s:Solid)=>view==='front'?s.position[2]+(s.size?.[2]??s.thickness??0)/2:view==='side'?s.position[0]+(s.size?.[0]??0)/2:s.position[1]+(s.size?.[1]??0)/2;
  return val(a)-val(b);
 }),[model,view]);
 const part=(s:Solid,child:React.ReactNode)=> <g key={s.id} className={'part '+(selected===s.owner?'selected':'')} onClick={()=>onSelect(s.owner)} style={{cursor:'pointer'}}>{child}</g>;
 function shape(s:Solid){
   const [x,y]=project(...s.position),[w,h]=extents(s);
   const common={stroke:'#53655a',strokeWidth:.018,fill:model.materials[s.material]?.color??palette[s.material]??'#b0b6a9'};
   if(s.kind==='mesh'&&s.vertices&&s.faces){
     const material=model.materials[s.material]?.color??palette[s.material]??'#b0b6a9';
     const shaded=(hex:string,brightness:number)=>{
       if(!/^#[0-9a-fA-F]{6}$/.test(hex))return hex;
       return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*brightness))).toString(16).padStart(2,'0')).join('');
     };
     const polys=s.faces.map(ids=>{
       const pts=ids.map(i=>{
         const v=s.vertices![i];
         return [v[0]+s.position[0],v[1]+s.position[1],v[2]+s.position[2]] as [number,number,number];
       });
       const [a,b,c]=pts;
       const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
       const v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
       const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
       const mag=Math.hypot(...normal)||1;
       const brightness=.78+.12*Math.abs(normal[0]/mag)+.13*Math.abs(normal[2]/mag)+.14*Math.max(0,normal[1]/mag);
       const depth=pts.reduce((sum,p)=>sum+(view==='front'?p[2]:view==='side'?p[0]:p[1]),0)/3;
       return {pts,brightness,depth};
     }).sort((a,b)=>a.depth-b.depth);
     return part(s,<>{polys.map((p,i)=>{
       const projected=p.pts.map(point=>project(...point));
       const area=(projected[1][0]-projected[0][0])*(projected[2][1]-projected[0][1])-(projected[1][1]-projected[0][0]);
       if(Math.abs(area)<1e-8)return null;
       const d='M '+projected.map(v=>v.join(' ')).join(' L ')+' Z';
       const fill=shaded(material,p.brightness);
       return <path key={i} d={d} fill={fill} stroke={fill} strokeWidth=".003"/>;
     })}</>);
   }
   if(s.kind==='spandrel'&&view==='front'){
     const r=s.radius??0,cx=x+(s.cutoutX??0),top=y-h/2,bottom=y+h/2;
     const d=`M ${x-w/2} ${bottom} L ${x-w/2} ${top} L ${x+w/2} ${top} L ${x+w/2} ${bottom} L ${cx+r} ${bottom} A ${r} ${r} 0 0 0 ${cx-r} ${bottom} L ${x-w/2} ${bottom} Z`;
     return part(s,<path d={d} {...common}/>);
   }
   if(s.kind==='sphere')return part(s,<circle cx={x} cy={y} r={s.radius} {...common}/>);
   if(s.kind==='arch'&&view==='front'){
     const ro=s.ro??1.4,ri=s.ri??1.2;
     const d=`M ${x+ro} ${y} A ${ro} ${ro} 0 0 0 ${x-ro} ${y} L ${x-ri} ${y} A ${ri} ${ri} 0 0 1 ${x+ri} ${y} Z`;
     return part(s,<path d={d} {...common}/>);
   }
   if(s.kind==='keystone'&&view==='front'){
     const ro=s.ro??1.5,ri=s.ri??1.2,wi=s.wi??.1,wo=s.wo??.2;
     const a=Math.sqrt(Math.max(0,ro*ro-wo*wo)),b=Math.sqrt(Math.max(0,ri*ri-wi*wi));
     const d=`M ${x-wi} ${y-b} L ${x-wo} ${y-a} Q ${x} ${y-ro} ${x+wo} ${y-a} L ${x+wi} ${y-b} Q ${x} ${y-ri} ${x-wi} ${y-b} Z`;
     return part(s,<path d={d} {...common}/>);
   }
   if(s.kind==='fanlight'&&view==='front'){
     const r=s.radius??1.2, count=s.divisions??5;
     const d=`M ${x-r} ${y} A ${r} ${r} 0 0 1 ${x+r} ${y} Z`;
     return part(s,<><path d={d} stroke="#38483d" fill="#82b2b9" strokeWidth=".025"/>{Array.from({length:Math.max(0,count-1)},(_,i)=>{const a=Math.PI*(i+1)/count;return <line key={i} x1={x} y1={y} x2={x+Math.cos(a)*r} y2={y-Math.sin(a)*r} stroke="#3c4945" strokeWidth=".024"/>})}</>);
   }
   // For curved solids viewed edge-on: their orthographic depth envelope is shown.
   return part(s,<rect x={x-w/2} y={y-h/2} width={w} height={h} {...common} fillOpacity={s.material==='glass'?.64:1}/>);
 }
 const label=(x:number,y:number,text:string,rotate=false)=><text x={x} y={y} fontSize=".16" fill="#d6b87d" textAnchor="middle" transform={rotate?`rotate(-90 ${x} ${y})`:undefined}>{text}</text>;
 return <svg id="cad-svg" xmlns="http://www.w3.org/2000/svg" viewBox={frame.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${view} orthogonale Projektion` }>
 <defs><pattern id="major-grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M .5 0 H 0 V .5" stroke="#80ac98" strokeWidth=".008" fill="none" opacity=".27"/></pattern></defs>
 {grid&&<rect x={frame[0]} y={frame[1]} width={frame[2]} height={frame[3]} fill="url(#major-grid)"/>}
 <g>{ordered.map(shape)}</g>
 {dimensions&&<g stroke="#d6b87d" strokeWidth=".012" fill="none" pointerEvents="none">
 {view==='front'?<><path d={`M ${-width/2} .30 V .46 M ${width/2} .30 V .46 M ${-width/2} .39 H ${width/2}`}/>{label(0,.61,`${width.toFixed(2)} m`)}<path d={`M ${-width/2-.32} 0 H ${-width/2-.49} M ${-width/2-.32} ${-height} H ${-width/2-.49} M ${-width/2-.4} 0 V ${-height}`}/>{label(-width/2-.53,-height/2,`${height.toFixed(2)} m`,true)}</>:view==='side'?<><path d={`M ${-depth/2} .28 V .44 M ${depth/2} .28 V .44 M ${-depth/2} .36 H ${depth/2}`}/>{label(0,.6,`${depth.toFixed(2)} m`)}</>:<><path d={`M ${-width/2} ${depth/2+.22} V ${depth/2+.40} M ${width/2} ${depth/2+.22} V ${depth/2+.40} M ${-width/2} ${depth/2+.32} H ${width/2}`}/>{label(0,depth/2+.58,`${width.toFixed(2)} m`)}</>}
 </g>}
 </svg>;
}
