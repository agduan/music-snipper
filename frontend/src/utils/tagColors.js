const PALETTES = [
  { bg: '#C8DEF9', dot: '#9AC2F0', text: '#2E5A8A' },  // blue
  { bg: '#F9D1D1', dot: '#F2A5AA', text: '#8B3A4A' },  // pink
  { bg: '#F9EBC8', dot: '#EDD48A', text: '#6B5A2E' },  // yellow
  { bg: '#C8F0D4', dot: '#8EDBA2', text: '#2E6B42' },  // green
  { bg: '#DDD1F9', dot: '#BDA8F0', text: '#4A3A6B' },  // lavender
  { bg: '#F9D8C8', dot: '#F0B898', text: '#6B4A2E' },  // peach
  { bg: '#C8F0E8', dot: '#8EDBC8', text: '#2E6B58' },  // mint
  { bg: '#F9C8D8', dot: '#F098B0', text: '#6B2E4A' },  // coral
];

const DARK_PALETTES = [
  { bg: '#202D3D', dot: '#384D6B', text: '#8BB5E8' },   // blue
  { bg: '#3D2525', dot: '#6B4040', text: '#E8A5A5' },   // pink
  { bg: '#3D3620', dot: '#6B5E38', text: '#E8D48A' },   // yellow
  { bg: '#203D28', dot: '#386B48', text: '#8EDBA2' },
  { bg: '#2D2040', dot: '#4D386B', text: '#BDA8F0' },
  { bg: '#3D2820', dot: '#6B4838', text: '#F0B898' },
  { bg: '#203D35', dot: '#386B5D', text: '#8EDBC8' },
  { bg: '#3D2030', dot: '#6B3850', text: '#F098B0' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTagColor(tag, isDark) {
  const palette = isDark ? DARK_PALETTES : PALETTES;
  const lower = tag.toLowerCase();
  if (lower === 'classical') return palette[0]; // pastel blue
  const idx = hashString(lower) % palette.length;
  return palette[idx];
}
