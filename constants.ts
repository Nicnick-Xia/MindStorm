
export const MAX_DEPTH = 5;
export const NODE_WIDTH = 140; // Slightly smaller for radial
export const NODE_HEIGHT = 50;
export const RADIUS_STEP = 220; // Distance between rings

export const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#6366f1', // indigo-500
  accent: '#8b5cf6', // violet-500
  background: '#f8fafc', // slate-50
  text: '#1e293b', // slate-800
  line: '#cbd5e1', // slate-300
};

// Predefined gradients for different depths to make it look pretty
export const DEPTH_COLORS = [
  'from-blue-500 to-cyan-400',
  'from-indigo-500 to-blue-400',
  'from-violet-500 to-indigo-400',
  'from-fuchsia-500 to-violet-400',
  'from-pink-500 to-rose-400',
  'from-orange-500 to-amber-400',
];
