// controle des bords de data/monde/regions-water.topojson : (1) epines = virage aigu (< ANGLE deg) entre deux segments de plus de MINKM ;
// (2) auto-intersections d'un contour. Usage : node outils/_controle-bords.js [fichier] [ANGLE=45] [MINKM=1]
const fs=require('fs'),tj=require('topojson-client');
const f=process.argv[2]||'data/monde/regions-water.topojson',A=+process.argv[3]||45,MIN=+process.argv[4]||1,t=JSON.parse(fs.readFileSync(f));
const F=tj.feature(t,t.objects[Object.keys(t.objects)[0]]).features;
const km=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111.19;
const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
const cross=(a,b,c,d)=>cr(a,b,c)*cr(a,b,d)<0&&cr(c,d,a)*cr(c,d,b)<0;
let sp=0,xs=0;const ex=[],reg=new Set();
F.forEach((ft,i)=>{if(!ft.geometry)return;const polys=ft.geometry.type==='Polygon'?[ft.geometry.coordinates]:ft.geometry.coordinates;
 for(const p of polys)for(const r of p){
  for(let k=1;k<r.length-1;k++){const a=r[k-1],b=r[k],c=r[k+1];if(km(a,b)<MIN||km(b,c)<MIN)continue;
   const q=Math.cos(b[1]*Math.PI/180),v1=[(a[0]-b[0])*q,a[1]-b[1]],v2=[(c[0]-b[0])*q,c[1]-b[1]];
   if((v1[0]*v2[0]+v1[1]*v2[1])/(Math.hypot(...v1)*Math.hypot(...v2))>Math.cos(A*Math.PI/180)){sp++;reg.add(i+1);ex.push('epine r'+(i+1)+' @'+b.map(x=>x.toFixed(3)).join(','));}}
  if(r.length<4000)for(let j=0;j<r.length-1;j++)for(let k=j+2;k<r.length-1;k++){if(j===0&&k===r.length-2)continue;
   if(cross(r[j],r[j+1],r[k],r[k+1])){xs++;reg.add(i+1);ex.push('croisement r'+(i+1)+' @'+r[j].map(x=>x.toFixed(3)).join(','));}}}});
console.log('epines',sp,'| croisements',xs,'| regions',reg.size);console.log(ex.slice(0,40).join('\n'));
