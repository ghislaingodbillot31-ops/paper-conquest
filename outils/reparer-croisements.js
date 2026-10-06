// Repare les croisements des bords de data/monde/regions-water.topojson, arc par arc (une frontiere partagee reste identique des deux cotes) :
// boucle d'un arc sur lui-meme -> coupee au point d'intersection ; croisement entre deux arcs -> on retire le sommet fautif.
// Les extremites des arcs (jonctions) ne bougent jamais. Sans risque a relancer. Copie d'origine : outils/regions-water.avant-croisements.topojson
// Usage : node outils/reparer-croisements.js [fichier=data/monde/regions-water.topojson]
const fs=require('fs'),F=process.argv[2]||'data/monde/regions-water.topojson',t=JSON.parse(fs.readFileSync(F));
const [sx,sy]=t.transform.scale,[tx,ty]=t.transform.translate;
const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(([dx,dy])=>{x+=dx;y+=dy;return [x*sx+tx,y*sy+ty]})});
const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
const xing=(a,b,c,d)=>cr(a,b,c)*cr(a,b,d)<0&&cr(c,d,a)*cr(c,d,b)<0;
const inter=(a,b,c,d)=>{const t=cr(c,d,a)/(cr(c,d,a)-cr(c,d,b));return [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]};
const C=0.1;
function find(){ // tous les croisements : [arc i, seg j, arc k, seg l]
  const segs=[],grid=new Map(),res=[],seen=new Set();
  arcs.forEach((a,i)=>{for(let j=0;j<a.length-1;j++){const id=segs.push([i,j])-1,p=a[j],q=a[j+1];
    for(let x=Math.floor(Math.min(p[0],q[0])/C);x<=Math.floor(Math.max(p[0],q[0])/C);x++)for(let y=Math.floor(Math.min(p[1],q[1])/C);y<=Math.floor(Math.max(p[1],q[1])/C);y++){const g=x+','+y;(grid.get(g)||grid.set(g,[]).get(g)).push(id)}}});
  for(const ids of grid.values())for(let p=0;p<ids.length;p++)for(let q=p+1;q<ids.length;q++){const [i,j]=segs[ids[p]],[k,l]=segs[ids[q]];
    if(i===k&&Math.abs(j-l)<2)continue;const key=ids[p]+'_'+ids[q];if(seen.has(key))continue;seen.add(key);
    if(xing(arcs[i][j],arcs[i][j+1],arcs[k][l],arcs[k][l+1]))res.push([i,j,k,l]);}
  return res;
}
let n0=0;
for(let it=0;it<30;it++){
  const X=find();if(!it)n0=X.length;if(!X.length){console.log('plus aucun croisement, passes',it);break;}
  const touched=new Set();
  for(const [i,j,k,l] of X){
    if(i===k){ if(touched.has(i)||touched.has(k))continue; touched.add(i); const a=arcs[i],[lo,hi]=j<l?[j,l]:[l,j]; // coupe la boucle lo+1..hi
      a.splice(lo+1,hi-lo,inter(a[lo],a[lo+1],a[hi],a[hi+1])); }
    else { // entre deux arcs : retire le sommet le plus proche de l'autre segment, parmi les sommets non terminaux
      if(touched.has(i)||touched.has(k))continue;
      for(const [m,s,o,u] of [[i,j,k,l],[k,l,i,j]]){ const a=arcs[m];
        const c=[s,s+1].filter(v=>v>0&&v<a.length-1); if(!c.length)continue;
        const v=c.sort((p,q)=>Math.abs(cr(arcs[o][u],arcs[o][u+1],a[p]))-Math.abs(cr(arcs[o][u],arcs[o][u+1],a[q])))[0];
        a.splice(v,1); touched.add(m); break; } }
  }
  console.log('passe',it+1,':',X.length,'croisements');
}
// recode avec la meme grille
t.arcs=arcs.map(a=>{let px=0,py=0;return a.map(([x,y])=>{const ix=Math.round((x-tx)/sx),iy=Math.round((y-ty)/sy),d=[ix-px,iy-py];px=ix;py=iy;return d})});
fs.writeFileSync(F,JSON.stringify(t));console.log('avant',n0,'| reste',find().length);
