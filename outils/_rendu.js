// outil de controle : dessine une zone (terre creusee, frontieres, routes) en PNG. node outils/_rendu.js dossierData lon0 lat0 lon1 lat1 sortie.png
const fs=require('fs'),tj=require('topojson-client'),{Resvg}=require('@resvg/resvg-js');
const [D,x0,y0,x1,y1,out]=process.argv.slice(2),[a,b,c,d]=[x0,y0,x1,y1].map(Number);
const W=1400,H=Math.round(W*(d-b)/(c-a)*Math.cos((a+c)/2*0+((b+d)/2)*Math.PI/180)**-1*0+W*0+ (d-b)/(c-a)*W*1.0);
const sx=W/(c-a),k=Math.cos((b+d)/2*Math.PI/180),P=([x,y])=>[(x-a)*sx,(d-y)*sx/k*1];
const HH=Math.round((d-b)*sx/k);
const T=f=>JSON.parse(fs.readFileSync(D+'/'+f));
const w=T('regions-water.topojson'),ad=T('admin1.topojson');
const fc=tj.feature(w,w.objects.regions);
const ring=r=>'M'+r.map(p=>P(p).map(v=>v.toFixed(1)).join(',')).join('L')+'Z';
let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HH}"><rect width="100%" height="100%" fill="#27479f"/>`;
fc.features.forEach((f,i)=>{const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 s+=`<path fill="${i%2?'#a8cf85':'#b3d083'}" fill-rule="evenodd" d="${polys.map(p=>p.map(ring).join('')).join('')}"/>`;});
const ad2=w,o=Object.keys(ad2.objects)[0],use=new Map(),cnt=x=>Array.isArray(x)?x.forEach(cnt):use.set(x<0?~x:x,(use.get(x<0?~x:x)||0)+1);ad2.objects[o].geometries.forEach(g=>cnt(g.arcs));
const m=tj.mesh(ad2,{type:'MultiLineString',arcs:[...use].filter(([,n])=>n>1).map(([q])=>[q])});
s+=m.coordinates.map(l=>`<path fill="none" stroke="#c00" stroke-width="1.2" d="M${l.map(p=>P(p).map(v=>v.toFixed(1)).join(',')).join('L')}"/>`).join('');
if(process.env.ADMIN){ // frontieres de admin1 (avant creusage) en jaune
  const u=new Map(),f=x=>Array.isArray(x)?x.forEach(f):u.set(x<0?~x:x,(u.get(x<0?~x:x)||0)+1);
  ad.objects[Object.keys(ad.objects)[0]].geometries.forEach(g=>f(g.arcs));
  const m2=tj.mesh(ad,{type:'MultiLineString',arcs:[...u].filter(([,n])=>n>1).map(([q])=>[q])});
  s+=m2.coordinates.map(l=>`<path fill="none" stroke="#ff0" stroke-width="1" d="M${l.map(p=>P(p).map(v=>v.toFixed(1)).join(',')).join('L')}"/>`).join('');
}
s+='</svg>';
fs.writeFileSync(out,new Resvg(s).render().asPng());
