// Champ de deformation continu et deterministe (bruit de valeur lisse, 2
// octaves), en km, fonction de la seule position lon/lat: deux regions qui
// partagent une frontiere la deforment exactement de la meme facon.
function hash(ix, iy, s){
  let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}
function noise(x, y, s){
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// retourne [dx, dy] en km au point lon/lat
function warpKm([lon, lat], amp = 22, waveKm = 260){
  const x = lon * 111.2 * Math.cos(lat * Math.PI / 180) / waveKm, y = lat * 111.2 / waveKm;
  const n = (s) => noise(x, y, s) + 0.45 * noise(x * 2.7, y * 2.7, s + 7);
  return [amp * n(1), amp * n(2)];
}
module.exports = { warpKm };
