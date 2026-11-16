/** Shared triangulated mesh primitives, coordinates in metres. */
import type {Vec3} from '../types/model';
export type TriMesh = {vertices:Vec3[]; faces:[number,number,number][]};

export function rotateY(p:Vec3, degrees:number):Vec3 {
  const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];
}

export function polygonFrustum(sides:number,bottomRadius:number,topRadius:number,height:number,rotationY=0):TriMesh {
  const vertices:Vec3[]=[];
  const faces:[number,number,number][]=[];
  for(let i=0;i<sides;i++){
    const a=2*Math.PI*i/sides;
    vertices.push(rotateY([Math.sin(a)*bottomRadius,-height/2,Math.cos(a)*bottomRadius],rotationY));
  }
  for(let i=0;i<sides;i++){
    const a=2*Math.PI*i/sides;
    vertices.push(rotateY([Math.sin(a)*topRadius,height/2,Math.cos(a)*topRadius],rotationY));
  }
  for(let i=0;i<sides;i++){
    const j=(i+1)%sides;
    faces.push([i,j,sides+j],[i,sides+j,sides+i]);
  }
  for(let i=1;i<sides-1;i++){
    faces.push([0,i+1,i]);
    faces.push([sides,sides+i,sides+i+1]);
  }
  return {vertices,faces};
}

export function rotatedBox(size:Vec3,degrees:number):TriMesh {
  const [w,h,d]=size.map(v=>v/2);
  const vertices:Vec3[]=[
    [-w,-h,-d],[w,-h,-d],[w,h,-d],[-w,h,-d],
    [-w,-h,d],[w,-h,d],[w,h,d],[-w,h,d]
  ].map(p=>rotateY(p as Vec3,degrees));
  const faces:[number,number,number][]=[
    [0,2,1],[0,3,2],[4,5,6],[4,6,7],
    [0,1,5],[0,5,4],[3,7,6],[3,6,2],
    [1,2,6],[1,6,5],[0,4,7],[0,7,3]
  ];
  return {vertices,faces};
}

export function transformMesh(vertices:Vec3[],degrees:number):Vec3[] {
  return vertices.map(p=>rotateY(p,degrees));
}
