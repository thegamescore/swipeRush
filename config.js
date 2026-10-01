// Campaign customization: change the title in index.html and palette in style.css.
// Replace a product's draw function in art.js to use new vector art or images.
export const CONFIG = Object.freeze({
  duration: 30,
  productPoints: 10,
  comboBonus: 5,
  bombPenalty: 20,
  gravity: 880,
  width: 1000,
  height: 720,
});
export const BRAND = Object.freeze({
  name: "gamesCore_",
  accent: "#8b5cf6",
  trail: "#a78bfa",
  highlight: "#ede9fe",
});
export const PRODUCTS = [
  { id: "sneaker", color: "#a78bfa", effect: "slice" },
  { id: "bottle", color: "#9bcec4", effect: "slice" },
  { id: "box", color: "#e7b991", effect: "slice" },
  { id: "headphones", color: "#a78bfa", effect: "slice" },
  { id: "gamepad", color: "#c4b5fd", effect: "slice" },
  { id: "cap", color: "#67cddd", effect: "slice" },
  { id: "cup", color: "#f0b29d", effect: "slice" },
  { id: "tote", color: "#a4d4bc", effect: "slice" },
];
