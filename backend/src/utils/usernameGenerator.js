const adjectives = [
  'Quiet','Calm','Gentle','Brave','Soft','Warm','Kind','Still','Clear','Bright',
  'Tender','Serene','Hopeful','Peaceful','Steady','Humble','Wise','Vivid','Lush','Mellow'
];
const nouns = [
  'River','Mountain','Forest','Ocean','Meadow','Valley','Breeze','Stone','Cloud','Star',
  'Willow','Ember','Petal','Tide','Candle','Lantern','Feather','Horizon','Dusk','Dawn'
];

function generateAnonymousUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${adj}${noun}#${num}`;
}

module.exports = { generateAnonymousUsername };
