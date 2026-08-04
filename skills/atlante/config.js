/**
 * Atlante look and feel.
 *
 * Everything that decides how a chart looks lives here. Change a value,
 * and every chart you make from now on follows it. Nothing here is a
 * command-line argument on purpose: these are your taste, not your data.
 *
 * What stays on the command line: the data, the output file, the title,
 * the axis labels. Those change on every chart.
 */

// Catppuccin Mocha palette
export const THEME = {
  BASE: '#1e1e2e',
  MANTLE: '#181825',
  CRUST: '#11111b',
  TEXT: '#cdd6f4',
  SURFACE0: '#313244',
  SURFACE1: '#45475a',
  OVERLAY0: '#6c7086',
  BLUE: '#89b4fa',
  LAVENDER: '#b4befe',
  SAPPHIRE: '#74c7ec',
  TEAL: '#94e2d5',
  GREEN: '#a6e3a1',
  YELLOW: '#f9e2af',
  PEACH: '#fab387',
  MAROON: '#eba0ac',
  RED: '#f38ba8',
  MAUVE: '#cba6f7',
  PINK: '#f5c2e7',
  FLAMINGO: '#f2cdcd',
  ROSEWATER: '#f5e0dc',
};

// Series colors, used in order and then reused
export const PALETTES = {
  catppuccin: [THEME.BLUE, THEME.LAVENDER, THEME.SAPPHIRE, THEME.TEAL, THEME.GREEN, THEME.YELLOW, THEME.PEACH, THEME.MAROON, THEME.RED, THEME.MAUVE],
  mono: [THEME.TEXT, THEME.SURFACE0, THEME.SURFACE1, THEME.OVERLAY0, THEME.BLUE, THEME.LAVENDER, THEME.SAPPHIRE],
};

export const CONFIG = {
  // Series colors for every chart. Swap for PALETTES.mono, or your own array.
  palette: PALETTES.catppuccin,

  // Size is a drawing box, not a fixed pixel size. The SVG scales to the
  // window, so these numbers set the aspect ratio and the text scale.
  bar: {
    width: 700,
    height: 450,
    showValues: true,   // print the number above each bar
  },

  pie: {
    width: 600,
    height: 500,
    showLegend: true,
    donutRadius: 80,    // hole size, used by the donut recipe only
  },

  xy: {
    width: 700,
    height: 450,
    showDots: true,     // show the points, also on a line chart
  },

  tree: {
    width: 800,
    height: 600,
    nodeRadius: 8,
  },

  force: {
    width: 900,
    height: 600,
    nodeRadius: 30,
  },
};
