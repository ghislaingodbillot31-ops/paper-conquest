const ROADS = [
  // toute route occupe exactement une case de large (w = CELL) : une branche prend
  // une colonne de cases pile, et deux routes parallèles sont à un nombre entier de cases.
  // `surf` = largeur de la chaussée dessinée ; le reste de la bande est du bas-côté.
  // les trois revêtements ont la même chaussée de 6 m ; seul le matériau change
  { id:'terre',   name:'Terre',   w:CELL, surf:6 },
  { id:'gravier', name:'Gravier', w:CELL, surf:6 },
  { id:'pave',    name:'Pavé',    w:CELL, surf:6 },
];
const typeName = (f, d) => (PRESETS.find(p => p.f === f && p.d === d) || { name:'Sur mesure' }).name;

/* ---------- géométrie ---------- */
function corners(h) {
  const a = h.a * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), hw = h.w / 2, hl = h.l / 2;
  return [[-hw,-hl],[hw,-hl],[hw,hl],[-hw,hl]].map(([u,v]) => [h.x + u*c - v*s, h.y + u*s + v*c]);
}
function local(h, u, v) {
  const a = h.a * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [h.x + u*c - v*s, h.y + u*s + v*c];
}
function polysOverlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i+1) % P.length], nx = q[1]-p[1], ny = p[0]-q[0];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of A) { const d = v[0]*nx + v[1]*ny; a0 = Math.min(a0,d); a1 = Math.max(a1,d); }
    for (const v of B) { const d = v[0]*nx + v[1]*ny; b0 = Math.min(b0,d); b1 = Math.max(b1,d); }
    if (a1 <= b0 + 1e-6 || b1 <= a0 + 1e-6) return false;
  }
  return true;
}
function bbox(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y); }
  return [x0, y0, x1, y1];
}
const bbHit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function ptSeg(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx + dy*dy;
  let t = L ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy), q: [a[0]+t*dx, a[1]+t*dy] };
}
function inPoly(p, P) {
  let r = false;
  for (let i = 0, j = P.length-1; i < P.length; j = i++) {
    const [xi,yi] = P[i], [xj,yj] = P[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj-xi)*(p[1]-yi)/(yj-yi) + xi) r = !r;
  }
  return r;
}
// emprise d'un tronçon droit à bouts carrés
function segRect(a, b, w) {
  const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx, dy) || 1, ux = dx/L, uy = dy/L, nx = -uy, ny = ux, r = w/2;
  const A = [a[0]-ux*r, a[1]-uy*r], B = [b[0]+ux*r, b[1]+uy*r];
  return [[A[0]+nx*r, A[1]+ny*r], [B[0]+nx*r, B[1]+ny*r], [B[0]-nx*r, B[1]-ny*r], [A[0]-nx*r, A[1]-ny*r]];
}
const inTerrain = p => p[0] >= -1e-6 && p[1] >= -1e-6 && p[0] <= TW + 1e-6 && p[1] <= TH + 1e-6;
const shrunk = h => corners({ ...h, w:h.w - .1, l:h.l - .1 });
const round2 = v => Math.round(v * 100) / 100;
const segLen = (a, b) => Math.hypot(b[0]-a[0], b[1]-a[1]);
const roadLen = r => r.pts.reduce((s, q, i) => i ? s + segLen(r.pts[i-1], q) : 0, 0);
// point de croisement de [a,b] et [c,d] (bouts compris), ou null
function segCross(a, b, c, d) {
  const e = [b[0]-a[0], b[1]-a[1]], f = [d[0]-c[0], d[1]-c[1]], den = e[0]*f[1] - e[1]*f[0];
  if (Math.abs(den) < 1e-9) return null;
  const g = [c[0]-a[0], c[1]-a[1]];
  const t = (g[0]*f[1] - g[1]*f[0]) / den, v = (g[0]*e[1] - g[1]*e[0]) / den, eps = 1e-6;
  if (t < -eps || t > 1 + eps || v < -eps || v > 1 + eps) return null;
  return [a[0] + e[0]*t, a[1] + e[1]*t];
}
