import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createThreeGroup} from '../engine/three-runtime.js';
import type {ResolvedModel} from '../types/model';

type Props={model:ResolvedModel;selected:string|null;onSelect:(id:string)=>void;showGrid:boolean};
export function ThreeViewport({model,selected,onSelect,showGrid}:Props){
 const container=useRef<HTMLDivElement>(null);
 const selectRef=useRef(onSelect);selectRef.current=onSelect;
 useEffect(()=>{
  const host=container.current;if(!host)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}
  catch(e){host.textContent='WebGL konnte nicht initialisiert werden: '+String(e);return}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;
  host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#273b37');
  const camera=new THREE.PerspectiveCamera(36,host.clientWidth/Math.max(host.clientHeight,1),.01,200);
  camera.position.set(7,6.2,12);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  controls.target.set(0,model.size.height*.46,0);controls.minDistance=1.5;controls.maxDistance=35;
  const ambient=new THREE.HemisphereLight('#eef7ff','#786f60',2.2);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0d7',3);sun.position.set(-4,10,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;
  sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.bias=-.0003;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(24,24),new THREE.MeshStandardMaterial({color:'#536f60',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(24,24,0xbccdb8,0x8ea398);grid.position.y=-.073;grid.visible=showGrid;scene.add(grid);
  const group=createThreeGroup(model.solids,model.materials);scene.add(group);
  const box=new THREE.Box3().setFromObject(group);
  const center=box.getCenter(new THREE.Vector3());controls.target.copy(center);
  const size=box.getSize(new THREE.Vector3());const dist=Math.max(8,size.length()*1.35);camera.position.set(center.x+dist*.55,center.y+dist*.35,center.z+dist*.8);
  camera.lookAt(center);
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let down:{x:number;y:number}|null=null;
  const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
  const onUp=(e:PointerEvent)=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;down=null;
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
    raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObject(group,true)[0];
    if(hit&&typeof hit.object.userData.partId==='string')selectRef.current(hit.object.userData.partId);
  };
  renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);
  let frame=0;const animate=()=>{controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)};animate();
  const resize=new ResizeObserver(()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)});resize.observe(host);
  return ()=>{
    resize.disconnect();cancelAnimationFrame(frame);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);
    controls.dispose();ground.geometry.dispose();(ground.material as THREE.Material).dispose();
    grid.geometry.dispose();if(Array.isArray(grid.material))grid.material.forEach(m=>m.dispose());else grid.material.dispose();
    group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
    const materials=new Set<THREE.Material>();group.traverse(o=>{if(o instanceof THREE.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>materials.add(m))}});materials.forEach(m=>m.dispose());
    renderer.dispose();renderer.domElement.remove();
  };
 },[model,showGrid]);
 // Selection is highlighted by the shared inspector; no camera reset on selection.
 return <div className="three-viewport" ref={container} aria-label="Interaktive Three.js-Vorschau"><div className="view-help">Ziehen: drehen · Rechts ziehen: verschieben · Scrollen: zoomen · Klicken: Bauteil wählen</div>{selected&&<div className="selected-chip">Bauteil: {selected}</div>}</div>;
}
