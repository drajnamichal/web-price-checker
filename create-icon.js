const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a 32x32 canvas
const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

// Set background to transparent
ctx.clearRect(0, 0, 32, 32);

// Set text properties
ctx.fillStyle = '#353535';
ctx.font = '24px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Draw € symbol
ctx.fillText('€', 16, 16);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/icon.png', buffer); 