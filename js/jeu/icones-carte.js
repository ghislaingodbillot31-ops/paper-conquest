// Icônes rondes du globe (images ajoutées à la carte : ports, mines, caravanes), dessinées sur canevas 44 px (pixelRatio 2). Page de référence : map-globale.html.
// Atelier de mineur: pioche blanche sur disque brun
function drawMineIcon(){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#6b4a2b'; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(15, 31); g.lineTo(28, 16); g.stroke();                 // manche
  g.beginPath(); g.moveTo(17, 11); g.quadraticCurveTo(29, 11, 33, 23); g.stroke(); // fer de la pioche
  return g.getImageData(0, 0, 44, 44);
}
function drawPortIcon(color = '#1c3d5a'){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = color; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.6; g.lineCap = 'round';
  g.beginPath(); g.arc(22, 13, 3.2, 0, Math.PI * 2); g.stroke();          // anneau
  g.beginPath(); g.moveTo(22, 16.5); g.lineTo(22, 32); g.stroke();        // verge
  g.beginPath(); g.moveTo(15, 21); g.lineTo(29, 21); g.stroke();          // jas
  g.beginPath(); g.arc(22, 25, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); // bras
  return g.getImageData(0, 0, 44, 44);
}
function drawCaravanIcon(){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#9c5b1c'; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.font = '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐪', 22, 24);
  return g.getImageData(0, 0, 44, 44);
}
