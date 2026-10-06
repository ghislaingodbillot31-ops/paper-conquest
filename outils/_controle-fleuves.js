// controle : fleuves dont l'axe longe une frontiere de region (distance < MAXKM sur plus de RUNKM) dans data/monde
const fs=require('fs'),tj=require('topojson-client');
const MAXKM=+process.argv[2]||12,RUNKM=+process.argv[3]||15,KM=111.19;
const w=JSON.parse(fs.readFileSync('data/monde/water.json')),t=JSON.parse(fs.readFileSync('data/monde/admin1.topojson'));
const use=new Map(),c=a=>Array.isArray(a)?a.forEach(c):use.set(a<0?~a:a,(use.get(a<0?~a:a)||0)+1);t.objects[Object.keys(t.objects)[0]].geometries.forEach(g=>c(g.arcs));
const mesh=tj.mesh(t,{type:'MultiLineString',arcs:[...use].filter(([,n])=>n>1).map(([k])=>[k])});
const CELL=0.25,grid=new Map(),K=(x,y)=>x+','+y,km=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*KM;
for(const l of mesh.coordinates)for(let i=0;i<l.length-1;i++){const n=Math.max(1,Math.ceil(km(l[i],l[i+1])/2));for(let k=0;k<=n;k++){const p=[l[i][0]+(l[i+1][0]-l[i][0])*k/n,l[i][1]+(l[i+1][1]-l[i][1])*k/n],key=K(Math.floor(p[0]/CELL),Math.floor(p[1]/CELL));(grid.get(key)||grid.set(key,[]).get(key)).push(p)}}
const dist=p=>{const cx=Math.floor(p[0]/CELL),cy=Math.floor(p[1]/CELL),r=Math.ceil(MAXKM/(CELL*KM*Math.cos(p[1]*Math.PI/180)));let b=1e9;for(let x=cx-r;x<=cx+r;x++)for(let y=cy-r;y<=cy+r;y++)for(const q of grid.get(K(x,y))||[]){const d=km(p,q);if(d<b)b=d}return b};
const out=[];
for(const r of w.rivers){let run=0,start=null,tot=0,best=0;
  for(let i=0;i<r.c.length;i++){const dd=dist(r.c[i]),near=dd<MAXKM&&dd>(+process.argv[4]||0);
    if(near){if(!run)start=r.c[i];if(i)run+=km(r.c[i-1],r.c[i]);}else{if(run>=RUNKM){tot+=run;if(run>best){best=run;}out.push([r.n,Math.round(run),start.map(x=>+x.toFixed(2)).join(',')]);}run=0}}
  if(run>=RUNKM){out.push([r.n,Math.round(run),start.map(x=>+x.toFixed(2)).join(',')])}}
out.sort((a,b)=>b[1]-a[1]);console.log(out.length,'troncons');console.log(out.slice(0,40).map(x=>x.join(' | ')).join('\n'));
