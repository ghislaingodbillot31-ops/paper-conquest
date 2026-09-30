// points où l'outil actif peut se poser (tours, portes)
function drawSpots(list) {
  ctx.fillStyle = Col.accent; ctx.globalAlpha = .75;
  for (const p of list) { const [X, Y] = toS(p[0], p[1]); ctx.fillRect(X - 3.5, Y - 3.5, 7, 7); }
  ctx.globalAlpha = 1;
}
function hint(text) {
  if (!cursor) return;
  const [X, Y] = toS(...cursor);
  ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  haloText(text, X + 12, Y - 8, Col.bad, Col.sheet);
}
function drawFrame() {
  const s = view.s, [tx, ty] = toS(0, 0);
  // herbe : nappes claires et foncées, puis brins d'herbe quand on zoome
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(groundImage(), tx, ty, TW*s, TH*s);
  alignPatterns();
  if (PAT.biome !== S.biome) { makePatterns(); PAT.biome = S.biome; } // brins aux couleurs du biome
  if (s > 3 && PAT.herbe) { // brins d'herbe : seulement sur la partie visible du terrain
    const x0 = Math.max(tx, 0), y0 = Math.max(ty, 0), x1 = Math.min(tx + TW*s, W), y1 = Math.min(ty + TH*s, H);
    if (x1 > x0 && y1 > y0) { ctx.fillStyle = PAT.herbe; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
  ctx.strokeStyle = Col.ink; ctx.lineWidth = 1.5; ctx.strokeRect(tx, ty, TW*s, TH*s);
  // graduations en mètres sur le cadre seulement
  const step = [8, 16, 40, 80, 200, 400].find(v => v * s >= 38) || 400;
  ctx.font = '400 10px "IBM Plex Mono", monospace'; ctx.strokeStyle = Col.ink; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= TW; x += step) { const X = Math.round(x*s + view.ox) + .5; ctx.moveTo(X, ty); ctx.lineTo(X, ty + 5); }
  for (let y = 0; y <= TH; y += step) { const Y = Math.round(y*s + view.oy) + .5; ctx.moveTo(tx, Y); ctx.lineTo(tx + 5, Y); }
  ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const yl = Math.max(ty - 5, 14);
  for (let x = 0; x <= TW; x += step) { const X = x*s + view.ox; if (X > 30 && X < W - 10) haloText(String(x), X, yl, Col['ink-soft'], Col.sheet); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const xl = Math.max(tx - 6, 28);
  for (let y = 0; y <= TH; y += step) { const Y = y*s + view.oy; if (Y > 22 && Y < H - 10) haloText(String(y), xl, Y, Col['ink-soft'], Col.sheet); }
}
function drawScale() {
  const s = view.s, m = [8, 16, 40, 80, 160, 400, 800].find(v => v * s >= 80) || 800, L = m * s, x = 16, y = H - 22;
  ctx.fillStyle = Col.ink; ctx.fillRect(x, y, L / 2, 6);
  ctx.fillStyle = Col.sheet; ctx.fillRect(x + L / 2, y, L / 2, 6);
  ctx.strokeStyle = Col.ink; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, L, 6);
  ctx.font = '400 10px "IBM Plex Mono", monospace'; ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left'; haloText('0', x, y - 2, Col.ink, Col.sheet);
  ctx.textAlign = 'center'; haloText(fmt(m / 2), x + L / 2, y - 2, Col.ink, Col.sheet);
  haloText(`${m} m`, x + L, y - 2, Col.ink, Col.sheet);
  const nx = W - 26, ny = 38;
  ctx.beginPath(); ctx.moveTo(nx, ny - 16); ctx.lineTo(nx + 7, ny + 6); ctx.lineTo(nx, ny + 1); ctx.lineTo(nx - 7, ny + 6); ctx.closePath();
  ctx.fillStyle = Col.ink; ctx.fill();
  ctx.font = '600 12px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('N', nx, ny - 18);
}
