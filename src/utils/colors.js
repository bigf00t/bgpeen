export const pctToColor = (pct, alpha = 1) => {
  const t = Math.min(100, Math.max(0, pct)) / 100;
  let r, g, b;
  if (t < 0.5) {
    const u = t * 2;
    r = Math.round(239 + (255 - 239) * u);
    g = Math.round(83  + (193 - 83)  * u);
    b = Math.round(80  + (7   - 80)  * u);
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(255 + (102 - 255) * u);
    g = Math.round(193 + (187 - 193) * u);
    b = Math.round(7   + (106 - 7)   * u);
  }
  return `rgba(${r},${g},${b},${alpha})`;
};
