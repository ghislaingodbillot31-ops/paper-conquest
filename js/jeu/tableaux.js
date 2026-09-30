// ---------- Line chart (shared renderer, used by "Situation mondiale" and "Économie") ----------
function renderLineChart(svg, legendEl, tipEl, tab){
  svg.innerHTML = '';
  const W = 400, H = tab.h || 170, padL = 34, padR = 12, padT = 12, padB = 22;
  const all = tab.series.flatMap(s => s.values);
  const min = Math.min(...all), max = Math.max(...all);
  const yMin = min - (max-min)*0.15, yMax = max + (max-min)*0.15;
  const x = i => padL + (i/(YEARS.length-1)) * (W-padL-padR);
  const y = v => H-padB - ((v-yMin)/(yMax-yMin)) * (H-padT-padB);

  // grille
  for(let i=0;i<4;i++){
    const gy = padT + (i/3)*(H-padT-padB);
    svg.appendChild(svgEl('line', { x1:padL, x2:W-padR, y1:gy, y2:gy, stroke:'var(--line)', 'stroke-width':1 }));
  }
  YEARS.forEach((yr,i) => {
    const t = svgEl('text', { x:x(i), y:H-6, 'text-anchor':'middle', 'font-size':9, fill:'var(--ink-soft)', 'font-family':'Nunito' });
    t.textContent = yr; svg.appendChild(t);
  });

  tab.series.forEach(s => {
    const d = s.values.map((v,i) => (i===0?'M':'L') + x(i) + ',' + y(v)).join(' ');
    svg.appendChild(svgEl('path', { d, fill:'none', stroke:s.color, 'stroke-width':2.4, 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    s.values.forEach((v,i) => {
      if(i === s.values.length-1) svg.appendChild(svgEl('circle', { cx:x(i), cy:y(v), r:4, fill:s.color }));
    });
  });

  legendEl.innerHTML = tab.series.map(s => '<span><i style="background:' + s.color + '"></i>' + s.name + '</span>').join('');

  // hover crosshair + tooltip
  const hitG = svgEl('g', {});
  svg.appendChild(hitG);
  const guide = svgEl('line', { y1:padT, y2:H-padB, stroke:'var(--ink-soft)', 'stroke-width':1, 'stroke-dasharray':'2,3', opacity:0 });
  hitG.appendChild(guide);
  const dots = tab.series.map(s => { const d = svgEl('circle', { r:4, fill:s.color, opacity:0 }); hitG.appendChild(d); return d; });
  const rect = svgEl('rect', { x:padL, y:padT, width:W-padL-padR, height:H-padT-padB, fill:'transparent' });
  rect.addEventListener('mousemove', (e) => {
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let idx = Math.round(((px-padL)/(W-padL-padR)) * (YEARS.length-1));
    idx = Math.max(0, Math.min(YEARS.length-1, idx));
    guide.setAttribute('x1', x(idx)); guide.setAttribute('x2', x(idx)); guide.setAttribute('opacity', 1);
    dots.forEach((d,si) => { d.setAttribute('cx', x(idx)); d.setAttribute('cy', y(tab.series[si].values[idx])); d.setAttribute('opacity', 1); });
    tipEl.style.opacity = 1;
    tipEl.style.left = (x(idx)/W*100) + '%';
    tipEl.style.top = (y(Math.max(...tab.series.map(s=>s.values[idx])))/H*100) + '%';
    tipEl.innerHTML = YEARS[idx] + ' — ' + tab.series.map(s => s.name+': '+s.values[idx]).join(' · ');
  });
  rect.addEventListener('mouseleave', () => {
    guide.setAttribute('opacity', 0);
    dots.forEach(d => d.setAttribute('opacity', 0));
    tipEl.style.opacity = 0;
  });
  svg.appendChild(rect);
}

// Situation mondiale (tabs)
const situationTabsEl = document.getElementById('situation-tabs');
SITUATION_TABS.forEach((t,i) => {
  const b = document.createElement('button');
  b.className = 'tab' + (i===0 ? ' active' : '');
  b.textContent = t.label;
  b.addEventListener('click', () => {
    situationTabsEl.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderLineChart(document.getElementById('situation-chart'), document.getElementById('situation-legend'), document.getElementById('chart-tip'), t);
  });
  situationTabsEl.appendChild(b);
});
renderLineChart(document.getElementById('situation-chart'), document.getElementById('situation-legend'), document.getElementById('chart-tip'), SITUATION_TABS[0]);

// ---------- Ranking (vide: pas encore de puissances classees) ----------
const rankBody = document.getElementById('rank-body');
if(RANKING.length){
  const maxPower = Math.max(...RANKING.map(r => r.power));
  RANKING.forEach((r,i) => {
    const lightness = 68 - (r.power/maxPower)*30;
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="num">' + (i+1) + '</td>' +
      '<td class="rank-name">' + r.flag + ' ' + r.name + '</td>' +
      '<td style="width:50%"><div class="rank-bar-track"><div class="rank-bar-fill" style="width:' + r.power + '%; background:hsl(206,45%,' + lightness + '%)"></div></div></td>' +
      '<td class="num">' + r.power + '%</td>';
    rankBody.appendChild(tr);
  });
} else {
  rankBody.innerHTML = '<tr><td colspan="4" class="empty-row">Aucune puissance classée pour le moment.</td></tr>';
}

// ---------- Events (vide: pas encore d'evenements) ----------
const eventsList = document.getElementById('events-list');
if(EVENTS.length){
  EVENTS.forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="ev-icon">' + ev.icon + '</span><span><span class="ev-date">' + ev.date + '</span>' + ev.text + '</span>';
    eventsList.appendChild(li);
  });
} else {
  eventsList.innerHTML = '<li class="empty-row">Aucun événement pour le moment.</li>';
}

// ---------- Clock ----------
// (date et jour de jeu: voir l'economie, renderEconomy)
