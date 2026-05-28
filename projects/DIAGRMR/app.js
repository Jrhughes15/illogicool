const INCH = 96;
const GAP = Math.round(INCH * 0.2);
const SNAP_GAP = Math.round(INCH * 0.1);
const STACK_GAP = Math.round(INCH * 0.1);
const LOCATION_GAP = GAP;
const BRANCH_STEP = Math.round(GAP / 2);
const ALIGN_TOLERANCE = Math.round(SNAP_GAP / 2);
const START_X = 76;
const START_Y = 92;
const PLOT_HEIGHT = 58;
const NOTE_HEIGHT = 38;
const META_SPAN_HEIGHT = Math.round(INCH * 0.3);
const TIME_PASSAGE_WIDTH = Math.round(INCH * 0.7);
const OUTLINE_PLOT_WIDTH = INCH;
const OUTLINE_CHARACTER_WIDTH = Math.round(INCH * 1.5);
const OUTLINE_COMPACT_PLOT_WIDTH = Math.round(OUTLINE_PLOT_WIDTH / 2);
const OUTLINE_COMPACT_CHARACTER_WIDTH = Math.round(OUTLINE_CHARACTER_WIDTH / 2);
const OUTLINE_MARKER_SEGMENT_WIDTH = Math.round(OUTLINE_COMPACT_PLOT_WIDTH / 2);
const CHARACTER_COLUMN_LIMIT = 4;
const CHARACTER_COLUMN_GAP = GAP;
const OUTLINE_INDENT = Math.round(INCH * 0.55);
const OUTLINE_PANEL_PADDING = 16;
const OUTLINE_PANEL_RIGHT_PADDING = OUTLINE_PANEL_PADDING;
const NODE_DRAG_ZONE = 14;
const TEXT_PADDING_X = 24;
const BOX_BORDER_X = 4;
const BOX_BORDER = 2;
const measureCanvas = document.createElement('canvas');
const measureContext = measureCanvas.getContext('2d');
const BUILT_IN_PLOT_VARIANTS = [
  { id: 'normal', label: 'Normal plot', colorName: 'Grey', color: '#ffffff', darkColor: '#4b4f56' },
  { id: 'beginning', label: 'Beginning', colorName: 'Green', color: '#e2f0d9', darkColor: '#3f6f38' },
  { id: 'end', label: 'End', colorName: 'Grey', color: '#d9d9d9', darkColor: '#5b6068' },
  { id: 'dialogue', label: 'Dialogue', colorName: 'Purple', color: '#ddcbfd', darkColor: '#594483' },
  { id: 'death', label: 'Death', colorName: 'Red', color: '#ff7c80', darkColor: '#8c353b' },
  { id: 'speculation', label: 'Speculation', colorName: 'Orange', color: '#ffc080', darkColor: '#8a5a29' },
];
const LINE_TYPES = [
  { id: 'solid', label: 'Solid' },
  { id: 'level1', label: 'Round dot' },
  { id: 'level2', label: 'Square dot' },
  { id: 'level3', label: 'Dash' },
  { id: 'level4', label: 'Dash dot' },
  { id: 'level5', label: 'Long dash dot' },
  { id: 'level6', label: 'Long dash dot dot' },
  { id: 'level7', label: 'Long dash' },
];
const STYLE_COLOR_TARGETS = [
  { id: 'plot', label: 'Normal plot', cssVar: '--plot', defaultColor: '#ffffff', darkColor: '#4b4f56' },
  { id: 'beginning', label: 'Beginning', cssVar: '--beginning', defaultColor: '#e2f0d9', darkColor: '#3f6f38' },
  { id: 'end', label: 'End', cssVar: '--end', defaultColor: '#d9d9d9', darkColor: '#5b6068' },
  { id: 'dialogue', label: 'Dialogue', cssVar: '--dialogue', defaultColor: '#ddcbfd', darkColor: '#594483' },
  { id: 'death', label: 'Death', cssVar: '--death', defaultColor: '#ff7c80', darkColor: '#8c353b' },
  { id: 'speculation', label: 'Speculation', cssVar: '--speculation', defaultColor: '#ffc080', darkColor: '#8a5a29' },
  { id: 'location', label: 'Location', cssVar: '--location', defaultColor: '#f2e8be', darkColor: '#7d6a2f' },
  { id: 'character', label: 'Character', cssVar: '--character', defaultColor: '#deebf7', darkColor: '#315873' },
  { id: 'note', label: 'Note', cssVar: '--note', defaultColor: '#ffffff', darkColor: '#4b4f56' },
  { id: 'metaLabel', label: 'Film/Meta top', cssVar: '--meta-label', defaultColor: '#e2f0d9', darkColor: '#3f6f38' },
  { id: 'metaSpan', label: 'Film/Meta span', cssVar: '--meta-span', defaultColor: '#f2e8be', darkColor: '#7d6a2f' },
  { id: 'scene', label: 'Scene/Chapter', cssVar: '--scene', defaultColor: '#f2e8be', darkColor: '#7d6a2f' },
  { id: 'time', label: 'Year/Time', cssVar: '--time', defaultColor: '#ffffff', darkColor: '#4b4f56' },
  { id: 'timePassage', label: 'Time Passage', cssVar: '--timejump', defaultColor: '#ededed', darkColor: '#5b6068' },
];
const PASTEL_PALETTE = [
  '#ffffff', '#f7f7f7', '#eeeeee', '#e3e3e3', '#d9d9d9', '#cfd6dc',
  '#deebf7', '#d9e2f3', '#c9daf8', '#bdd7ee', '#b4c7e7', '#d0e0e3',
  '#e2f0d9', '#d9ead3', '#cfe8c9', '#b7e1cd', '#b6d7a8', '#a9d18e',
  '#fff2cc', '#f7e8b6', '#f2e8be', '#ffe599', '#ffd966', '#f4d98d',
  '#fce4d6', '#f9d6b8', '#f9cb9c', '#f6b26b', '#f4b183', '#f8c8a8',
  '#f4cccc', '#f6b8b8', '#ffb3b8', '#ff9999', '#ff7c80', '#e6b8af',
  '#eadcf8', '#e4d4f4', '#ddcbfd', '#d9d2e9', '#c9b4e8', '#b4a7d6',
  '#d7eadf', '#d5e8d4', '#c5e0b4', '#bee3db', '#a9d9d0', '#c7d9f1',
];

const defaultDiagram = () => ({
  version: 1,
  title: 'Untitled Diagram',
  notes: '',
  info: normalizeDiagramInfo(),
  styles: defaultStyleSettings(),
  railOrder: ['rail-1'],
  rails: {
    'rail-1': {
      id: 'rail-1',
      locationId: 'node-location-1',
      plotIds: ['node-plot-1'],
    },
  },
  nodes: {
    'node-location-1': {
      id: 'node-location-1',
      type: 'location',
      text: 'Location',
      railId: 'rail-1',
    },
    'node-plot-1': {
      id: 'node-plot-1',
      type: 'plot',
      variant: 'normal',
      text: 'Plot point',
      railId: 'rail-1',
    },
  },
  groups: [],
  locationGroups: {},
  edges: [
    {
      id: 'edge-1',
      from: 'node-location-1',
      to: 'node-plot-1',
      type: 'solid',
      relation: 'sequence',
    },
  ],
});

let diagram = loadLocalDiagram() || defaultDiagram();
let selectedNodeId = null;
let selectedEdgeId = null;
let selectedNodeIds = new Set();
let nodeRects = new Map();
let transform = { x: 0, y: 0, scale: 1 };
let idCounter = Date.now();
let isPanning = false;
let isLocationPanning = false;
let autoPan = null;
let autoPanFrame = null;
let locationAutoPan = null;
let locationAutoPanFrame = null;
let panStart = null;
let locationPanStart = null;
let pendingConnector = null;
let lineMode = false;
let boxMode = false;
let activeLineNodeId = null;
let activeLineEdgeId = null;
let edgeDrag = null;
let endpointDrag = null;
let suppressConnectorHandleClick = false;
let nodeDrag = null;
let alignmentGuide = null;
let groupDrag = null;
let selectedGroupId = null;
let miniMapDrag = null;
let copiedAnchorX = null;
let undoStack = [];
let redoStack = [];
let lastHistorySnapshot = JSON.stringify(diagram);
let restoringHistory = false;
let pendingFocusNodeId = null;
let tabFocusLinks = new Map();
let lastCreatedNodeId = null;
let needsInitialViewportFrame = true;
let gridVisible = localStorage.getItem('diagrmr.gridVisible') !== 'false';
let darkTheme = localStorage.getItem('diagrmr.theme') === 'dark';
let miniMapVisible = localStorage.getItem('diagrmr.miniMapVisible') !== 'false';
let autoShiftEnabled = localStorage.getItem('diagrmr.autoShift') !== 'false';
let storyFilter = '';
let storySearchResults = [];
let storySearchIndex = -1;
let storySearchScopes = {
  boxes: true,
  connectors: true,
  groups: true,
  notes: true,
  tags: true,
};

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const groupLayer = document.getElementById('groupLayer');
const nodeLayer = document.getElementById('nodeLayer');
const connectorLayer = document.getElementById('connectorLayer');
const contextMenu = document.getElementById('contextMenu');
const titleInput = document.getElementById('diagramTitle');
const diagramNotesInput = document.getElementById('diagramNotes');
const diagramAuthorInput = document.getElementById('diagramAuthor');
const diagramDateInput = document.getElementById('diagramDate');
const diagramStatusInput = document.getElementById('diagramStatus');
const diagramSourceInput = document.getElementById('diagramSource');
const diagramLoglineInput = document.getElementById('diagramLogline');
const headerDiagramTitle = document.getElementById('headerDiagramTitle');
const selectionDetails = document.getElementById('selectionDetails');
const lineStyleSelect = document.getElementById('lineStyleSelect');
const toolbarLineStyleSelect = document.getElementById('toolbarLineStyleSelect');
const lineModeToggle = document.getElementById('lineModeToggle');
const boxModeToggle = document.getElementById('boxModeToggle');
const autoShiftToggle = document.getElementById('autoShiftToggle');
const gridToggle = document.getElementById('gridToggle');
const themeToggle = document.getElementById('themeToggle');
const miniMapClose = document.getElementById('miniMapClose');
const miniMapTab = document.getElementById('miniMapTab');
const undoButton = document.getElementById('undoDiagram');
const redoButton = document.getElementById('redoDiagram');
const resumeButton = document.getElementById('resumeBox');
const leftmostButton = document.getElementById('leftmostBox');
const rightmostButton = document.getElementById('rightmostBox');
const topmostButton = document.getElementById('topmostBox');
const bottommostButton = document.getElementById('bottommostBox');
const fitHeightButton = document.getElementById('fitHeight');
const exportFileType = document.getElementById('exportFileType');
const exportLocationOutline = document.getElementById('exportLocationOutline');
const exportLegend = document.getElementById('exportLegend');
const exportBackground = document.getElementById('exportBackground');
const exportMarginInput = document.getElementById('exportMargin');
const exportSummary = document.getElementById('exportSummary');
const exportButton = document.getElementById('exportDiagram');
const diagramStats = document.getElementById('diagramStats');
const boxColorStyleList = document.getElementById('boxColorStyleList');
const presetColorPalette = document.getElementById('presetColorPalette');
const customBoxStyleLabel = document.getElementById('customBoxStyleLabel');
const customBoxStyleColor = document.getElementById('customBoxStyleColor');
const customBoxStyleSwatch = document.getElementById('customBoxStyleSwatch');
const addCustomBoxStyleButton = document.getElementById('addCustomBoxStyle');
const customBoxStyleList = document.getElementById('customBoxStyleList');
const lineLabelList = document.getElementById('lineLabelList');
const helpButton = document.getElementById('helpButton');
const helpModal = document.getElementById('helpModal');
const helpClose = document.getElementById('helpClose');
const miniMap = document.getElementById('miniMap');
const miniMapSvg = document.getElementById('miniMapSvg');
const workspaceShell = document.querySelector('.workspace-shell');
const locationColumn = document.getElementById('locationColumn');
const locationOutline = document.getElementById('locationOutline');
const locationOutlineNodes = document.getElementById('locationOutlineNodes');
const locationOutlineLines = document.getElementById('locationOutlineLines');
const locationColumnToggle = document.getElementById('locationColumnToggle');
const locationPanelTab = document.getElementById('locationPanelTab');
const inspectorButton = document.getElementById('inspectorButton');
const storySearchToggle = document.getElementById('storySearchToggle');
const storySearchPopover = document.getElementById('storySearchPopover');
const storyFilterInput = document.getElementById('storyFilterInput');
const storySearchPrev = document.getElementById('storySearchPrev');
const storySearchNext = document.getElementById('storySearchNext');
const storySearchCount = document.getElementById('storySearchCount');
const storySearchClear = document.getElementById('storySearchClear');
const storySearchClose = document.getElementById('storySearchClose');
const storySearchScopeInputs = Array.from(document.querySelectorAll('.story-search-scope'));
const storyDrawerToggle = document.getElementById('storyDrawerToggle');
const storyDrawer = document.getElementById('storyDrawer');
const storyDrawerClose = document.getElementById('storyDrawerClose');
const storyDrawerTarget = document.getElementById('storyDrawerTarget');
const storyTagsInput = document.getElementById('storyTagsInput');
const storyNotesInput = document.getElementById('storyNotesInput');
const diagramInspectorModal = document.getElementById('diagramInspectorModal');
const diagramInspectorClose = document.getElementById('diagramInspectorClose');
const diagramInspectorTabs = document.getElementById('diagramInspectorTabs');
const diagramInspectorSearchRow = document.getElementById('diagramInspectorSearchRow');
const diagramInspectorSearch = document.getElementById('diagramInspectorSearch');
const diagramInspectorSummary = document.getElementById('diagramInspectorSummary');
const diagramInspectorList = document.getElementById('diagramInspectorList');
const diagramInspectorSettings = document.getElementById('diagramInspectorSettings');
const inspectorInfoPanel = document.getElementById('inspectorInfoPanel');
const inspectorStylesPanel = document.getElementById('inspectorStylesPanel');
const inspectorStatsPanel = document.getElementById('inspectorStatsPanel');
const inspectorExportPanel = document.getElementById('inspectorExportPanel');
const inspectorHelpPanel = document.getElementById('inspectorHelpPanel');
const inspectorHelpContent = document.getElementById('inspectorHelpContent');
const MENU_SCROLL_ZONE = 34;
const MENU_SCROLL_SPEED = 10;
const MENU_ITEM_HEIGHT = 29;
let menuScrollState = null;
let inspectorTab = 'info';
let activeStyleColorTarget = null;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function loadLocalDiagram() {
  try {
    const raw = localStorage.getItem('diagrmr.autosave');
    return raw ? normalizeDiagram(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function normalizeDiagram(source) {
  if (!source) return null;
  source.notes = typeof source.notes === 'string' ? source.notes : '';
  source.info = normalizeDiagramInfo(source.info);
  source.styles = normalizeStyleSettings(source.styles);
  source.groups = Array.isArray(source.groups) ? source.groups : [];
  source.locationGroups = source.locationGroups && typeof source.locationGroups === 'object' ? source.locationGroups : {};
  Object.values(source.nodes || {}).forEach((node) => {
    normalizeStoryFields(node);
    normalizeNoteNode(node, source);
    if (node.type !== 'location') return;
    if (node.parentLocationId && source.nodes?.[node.parentLocationId]?.type !== 'location') node.parentLocationId = null;
    if (node.parentLocationId) node.groupId = null;
    if (node.groupId && !source.locationGroups[node.groupId]) node.groupId = null;
  });
  (source.edges || []).forEach(normalizeStoryFields);
  source.groups.forEach(normalizeStoryFields);
  Object.values(source.locationGroups).forEach((group) => {
    if (group.parentGroupId && !source.locationGroups[group.parentGroupId]) group.parentGroupId = null;
  });
  return source;
}

function normalizeDiagramInfo(info) {
  const source = info && typeof info === 'object' ? info : {};
  return {
    author: typeof source.author === 'string' ? source.author : '',
    date: typeof source.date === 'string' ? source.date : '',
    status: typeof source.status === 'string' ? source.status : '',
    source: typeof source.source === 'string' ? source.source : '',
    logline: typeof source.logline === 'string' ? source.logline : '',
  };
}

function defaultStyleSettings() {
  return {
    customBoxStyles: [],
    lineLabels: {},
    colorOverrides: {},
  };
}

function normalizeStyleSettings(styles) {
  const normalized = defaultStyleSettings();
  if (!styles || typeof styles !== 'object') return normalized;
  normalized.customBoxStyles = Array.isArray(styles.customBoxStyles)
    ? styles.customBoxStyles
      .map((style) => ({
        id: typeof style.id === 'string' && style.id ? style.id : nextId('custom-style'),
        label: String(style.label || 'Custom').trim() || 'Custom',
        color: normalizePaletteColor(style.color, '#d9d9d9'),
      }))
      .slice(0, 16)
    : [];
  normalized.colorOverrides = styles.colorOverrides && typeof styles.colorOverrides === 'object'
    ? Object.fromEntries(Object.entries(styles.colorOverrides)
      .filter(([key]) => STYLE_COLOR_TARGETS.some((target) => target.id === key))
      .map(([key, color]) => [key, normalizePaletteColor(color, defaultColorForKey(key))]))
    : {};
  normalized.lineLabels = styles.lineLabels && typeof styles.lineLabels === 'object'
    ? Object.fromEntries(Object.entries(styles.lineLabels)
      .filter(([type]) => LINE_TYPES.some((lineType) => lineType.id === type))
      .map(([type, label]) => [type, String(label || '').trim()]))
    : {};
  return normalized;
}

function normalizeHexColor(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function normalizePaletteColor(value, fallback) {
  const normalized = normalizeHexColor(value, fallback).toLowerCase();
  const exact = PASTEL_PALETTE.find((color) => color.toLowerCase() === normalized);
  return exact || nearestPaletteColor(normalized);
}

function defaultColorForKey(key) {
  return STYLE_COLOR_TARGETS.find((target) => target.id === key)?.defaultColor || '#ffffff';
}

function nearestPaletteColor(hex) {
  const source = hexToRgb(normalizeHexColor(hex, '#ffffff'));
  let best = PASTEL_PALETTE[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  PASTEL_PALETTE.forEach((candidate) => {
    const rgb = hexToRgb(candidate);
    const distance = ((source.r - rgb.r) ** 2) + ((source.g - rgb.g) ** 2) + ((source.b - rgb.b) ** 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  });
  return best;
}

function hexToRgb(hex) {
  const color = normalizeHexColor(hex, '#ffffff').slice(1);
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16),
  };
}

function normalizeStoryFields(item) {
  if (!item || typeof item !== 'object') return item;
  item.storyNote = typeof item.storyNote === 'string' ? item.storyNote : '';
  item.tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  return item;
}

function normalizeNoteNode(node, source = diagram) {
  if (!node || node.type !== 'note') return;
  node.notePlacement = validNotePlacement(node.notePlacement) ? node.notePlacement : defaultNotePlacement(node.parentId, source);
  node.noteOrder = Number.isFinite(node.noteOrder) ? node.noteOrder : nextNoteOrder(node.parentId, node.id, source);
}

function autosave() {
  localStorage.setItem('diagrmr.autosave', JSON.stringify(diagram));
}

function recordHistory() {
  const snapshot = JSON.stringify(diagram);
  if (restoringHistory || snapshot === lastHistorySnapshot) {
    updateUndoRedoButtons();
    return;
  }
  undoStack.push(lastHistorySnapshot);
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
  lastHistorySnapshot = snapshot;
  updateUndoRedoButtons();
}

function resetHistory() {
  undoStack = [];
  redoStack = [];
  lastHistorySnapshot = JSON.stringify(diagram);
  updateUndoRedoButtons();
}

function undoDiagram() {
  if (!undoStack.length) return;
  const current = JSON.stringify(diagram);
  const previous = undoStack.pop();
  redoStack.push(current);
  restoringHistory = true;
  diagram = normalizeDiagram(JSON.parse(previous));
  if (lastCreatedNodeId && !diagram.nodes[lastCreatedNodeId]) lastCreatedNodeId = null;
  lastHistorySnapshot = previous;
  clearNodeSelection();
  selectedEdgeId = null;
  pendingConnector = null;
  render();
  restoringHistory = false;
  autosave();
  updateUndoRedoButtons();
}

function redoDiagram() {
  if (!redoStack.length) return;
  const current = JSON.stringify(diagram);
  const next = redoStack.pop();
  undoStack.push(current);
  restoringHistory = true;
  diagram = normalizeDiagram(JSON.parse(next));
  if (lastCreatedNodeId && !diagram.nodes[lastCreatedNodeId]) lastCreatedNodeId = null;
  lastHistorySnapshot = next;
  clearNodeSelection();
  selectedEdgeId = null;
  pendingConnector = null;
  render();
  restoringHistory = false;
  autosave();
  updateUndoRedoButtons();
}

function setSingleSelectedNode(nodeId) {
  selectedNodeId = nodeId;
  selectedNodeIds = nodeId ? new Set([nodeId]) : new Set();
  selectedGroupId = null;
}

function updateUndoRedoButtons() {
  if (undoButton) undoButton.disabled = undoStack.length === 0;
  if (redoButton) redoButton.disabled = redoStack.length === 0;
}

function textWidth(text, type) {
  if (type === 'character') return minimizedWidth(text, { min: 144, max: 420, lines: 2, bold: true, fontSize: 14 });
  if (type === 'note') return minimizedWidth(text, { min: 96, max: 420, lines: 2, bold: false, fontSize: 12 });
  if (type === 'scene') return minimizedWidth(text, { min: 160, max: 620, lines: 2, bold: true, fontSize: 14 });
  if (type === 'sceneSpan') return minimizedWidth(text, { min: 42, max: 620, lines: 1, bold: true, fontSize: 11 });
  if (type === 'location') return minimizedWidth(text, { min: 42, max: 360, lines: 2, bold: true, fontSize: 14 });
  if (type === 'metaLabel') return minimizedWidth(text, { min: 160, max: 420, lines: 2, bold: true, fontSize: 14 });
  if (type === 'metaSpan') return minimizedWidth(text, { min: 42, max: 620, lines: 1, bold: true, fontSize: 11 });
  return minimizedWidth(text, { min: 42, max: 420, lines: 3, bold: false, fontSize: 12 });
}

function minimizedWidth(text, { min, max, lines, bold, fontSize }) {
  const normalized = text.replace(/\s+/g, ' ').trim() || ' ';
  const longestWord = normalized.split(' ').reduce((longest, word) => (
    measureText(word, bold, fontSize) > measureText(longest, bold, fontSize) ? word : longest
  ), '');
  const hardMin = Math.ceil(measureText(longestWord, bold, fontSize) + TEXT_PADDING_X + BOX_BORDER_X);
  const start = Math.max(min, hardMin);

  for (let width = start; width <= max; width += 2) {
    if (wrappedLineCount(normalized, width - TEXT_PADDING_X - BOX_BORDER_X, bold, fontSize) <= lines) {
      return snapWidth(width);
    }
  }

  return snapWidth(max);
}

function snapWidth(width) {
  const widthSnap = SNAP_GAP * 2;
  return Math.ceil(width / widthSnap) * widthSnap;
}

function measureText(text, bold, fontSize = 14) {
  measureContext.font = `${bold ? '700 ' : ''}${fontSize}px Arial, Helvetica, sans-serif`;
  return measureContext.measureText(text).width;
}

function wrappedLineCount(text, availableWidth, bold, fontSize) {
  const words = text.split(' ');
  let lines = 1;
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (measureText(next, bold, fontSize) <= availableWidth) {
      current = next;
      return;
    }
    lines += 1;
    current = word;
  });

  return lines;
}

function nodeSize(node) {
  if (node.type === 'character') return { width: textWidth(node.text, 'character'), height: 38 };
  if (node.type === 'location') return { width: textWidth(node.text, 'location'), height: 48 };
  if (node.type === 'scene') return { width: textWidth(node.text, 'scene'), height: PLOT_HEIGHT };
  if (node.type === 'sceneSpan') return { width: textWidth(node.text, 'sceneSpan'), height: META_SPAN_HEIGHT };
  if (node.type === 'metaLabel') return { width: textWidth(node.text, 'metaLabel'), height: PLOT_HEIGHT };
  if (node.type === 'metaSpan') return { width: textWidth(node.text, 'metaSpan'), height: META_SPAN_HEIGHT };
  if (node.type === 'time') return { width: textWidth(node.text, 'plot'), height: PLOT_HEIGHT };
  if (node.type === 'timePassage') return { width: TIME_PASSAGE_WIDTH, height: 230 };
  if (node.type === 'note') return { width: textWidth(node.text, 'note'), height: NOTE_HEIGHT };
  if (node.type === 'timejump') return { width: 92, height: 168 };
  return { width: textWidth(node.text, 'plot'), height: 58 };
}

function characterColumnLayout(items, options = {}) {
  const limit = options.limit || CHARACTER_COLUMN_LIMIT;
  const gapX = options.gapX ?? CHARACTER_COLUMN_GAP;
  const gapY = options.gapY ?? STACK_GAP;
  const defaultWidth = options.defaultWidth ?? OUTLINE_COMPACT_CHARACTER_WIDTH;
  const defaultHeight = options.defaultHeight ?? NOTE_HEIGHT;
  const sizes = items.map((item) => item.size || { width: defaultWidth, height: defaultHeight });
  const columnCount = Math.max(1, Math.ceil(items.length / limit));
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
    const start = columnIndex * limit;
    const columnSizes = sizes.slice(start, start + limit);
    return {
      start,
      width: Math.max(...columnSizes.map((size) => size.width), defaultWidth),
      height: columnSizes.reduce((total, size, index) => total + size.height + (index ? gapY : 0), 0),
      count: columnSizes.length,
    };
  });
  const totalWidth = columns.reduce((total, column, index) => total + column.width + (index ? gapX : 0), 0);
  const totalHeight = Math.max(...columns.map((column) => column.height), 0);
  const positions = [];
  let cursorX = -totalWidth / 2;
  columns.forEach((column, columnIndex) => {
    let cursorY = 0;
    for (let row = 0; row < column.count; row += 1) {
      const itemIndex = column.start + row;
      const size = sizes[itemIndex];
      positions[itemIndex] = {
        x: cursorX + (column.width - size.width) / 2,
        y: cursorY,
        width: size.width,
        height: size.height,
        column: columnIndex,
        row,
      };
      cursorY += size.height + gapY;
    }
    cursorX += column.width + gapX;
  });
  return { positions, totalWidth, totalHeight, columnCount };
}

function centeredCharacterColumnLayout(items, centerX, topY, options = {}) {
  const layout = characterColumnLayout(items, options);
  return {
    ...layout,
    positions: layout.positions.map((position) => ({
      ...position,
      x: centerX + position.x,
      y: topY + position.y,
    })),
  };
}

function validNotePlacement(placement) {
  return ['left', 'right', 'below'].includes(placement);
}

function noteParent(node, source = diagram) {
  return node?.parentId ? source.nodes?.[node.parentId] : null;
}

function defaultNotePlacement(parentId, source = diagram) {
  const parent = source.nodes?.[parentId];
  if (!parent) return 'right';
  if (parent.type === 'plot') return 'below';
  if (parent.type === 'location') return 'left';
  if (parent.type === 'note') {
    const root = noteRootParent(parent, source);
    if (root?.type === 'plot' || root?.type === 'character') return 'below';
    return validNotePlacement(parent.notePlacement) ? parent.notePlacement : 'right';
  }
  return 'right';
}

function noteRootParent(note, source = diagram) {
  let current = note;
  const seen = new Set();
  while (current?.type === 'note' && current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = source.nodes?.[current.parentId];
    if (!parent || parent.type !== 'note') return parent || null;
    current = parent;
  }
  return null;
}

function noteCanShiftSide(note) {
  if (!note || note.type !== 'note') return false;
  const root = noteRootParent(note);
  if (!root) return false;
  return ['character', 'metaLabel', 'metaSpan', 'scene', 'sceneSpan', 'time', 'timePassage'].includes(root.type);
}

function nextNoteOrder(parentId, excludeId = null, source = diagram) {
  const orders = Object.values(source.nodes || {})
    .filter((node) => node.type === 'note' && node.parentId === parentId && node.id !== excludeId)
    .map((node) => Number.isFinite(node.noteOrder) ? node.noteOrder : (node.slot || 0));
  return orders.length ? Math.max(...orders) + 1 : 0;
}

function directPlotNotes(plotId) {
  return Object.values(diagram.nodes)
    .filter((node) => node.type === 'note' && node.parentId === plotId)
    .sort((a, b) => (a.noteOrder ?? a.slot ?? 0) - (b.noteOrder ?? b.slot ?? 0));
}

function preserveLocationRightEdgeOnResize(node, oldRect, nextSize, el = null) {
  if (node?.type !== 'location' || !oldRect || !nextSize) return;
  const rightEdge = oldRect.x + oldRect.width;
  const nextX = rightEdge - nextSize.width;
  node.anchorX = nextX;
  oldRect.x = nextX;
  oldRect.width = nextSize.width;
  if (el) el.style.left = `${nextX}px`;
}

function primaryTimelineNodeId(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return null;
  if ((node.type === 'plot' || node.type === 'location') && node.railId) return node.id;
  if (node.parentId) return primaryTimelineNodeId(node.parentId);
  return null;
}

function rectOverlapsX(rect, left, right) {
  return rect.x < right - 0.5 && rect.x + rect.width > left + 0.5;
}

function timelineAnchorIds(zoneStart, zoneEnd, sourceRailId) {
  const anchors = new Set();
  nodeRects.forEach((rect, nodeId) => {
    if (!rectOverlapsX(rect, zoneStart, zoneEnd)) return;
    const primaryId = primaryTimelineNodeId(nodeId);
    if (!primaryId) return;
    const primary = diagram.nodes[primaryId];
    if (!primary || primary.railId === sourceRailId) return;
    anchors.add(primaryId);
  });
  return anchors;
}

function shiftTimelineSpace(insertionX, delta, { sourceRailId = null, includeUnanchoredSourceRail = true, force = false } = {}) {
  if (!Number.isFinite(insertionX) || !Number.isFinite(delta) || delta <= 0) return;
  if (!force && !autoShiftEnabled) return;
  layoutDiagram();
  const shift = snapToGrid(delta);
  const anchors = timelineAnchorIds(insertionX, insertionX + shift, sourceRailId);
  const movedNodeIds = new Set();

  Object.values(diagram.nodes).forEach((node) => {
    if (!['plot', 'location'].includes(node.type) || !node.railId) return;
    const rect = nodeRects.get(node.id);
    if (!rect || rect.x < insertionX - 0.5 || anchors.has(node.id)) return;
    if (node.railId === sourceRailId && !includeUnanchoredSourceRail && !Number.isFinite(node.anchorX)) return;
    const currentX = Number.isFinite(node.anchorX) ? node.anchorX : rect.x;
    node.anchorX = snapToGrid(currentX + shift);
    movedNodeIds.add(node.id);
  });

  (diagram.groups || []).forEach((group) => {
    if (!Number.isFinite(group.x) || !Number.isFinite(group.width)) return;
    const groupRight = group.x + group.width;
    if (group.x >= insertionX - 0.5) {
      group.x = snapToGrid(group.x + shift);
      return;
    }
    if (groupRight > insertionX + 0.5) {
      group.width = Math.max(GAP, snapToGrid(group.width + shift));
    }
  });

  shiftTimelineConnectorRoutes(insertionX, shift, movedNodeIds);
}

function removeTimelineSpace(insertionX, delta) {
  if (!Number.isFinite(insertionX) || !Number.isFinite(delta) || delta <= 0) return;
  layoutDiagram();
  const shift = snapToGrid(delta);
  const movedNodeIds = new Set();

  Object.values(diagram.nodes).forEach((node) => {
    if (!['plot', 'location'].includes(node.type) || !node.railId) return;
    const rect = nodeRects.get(node.id);
    if (!rect || rect.x < insertionX - 0.5) return;
    const currentX = Number.isFinite(node.anchorX) ? node.anchorX : rect.x;
    node.anchorX = snapToGrid(currentX - shift);
    movedNodeIds.add(node.id);
  });

  (diagram.groups || []).forEach((group) => {
    if (!Number.isFinite(group.x) || !Number.isFinite(group.width)) return;
    const groupRight = group.x + group.width;
    if (group.x >= insertionX - 0.5) {
      group.x = snapToGrid(group.x - shift);
      return;
    }
    if (groupRight > insertionX + 0.5) {
      group.width = Math.max(GAP, snapToGrid(group.width - shift));
    }
  });

  shiftTimelineConnectorRoutes(insertionX, -shift, movedNodeIds);
}

function shiftTimelineConnectorRoutes(insertionX, shift, movedNodeIds) {
  if (!Number.isFinite(insertionX) || !Number.isFinite(shift)) return;
  diagram.edges.forEach((edge) => {
    const fromMoved = movedNodeIds?.has(primaryTimelineNodeId(edge.from));
    const toMoved = movedNodeIds?.has(primaryTimelineNodeId(edge.to));

    const shiftAll = fromMoved && toMoved;
    shiftEdgeXRouteData(edge, shift, (value) => shiftAll || value >= insertionX - 0.5);
  });
}

function shiftEdgeXRouteData(edge, shift, shouldShiftValue) {
  edgeRouteXProperties().forEach((property) => {
    if (!Number.isFinite(edge[property]) || !shouldShiftValue(edge[property], property)) return;
    edge[property] = snapToGrid(edge[property] + shift);
  });

  if (Array.isArray(edge.routeHandles)) {
    edge.routeHandles = edge.routeHandles.map((handle) => {
      const next = { ...handle };
      if (Number.isFinite(next.x) && shouldShiftValue(next.x, 'routeHandles')) {
        next.x = snapToGrid(next.x + shift);
      }
      return next;
    });
  }

  if (Array.isArray(edge.points)) {
    edge.points = edge.points.map((point) => {
      if (!Number.isFinite(point.x) || !shouldShiftValue(point.x, 'points')) return point;
      return { ...point, x: snapToGrid(point.x + shift) };
    });
  }
}

function edgeRouteXProperties() {
  return [
    'stepX',
    'doglegStartX',
    'doglegEndX',
    'doglegMidX',
    'routeX1',
    'routeX2',
    'routeMidX',
  ];
}

function preserveTimelinePositionsFrom(x) {
  if (!Number.isFinite(x)) return;
  Object.values(diagram.nodes).forEach((node) => {
    if (!['plot', 'location'].includes(node.type) || !node.railId) return;
    const rect = nodeRects.get(node.id);
    if (!rect || rect.x < x - 0.5) return;
    node.anchorX = rect.x;
  });
}

function layoutDiagram() {
  const rects = new Map();
  const hasMetaRail = Object.values(diagram.nodes).some((node) => node.type === 'metaLabel');
  const hasSceneRail = Object.values(diagram.nodes).some((node) => node.type === 'scene' && node.parentId);
  const hasTimeRail = Object.values(diagram.nodes).some((node) => node.type === 'time');
  const markerRailCount = (hasMetaRail ? 1 : 0) + (hasSceneRail ? 1 : 0) + (hasTimeRail ? 1 : 0);
  const firstRailY = markerRailCount
    ? START_Y + (markerRailCount - 1) * (PLOT_HEIGHT + GAP)
    : START_Y;
  let firstRailTop = null;
  let lastRailBottom = firstRailY + PLOT_HEIGHT;
  let y = firstRailY;
  const markerStep = PLOT_HEIGHT + GAP;
  const markerRailYs = {};
  ['meta', 'scene', 'time'].filter((kind) => (
    (kind === 'meta' && hasMetaRail)
    || (kind === 'scene' && hasSceneRail)
    || (kind === 'time' && hasTimeRail)
  )).forEach((kind, index, activeKinds) => {
    markerRailYs[kind] = firstRailY - (activeKinds.length - index) * markerStep;
  });
  const metaRailY = markerRailYs.meta ?? null;
  const sceneRailY = markerRailYs.scene ?? null;
  const timeRailY = markerRailYs.time ?? null;

  diagram.railOrder.forEach((railId) => {
    const rail = diagram.rails[railId];
    if (!rail) return;
    const upperClearance = railUpperSpanClearance(rail);
    y += upperClearance;
    if (firstRailTop === null) firstRailTop = y;
    const location = diagram.nodes[rail.locationId];
    const sourceRect = rail.branchFromId ? rects.get(rail.branchFromId) : null;
    const locationSize = location ? nodeSize(location) : null;
    const branchPlotX = sourceRect ? sourceRect.x + sourceRect.width + GAP : null;
    let x = sourceRect && locationSize
      ? branchPlotX - LOCATION_GAP - locationSize.width
      : START_X;
    let railBottom = y + PLOT_HEIGHT;

    if (location) {
      const size = locationSize;
      if (Number.isFinite(location.anchorX)) {
        x = location.anchorX;
      }
      rects.set(location.id, { x, y: y + 5, ...size });
      railBottom = Math.max(railBottom, y + 5 + size.height);
      x += size.width + LOCATION_GAP;
    }

    rail.plotIds.forEach((nodeId) => {
      const node = diagram.nodes[nodeId];
      if (!node) return;
      const size = nodeSize(node);
      if (Number.isFinite(node.anchorX)) {
        x = node.anchorX;
      }
      rects.set(node.id, { x, y, ...size });
      railBottom = Math.max(railBottom, y + size.height);
      x += size.width + GAP;

      const attachments = Object.values(diagram.nodes)
        .filter((candidate) => candidate.parentId === node.id)
        .sort(attachmentSort);
      const characterAttachments = attachments.filter((attachment) => attachment.type === 'character');
      const noteAttachments = attachments.filter((attachment) => attachment.type === 'note');
      const metaLabelAttachment = attachments.find((attachment) => attachment.type === 'metaLabel');
      const aboveSpanY = abovePlotSpanPositions(node.id, attachments, rects);

      let belowAttachmentBottom = y + size.height;
      attachments.forEach((attachment) => {
        if (attachment.type === 'character' || attachment.type === 'note') return;
        const attachmentSize = nodeSize(attachment);
        const parentRect = rects.get(node.id);
        if (attachment.type === 'metaSpan' || attachment.type === 'sceneSpan') {
          attachmentSize.width = Math.max(attachmentSize.width, parentRect.width);
        }
        let ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
        let ay = belowAttachmentBottom + (belowAttachmentBottom === y + size.height ? GAP : STACK_GAP);
        if (attachment.type === 'metaLabel') {
          ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
          ay = metaRailY ?? y;
        }
        if (attachment.type === 'scene') {
          ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
          ay = sceneRailY ?? timeRailY ?? metaRailY ?? y;
        }
        if (attachment.type === 'time') {
          ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
          ay = timeRailY ?? sceneRailY ?? metaRailY ?? y;
        }
        if (attachment.type === 'metaSpan') {
          ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
          ay = aboveSpanY.get(attachment.id) ?? parentRect.y - attachmentSize.height - 2;
        }
        if (attachment.type === 'sceneSpan') {
          ax = parentRect.x + parentRect.width / 2 - attachmentSize.width / 2;
          ay = aboveSpanY.get(attachment.id) ?? parentRect.y - attachmentSize.height - 2;
        }
        if (attachment.type === 'timePassage') {
          ax = parentRect.x + parentRect.width + SNAP_GAP;
          ay = y - Math.round((attachmentSize.height - parentRect.height) / 2);
        }
        rects.set(attachment.id, { x: ax, y: ay, ...attachmentSize });
        if (attachmentCountsForRailHeight(attachment)) {
          belowAttachmentBottom = ay + attachmentSize.height;
          railBottom = Math.max(railBottom, ay + attachmentSize.height);
        }
      });

      if (noteAttachments.length || characterAttachments.length) {
        const parentRect = rects.get(node.id);
        const centerX = parentRect.x + parentRect.width / 2;
        const stackTop = belowAttachmentBottom + (belowAttachmentBottom === y + size.height ? GAP : STACK_GAP);
        const belowAttachments = [...noteAttachments, ...characterAttachments];
        const attachmentLayout = centeredCharacterColumnLayout(
          belowAttachments.map((attachment) => ({ id: attachment.id, size: nodeSize(attachment) })),
          centerX,
          stackTop,
          {
            defaultWidth: OUTLINE_CHARACTER_WIDTH,
            defaultHeight: NOTE_HEIGHT,
            gapX: GAP,
            gapY: STACK_GAP,
          },
        );
        belowAttachments.forEach((attachment, index) => {
          const position = attachmentLayout.positions[index];
          rects.set(attachment.id, {
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
          });
        });
        railBottom = Math.max(railBottom, stackTop + attachmentLayout.totalHeight);
      }

      const metaRect = metaLabelAttachment ? rects.get(metaLabelAttachment.id) : null;
      if (metaRect) {
        const parentRect = rects.get(node.id);
        Object.values(diagram.nodes)
          .filter((candidate) => candidate.type === 'time'
            && (candidate.parentId === node.id || candidate.parentId === metaLabelAttachment.id))
          .forEach((timeAttachment) => {
            const timeSize = nodeSize(timeAttachment);
            rects.set(timeAttachment.id, {
              x: parentRect ? parentRect.x + parentRect.width / 2 - timeSize.width / 2 : metaRect.x,
              y: timeRailY ?? sceneRailY ?? metaRailY ?? y,
              ...timeSize,
            });
          });
      }
    });

    y = railBottom + GAP;
    lastRailBottom = Math.max(lastRailBottom, railBottom);
  });

  rects.forEach((rect, nodeId) => {
    const node = diagram.nodes[nodeId];
    if (node?.type !== 'timePassage') return;
    const top = Math.max(0, (firstRailTop ?? START_Y) - Math.round(INCH * 0.5));
    const bottom = lastRailBottom + Math.round(INCH * 0.5);
    rect.y = top;
    rect.height = bottom - top;
  });

  Object.values(diagram.nodes).forEach((node) => {
    if (node.type !== 'scene' || node.parentId) return;
    const size = nodeSize(node);
    rects.set(node.id, {
      x: Number.isFinite(node.anchorX) ? node.anchorX : START_X,
      y: Number.isFinite(node.anchorY) ? node.anchorY : START_Y - PLOT_HEIGHT - GAP,
      ...size,
    });
  });

  layoutFloatingNotes(rects);
  normalizeMetaRailCenters(rects);
  nodeRects = rects;
}

function attachmentSort(a, b) {
  const rank = (node) => {
    if (node.type === 'metaLabel') return 10;
    if (node.type === 'scene') return 11;
    if (node.type === 'time') return 12;
    if (node.type === 'metaSpan') return 13;
    if (node.type === 'sceneSpan') return 14;
    if (node.type === 'timePassage') return 15;
    if (node.type === 'note') return 20;
    if (node.type === 'character') return 30;
    return 40;
  };
  const rankDiff = rank(a) - rank(b);
  if (rankDiff) return rankDiff;
  const orderA = a.type === 'note' ? (a.noteOrder ?? a.slot ?? 0) : (a.slot || 0);
  const orderB = b.type === 'note' ? (b.noteOrder ?? b.slot ?? 0) : (b.slot || 0);
  return orderA - orderB;
}

function layoutFloatingNotes(rects) {
  const unresolved = new Set(Object.values(diagram.nodes)
    .filter((node) => node.type === 'note' && !rects.has(node.id))
    .map((node) => node.id));

  let progressed = true;
  while (unresolved.size && progressed) {
    progressed = false;
    Array.from(unresolved).forEach((noteId) => {
      const note = diagram.nodes[noteId];
      const parent = noteParent(note);
      const parentRect = parent ? rects.get(parent.id) : null;
      if (!note || !parent || !parentRect) return;

      const rect = noteRectForParent(note, parent, parentRect, rects);
      if (!rect) return;
      rects.set(note.id, rect);
      unresolved.delete(note.id);
      progressed = true;
    });
  }
}

function noteRectForParent(note, parent, parentRect, rects) {
  const size = nodeSize(note);
  const placement = validNotePlacement(note.notePlacement) ? note.notePlacement : defaultNotePlacement(parent.id);
  if (placement === 'below' || parent.type === 'plot') {
    const y = parentRect.y + parentRect.height + (parent.type === 'note' ? STACK_GAP : GAP);
    return {
      x: parentRect.x + parentRect.width / 2 - size.width / 2,
      y,
      ...size,
    };
  }

  if (parent.type === 'timePassage') {
    return {
      x: placement === 'left' ? parentRect.x - GAP - size.width : parentRect.x + parentRect.width + GAP,
      y: parentRect.y + parentRect.height - size.height,
      ...size,
    };
  }

  const orderedSiblings = Object.values(diagram.nodes)
    .filter((candidate) => candidate.type === 'note'
      && candidate.parentId === parent.id
      && (validNotePlacement(candidate.notePlacement) ? candidate.notePlacement : defaultNotePlacement(parent.id)) === placement)
    .sort((a, b) => (a.noteOrder ?? a.slot ?? 0) - (b.noteOrder ?? b.slot ?? 0));
  const priorSiblings = orderedSiblings.slice(0, orderedSiblings.findIndex((candidate) => candidate.id === note.id));
  const priorWidth = priorSiblings.reduce((total, sibling) => total + nodeSize(sibling).width + STACK_GAP, 0);
  const baseY = parent.type === 'location'
    ? parentRect.y + parentRect.height / 2 - size.height / 2
    : parentRect.y + parentRect.height / 2 - size.height / 2;

  if (placement === 'left') {
    return {
      x: parentRect.x - GAP - priorWidth - size.width,
      y: baseY,
      ...size,
    };
  }

  return {
    x: parentRect.x + parentRect.width + GAP + priorWidth,
    y: baseY,
    ...size,
  };
}

function normalizeMetaRailCenters(rects) {
  Object.values(diagram.nodes).forEach((node) => {
    if (node.type !== 'metaLabel') return;
    const rect = rects.get(node.id);
    if (!rect) return;

    const centerX = metaCenterX(node, rects);
    if (!Number.isFinite(centerX)) return;
    rect.x = centerX - rect.width / 2;
  });

  Object.values(diagram.nodes).forEach((node) => {
    if (node.type !== 'time' && node.type !== 'scene') return;
    const rect = rects.get(node.id);
    if (!rect) return;

    const centerX = metaCenterX(node, rects);
    if (!Number.isFinite(centerX)) return;
    rect.x = centerX - rect.width / 2;
  });
}

function metaCenterX(node, rects) {
  if (!node) return null;

  if (node.type === 'metaLabel') {
    const parentRect = rects.get(node.parentId);
    if (parentRect) return parentRect.x + parentRect.width / 2;
    const pairedSpan = pairedMetaNode(node.id);
    const pairedRect = pairedSpan ? rects.get(pairedSpan.id) : null;
    if (pairedRect) return pairedRect.x + pairedRect.width / 2;
  }

  if (node.type === 'time') {
    const directParent = diagram.nodes[node.parentId];
    if (directParent?.type === 'metaLabel') {
      const metaParentRect = rects.get(directParent.parentId);
      if (metaParentRect) return metaParentRect.x + metaParentRect.width / 2;
      const directParentRect = rects.get(directParent.id);
      if (directParentRect) return directParentRect.x + directParentRect.width / 2;
    }
    const siblingMeta = Object.values(diagram.nodes)
      .find((candidate) => candidate.parentId === node.parentId && candidate.type === 'metaLabel');
    if (siblingMeta) {
      const parentRect = rects.get(siblingMeta.parentId);
      if (parentRect) return parentRect.x + parentRect.width / 2;
      const siblingMetaRect = rects.get(siblingMeta.id);
      if (siblingMetaRect) return siblingMetaRect.x + siblingMetaRect.width / 2;
    }
  }

  const parentRect = rects.get(node.parentId);
  if (parentRect) return parentRect.x + parentRect.width / 2;

  const ownRect = rects.get(node.id);
  return ownRect ? ownRect.x + ownRect.width / 2 : null;
}

function abovePlotSpanPositions(plotId, attachments, rects) {
  const parentRect = rects.get(plotId);
  const positions = new Map();
  if (!parentRect) return positions;

  const spans = attachments
    .filter((attachment) => isAbovePlotSpan(attachment))
    .sort((a, b) => abovePlotSpanRank(a.type) - abovePlotSpanRank(b.type));
  let cursorY = parentRect.y - 2;
  [...spans].reverse().forEach((span) => {
    const size = nodeSize(span);
    cursorY -= size.height;
    positions.set(span.id, cursorY);
  });
  return positions;
}

function railUpperSpanClearance(rail) {
  const maxSpanCount = rail.plotIds.reduce((max, plotId) => {
    const count = Object.values(diagram.nodes).filter((node) => node.parentId === plotId && isAbovePlotSpan(node)).length;
    return Math.max(max, count);
  }, 0);
  return maxSpanCount ? maxSpanCount * META_SPAN_HEIGHT - BOX_BORDER : 0;
}

function isAbovePlotSpan(node) {
  return node?.type === 'metaSpan' || node?.type === 'sceneSpan';
}

function abovePlotSpanRank(type) {
  if (type === 'metaSpan') return 0;
  if (type === 'sceneSpan') return 1;
  return 2;
}

function attachmentCountsForRailHeight(attachment) {
  return !['metaLabel', 'metaSpan', 'scene', 'sceneSpan', 'time', 'timePassage'].includes(attachment.type);
}

function render() {
  diagram = normalizeDiagram(diagram) || defaultDiagram();
  layoutDiagram();
  frameInitialNegativeBounds();
  if (titleInput) titleInput.value = diagram.title;
  if (diagramNotesInput) diagramNotesInput.value = diagram.notes || '';
  updateHeaderDiagramTitle();
  groupLayer.innerHTML = '';
  nodeLayer.innerHTML = '';
  connectorLayer.innerHTML = '';

  renderGroups();
  renderEdges();
  Object.values(diagram.nodes).forEach(renderNode);
  renderConnectorHandles();
  renderEdgeHandles();
  renderMiniMap();
  renderLocationOutline();
  if (diagramInspectorModal && !diagramInspectorModal.hidden) renderDiagramInspector();
  updateTransform();
  updateSelectionDetails();
  if (storyDrawer && !storyDrawer.hidden) renderStoryDrawer();
  refreshStorySearchResults(true);
  updateDiagramStats();
  renderStyleSettings();
  applyCustomStyleVariables();
  updateLineStyleLabels();
  updateExportSummary();
  updateResumeButton();
  focusPendingNode();
  recordHistory();
  autosave();
}

function frameInitialNegativeBounds() {
  if (!needsInitialViewportFrame) return;
  needsInitialViewportFrame = false;
  const leftmost = leftmostTopNodeRect();
  if (leftmost) {
    setTransformToWorldPoint(leftmost.rect.x + leftmost.rect.width / 2, leftmost.rect.y + leftmost.rect.height / 2);
    return;
  }

  const bounds = diagramBounds();
  const margin = Math.round(INCH * 0.35);
  if (bounds.x < 0) transform.x = margin - bounds.x * transform.scale;
  if (bounds.y < 0) transform.y = margin - bounds.y * transform.scale;
}

function renderNode(node) {
  const rect = nodeRects.get(node.id);
  if (!rect) return;

  const el = document.createElement('div');
  const variant = node.variant && node.variant !== 'normal' ? node.variant : '';
  const filterClass = storyFilterClassForItem(node);
  el.className = ['node', node.type, variant, borderClass(node.borderType), isNodeSelected(node.id) ? 'selected' : '', filterClass].filter(Boolean).join(' ');
  el.dataset.nodeId = node.id;
  el.dataset.tags = tagLabel(node);
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  const customFill = customNodeFill(node);
  if (customFill) el.style.background = customFill;
  if (node.type === 'timePassage') {
    const label = document.createElement('span');
    label.className = 'time-passage-label';
    label.textContent = node.text;
    el.appendChild(label);
  } else {
    el.textContent = node.text;
  }
  el.contentEditable = 'true';
  el.spellcheck = false;

  el.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      toggleNodeSelection(node.id);
      return;
    }
    if (!isNodeSelected(node.id)) {
      selectNode(node.id);
    }
    if (event.button !== 0 || !isHorizontallyDraggable(node) || !isNodeDragZone(event, el)) return;
    event.preventDefault();
    const rect = nodeRects.get(node.id);
    const dragIds = selectedNodeIds.size > 1
      ? Array.from(selectedNodeIds).filter((id) => isHorizontallyDraggable(diagram.nodes[id]))
      : [node.id];
    nodeDrag = {
      id: node.id,
      ids: dragIds,
      startClientX: event.clientX,
      startX: rect.x,
      startXs: Object.fromEntries(dragIds.map((id) => [id, nodeRects.get(id)?.x || 0])),
      edgeStarts: branchEdgeDragStarts(dragIds),
      dragged: false,
      el,
    };
    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener('pointerenter', () => {
    if (!lineMode) return;
    activeLineNodeId = node.id;
    render();
  });

  el.addEventListener('pointermove', (event) => {
    if (!nodeDrag) {
      el.classList.toggle('drag-zone', isHorizontallyDraggable(node) && isNodeDragZone(event, el));
      return;
    }
    if (!nodeDrag || nodeDrag.id !== node.id) return;
    const dx = (event.clientX - nodeDrag.startClientX) / transform.scale;
    if (Math.abs(dx) < 4 && !nodeDrag.dragged) return;
    nodeDrag.dragged = true;
    const snap = centerSnapForDrag(nodeDrag, dx);
    const appliedDx = snap.dx;
    nodeDrag.ids.forEach((id) => {
      const target = diagram.nodes[id];
      const startX = nodeDrag.startXs[id];
      if (!target || !Number.isFinite(startX)) return;
      const nextX = snapToGrid(startX + appliedDx);
      target.anchorX = nextX;
      const targetEl = document.querySelector(`.node[data-node-id="${CSS.escape(id)}"]`);
      if (targetEl) targetEl.style.left = `${nextX}px`;
      const targetRect = nodeRects.get(id);
      if (targetRect) targetRect.x = nextX;
    });
    nodeDrag.edgeStarts.forEach((start) => {
      const edge = diagram.edges.find((item) => item.id === start.id);
      if (!edge) return;
      edgeRouteXProperties().forEach((property) => {
        if (Number.isFinite(start[property])) edge[property] = snapToGrid(start[property] + appliedDx);
      });
      if (Array.isArray(start.routeHandles)) {
        edge.routeHandles = start.routeHandles.map((handle) => ({
          ...handle,
          x: Number.isFinite(handle.x) ? snapToGrid(handle.x + appliedDx) : handle.x,
        }));
      }
      if (Array.isArray(start.points)) {
        edge.points = start.points.map((point) => (
          Number.isFinite(point.x) ? { ...point, x: snapToGrid(point.x + appliedDx) } : { ...point }
        ));
      }
    });
    showAlignmentGuide(snap.guideX);
    refreshConnectors();
  });

  el.addEventListener('pointerleave', () => {
    if (!nodeDrag) el.classList.remove('drag-zone');
  });

  el.addEventListener('pointerup', (event) => {
    if (!nodeDrag || nodeDrag.id !== node.id) return;
    el.releasePointerCapture(event.pointerId);
    const wasDragged = nodeDrag.dragged;
    nodeDrag = null;
    hideAlignmentGuide();
    if (wasDragged) {
      render();
    }
  });

  el.addEventListener('dblclick', (event) => {
    if (!lineMode && !boxMode) return;
    event.preventDefault();
    event.stopPropagation();
    lineMode = false;
    boxMode = false;
    pendingConnector = null;
    selectNode(node.id);
    render();
    focusNodeForEditing(node.id);
  });

  el.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isNodeSelected(node.id)) {
      selectNode(node.id);
    }
    showNodeMenu(node.id, event.clientX, event.clientY);
  });

  el.addEventListener('blur', () => {
    const oldRect = nodeRects.get(node.id);
    const oldWidth = oldRect?.width || 0;
    const oldText = node.text || defaultTextFor(node.type);
    const nextText = el.textContent.trim() || defaultTextFor(node.type);
    if (nextText === oldText) {
      if ((node.type === 'note' || node.type === 'character') && diagram.nodes[node.parentId]?.type === 'plot') {
        render();
      }
      return;
    }

    node.text = nextText;
    syncMetaText(node.id, nextText);
    const nextSize = nodeSize(node);
    preserveLocationRightEdgeOnResize(node, oldRect, nextSize);
    if (node.type === 'plot' && oldRect && nextSize.width > oldWidth + 0.5) {
      shiftTimelineSpace(oldRect.x + oldWidth, nextSize.width - oldWidth, {
        sourceRailId: node.railId,
        includeUnanchoredSourceRail: false,
      });
    } else if (node.type === 'plot' && oldRect && nextSize.width < oldWidth - 0.5) {
      preserveTimelinePositionsFrom(oldRect.x + oldWidth);
    }
    render();
  });

  el.addEventListener('input', () => {
    const liveText = el.textContent.trim() || defaultTextFor(node.type);
    node.text = liveText;
    syncMetaText(node.id, liveText);
    const nextSize = nodeSize(node);
    preserveLocationRightEdgeOnResize(node, nodeRects.get(node.id), nextSize, el);
    el.style.width = `${nextSize.width}px`;
    el.style.height = `${nextSize.height}px`;
    centerLiveMetaElement(node, el, nextSize);
    recordHistory();
    autosave();
  });

  el.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && tabFocusLinks.has(node.id)) {
      event.preventDefault();
      const nextNodeId = tabFocusLinks.get(node.id);
      tabFocusLinks.delete(node.id);
      el.blur();
      focusNodeForEditing(nextNodeId);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      el.blur();
    }
  });

  nodeLayer.appendChild(el);
}

function renderGroups() {
  (diagram.groups || []).forEach((group) => {
    const el = document.createElement('div');
    el.className = ['group-box', groupBorderClass(group.borderType), selectedGroupId === group.id ? 'selected' : '', storyFilterClassForItem(group)].filter(Boolean).join(' ');
    el.dataset.groupId = group.id;
    el.style.left = `${group.x}px`;
    el.style.top = `${group.y}px`;
    el.style.width = `${group.width}px`;
    el.style.height = `${group.height}px`;

    if (!group.isDrawing) {
      const noteRect = groupNoteRect(group);
      const note = document.createElement('div');
      note.className = ['group-note', groupBorderClass(group.borderType), storyFilterClassForItem(group)].filter(Boolean).join(' ');
      note.dataset.groupId = group.id;
      note.contentEditable = boxMode ? 'true' : 'false';
      note.spellcheck = false;
      note.textContent = group.note || 'Note';
      note.style.left = `${noteRect.x - group.x}px`;
      note.style.top = `${noteRect.y - group.y}px`;
      note.style.width = `${noteRect.width}px`;
      note.style.height = `${noteRect.height}px`;
      note.addEventListener('pointerdown', (event) => {
        if (!boxMode) return;
        event.stopPropagation();
        selectedGroupId = group.id;
        updateSelectionVisuals();
        updateSelectionDetails();
      });
      note.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        boxMode = true;
        lineMode = false;
        pendingConnector = null;
        selectedGroupId = group.id;
        render();
      });
      note.addEventListener('input', () => {
        group.note = note.textContent.trim() || 'Note';
        const lines = Math.max(1, Math.floor((groupNoteHeight(group) - 10) / (12 * 1.12)));
        group.noteWidth = minimizedWidth(group.note, { min: 76, max: 420, lines, bold: false, fontSize: 12 });
        note.style.width = `${group.noteWidth}px`;
        autosave();
      });
      note.addEventListener('blur', () => {
        group.note = note.textContent.trim() || 'Note';
        render();
      });
      note.addEventListener('contextmenu', (event) => {
        if (!boxMode) return;
        event.preventDefault();
        event.stopPropagation();
        selectedGroupId = group.id;
        showGroupMenu(group.id, event.clientX, event.clientY);
      });
      el.appendChild(note);

      ['nw', 'ne', 'sw', 'se'].forEach((handle) => {
        const grip = document.createElement('button');
        grip.type = 'button';
        grip.className = `group-resize note-resize ${handle}`;
        grip.style.left = `${noteRect.x - group.x + (handle.includes('e') ? noteRect.width : 0)}px`;
        grip.style.top = `${noteRect.y - group.y + (handle.includes('s') ? noteRect.height : 0)}px`;
        grip.addEventListener('pointerdown', (event) => startGroupResize(event, group.id, handle, 'note'));
        el.appendChild(grip);
      });
    }

    ['nw', 'ne', 'sw', 'se'].forEach((handle) => {
      const grip = document.createElement('button');
      grip.type = 'button';
      grip.className = `group-resize ${handle}`;
      grip.addEventListener('pointerdown', (event) => startGroupResize(event, group.id, handle, 'box'));
      el.appendChild(grip);
    });

    el.addEventListener('pointerdown', (event) => {
      if (!boxMode) return;
      event.stopPropagation();
      selectedGroupId = group.id;
      selectedNodeId = null;
      selectedNodeIds = new Set();
      selectedEdgeId = null;
      updateSelectionVisuals();
      updateSelectionDetails();
    });
    el.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      boxMode = true;
      lineMode = false;
      pendingConnector = null;
      selectedGroupId = group.id;
      render();
    });
    el.addEventListener('contextmenu', (event) => {
      if (!boxMode) return;
      event.preventDefault();
      event.stopPropagation();
      selectedGroupId = group.id;
      showGroupMenu(group.id, event.clientX, event.clientY);
    });
    groupLayer.appendChild(el);
  });
}

function startGroupResize(event, groupId, handle, target = 'box') {
  event.preventDefault();
  event.stopPropagation();
  const group = (diagram.groups || []).find((item) => item.id === groupId);
  if (!group) return;
  selectedGroupId = groupId;
  selectedNodeId = null;
  selectedNodeIds = new Set();
  selectedEdgeId = null;
  groupDrag = {
    mode: 'resize',
    groupId,
    handle,
    target,
    startClientX: event.clientX,
    startClientY: event.clientY,
    start: {
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
      noteWidth: groupNoteWidth(group),
      noteHeight: groupNoteHeight(group),
    },
  };
  viewport.setPointerCapture(event.pointerId);
}

function updateGroupDrag(event) {
  const group = (diagram.groups || []).find((item) => item.id === groupDrag.groupId);
  if (!group) return;
  const dx = (event.clientX - groupDrag.startClientX) / transform.scale;
  const dy = (event.clientY - groupDrag.startClientY) / transform.scale;
  let x = groupDrag.start.x;
  let y = groupDrag.start.y;
  let width = groupDrag.start.width;
  let height = groupDrag.start.height;

  if (groupDrag.mode === 'draw') {
    x = Math.min(groupDrag.start.x, groupDrag.start.x + dx);
    y = Math.min(groupDrag.start.y, groupDrag.start.y + dy);
    width = Math.abs(dx);
    height = Math.abs(dy);
  } else if (groupDrag.target === 'note') {
    let noteWidth = groupDrag.start.noteWidth;
    let noteHeight = groupDrag.start.noteHeight;
    const handle = groupDrag.handle;
    if (handle.includes('w')) noteWidth = groupDrag.start.noteWidth - dx;
    if (handle.includes('e')) noteWidth = groupDrag.start.noteWidth + dx;
    if (handle.includes('n')) noteHeight = groupDrag.start.noteHeight - dy;
    if (handle.includes('s')) noteHeight = groupDrag.start.noteHeight + dy;
    group.noteWidth = Math.max(76, snapToGrid(noteWidth));
    group.noteHeight = Math.max(META_SPAN_HEIGHT, snapToGrid(noteHeight));
    renderGroupsOnly();
    return;
  } else {
    const handle = groupDrag.handle;
    if (handle.includes('w')) {
      x = groupDrag.start.x + dx;
      width = groupDrag.start.width - dx;
    }
    if (handle.includes('e')) {
      width = groupDrag.start.width + dx;
    }
    if (handle.includes('n')) {
      y = groupDrag.start.y + dy;
      height = groupDrag.start.height - dy;
    }
    if (handle.includes('s')) {
      height = groupDrag.start.height + dy;
    }
  }

  group.x = snapToGrid(x);
  group.y = snapToGrid(y);
  group.width = Math.max(GAP, snapToGrid(width));
  group.height = Math.max(GAP, snapToGrid(height));
  renderGroupsOnly();
}

function finishGroupDrag(event) {
  const group = (diagram.groups || []).find((item) => item.id === groupDrag.groupId);
  const tooSmall = group && (group.width < GAP || group.height < GAP);
  if (tooSmall) {
    diagram.groups = diagram.groups.filter((item) => item.id !== group.id);
    selectedGroupId = null;
  } else if (group) {
    group.isDrawing = false;
    group.noteCorner = group.noteCorner || 'bottom-left';
    group.noteWidth = group.noteWidth || 104;
    group.noteHeight = group.noteHeight || META_SPAN_HEIGHT;
  }
  groupDrag = null;
  try {
    viewport.releasePointerCapture(event.pointerId);
  } catch {}
  render();
}

function renderGroupsOnly() {
  groupLayer.innerHTML = '';
  renderGroups();
  updateSelectionVisuals();
}

function focusPendingNode() {
  if (!pendingFocusNodeId) return;
  const nodeId = pendingFocusNodeId;
  pendingFocusNodeId = null;
  requestAnimationFrame(() => focusNodeForEditing(nodeId));
}

function focusNodeForEditing(nodeId) {
  const el = document.querySelector(`.node[data-node-id="${CSS.escape(nodeId)}"]`);
  if (!el) return;
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function focusAfterRender(nodeId) {
  pendingFocusNodeId = nodeId;
  markCreatedNode(nodeId);
}

function markCreatedNode(nodeId) {
  lastCreatedNodeId = nodeId;
  updateResumeButton();
}

function focusGroupNote(groupId) {
  requestAnimationFrame(() => {
    const note = document.querySelector(`.group-box[data-group-id="${CSS.escape(groupId)}"] .group-note`);
    if (!note) return;
    note.focus();
    const range = document.createRange();
    range.selectNodeContents(note);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function setGroupNoteCorner(groupId, corner) {
  const group = (diagram.groups || []).find((item) => item.id === groupId);
  if (!group) return;
  group.noteCorner = corner;
  render();
}

function setGroupBorder(groupId, type) {
  const group = (diagram.groups || []).find((item) => item.id === groupId);
  if (!group) return;
  group.borderType = type === 'solid' ? null : type;
  renderGroupsOnly();
  recordHistory();
  autosave();
}

function deleteGroup(groupId) {
  diagram.groups = (diagram.groups || []).filter((group) => group.id !== groupId);
  if (selectedGroupId === groupId) selectedGroupId = null;
  render();
}

function groupNoteRect(group) {
  const width = groupNoteWidth(group);
  const height = groupNoteHeight(group);
  const inset = 8;
  const corner = group.noteCorner || 'bottom-left';
  const x = corner.endsWith('left') ? group.x + inset : group.x + group.width - width - inset;
  const y = corner.startsWith('top') ? group.y + inset : group.y + group.height - height - inset;
  return { x, y, width, height };
}

function groupNoteWidth(group) {
  return Math.max(76, group.noteWidth || 104);
}

function groupNoteHeight(group) {
  return Math.max(META_SPAN_HEIGHT, group.noteHeight || META_SPAN_HEIGHT);
}

function resumeToLastCreated() {
  if (!lastCreatedNodeId || !diagram.nodes[lastCreatedNodeId]) return;
  const rect = nodeRects.get(lastCreatedNodeId);
  if (!rect) {
    render();
    return;
  }
  setSingleSelectedNode(lastCreatedNodeId);
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function moveToRightmostBox() {
  const rightmost = Array.from(nodeRects.entries())
    .filter(([nodeId]) => diagram.nodes[nodeId])
    .sort(([, a], [, b]) => {
      const rightDiff = (b.x + b.width) - (a.x + a.width);
      if (Math.abs(rightDiff) > 0.5) return rightDiff;
      return a.y - b.y;
    })[0];
  if (!rightmost) return;

  const [nodeId, rect] = rightmost;
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function moveToTopmostBox() {
  const topmost = Array.from(nodeRects.entries())
    .filter(([nodeId]) => diagram.nodes[nodeId])
    .sort(([, a], [, b]) => {
      const topDiff = a.y - b.y;
      if (Math.abs(topDiff) > 0.5) return topDiff;
      return a.x - b.x;
    })[0];
  if (!topmost) return;

  const [nodeId, rect] = topmost;
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function moveToBottommostBox() {
  const bottommost = Array.from(nodeRects.entries())
    .filter(([nodeId]) => diagram.nodes[nodeId]?.type === 'plot')
    .sort(([, a], [, b]) => {
      const bottomDiff = (b.y + b.height) - (a.y + a.height);
      if (Math.abs(bottomDiff) > 0.5) return bottomDiff;
      return (b.x + b.width) - (a.x + a.width);
    })[0];
  if (!bottommost) return;

  const [nodeId, rect] = bottommost;
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function moveToLeftmostTopBox() {
  const leftmost = leftmostTopNodeRect();
  if (!leftmost) return;

  const { nodeId, rect } = leftmost;
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function leftmostTopNodeRect() {
  const entry = Array.from(nodeRects.entries())
    .filter(([nodeId]) => diagram.nodes[nodeId])
    .sort(([, a], [, b]) => {
      const leftDiff = a.x - b.x;
      if (Math.abs(leftDiff) > 0.5) return leftDiff;
      return a.y - b.y;
    })[0];
  if (!entry) return null;
  return { nodeId: entry[0], rect: entry[1] };
}

function updateResumeButton() {
  if (resumeButton) resumeButton.disabled = !lastCreatedNodeId || !diagram.nodes[lastCreatedNodeId];
}

function isHorizontallyDraggable(node) {
  return node.type === 'plot' || node.type === 'location' || node.type === 'scene';
}

function branchEdgeDragStarts(nodeIds) {
  const nodeSet = new Set(nodeIds);
  return diagram.edges
    .filter((edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to))
    .map((edge) => ({
      id: edge.id,
      stepX: edge.stepX,
      doglegStartX: edge.doglegStartX,
      doglegEndX: edge.doglegEndX,
      doglegMidX: edge.doglegMidX,
      routeX1: edge.routeX1,
      routeX2: edge.routeX2,
      routeMidX: edge.routeMidX,
      routeHandles: Array.isArray(edge.routeHandles) ? edge.routeHandles.map((handle) => ({ ...handle })) : null,
      points: Array.isArray(edge.points) ? edge.points.map((point) => ({ ...point })) : null,
    }));
}

function isNodeDragZone(event, el) {
  const rect = el.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  return localX <= NODE_DRAG_ZONE || localX >= rect.width - NODE_DRAG_ZONE;
}

function centerSnapForDrag(drag, dx) {
  const primaryRect = nodeRects.get(drag.id);
  const primaryStartX = drag.startXs[drag.id];
  if (!primaryRect || !Number.isFinite(primaryStartX)) return { dx, guideX: null };
  const rawX = primaryStartX + dx;
  const snappedX = snapToGrid(rawX);
  const width = primaryRect.width;
  let best = null;
  nodeRects.forEach((rect, id) => {
    if (drag.ids.includes(id)) return;
    const targetCenter = snapToGrid(rect.x + rect.width / 2);
    const candidateLeft = leftForSnappedCenter(width, targetCenter);
    const distance = Math.abs(candidateLeft - rawX);
    if (distance > SNAP_GAP) return;
    const centerError = Math.abs((candidateLeft + width / 2) - targetCenter);
    const score = distance + centerError * 2;
    if (!best || score < best.score) {
      best = { x: candidateLeft, center: targetCenter, score };
    }
  });
  const nextX = best ? best.x : snappedX;
  return { dx: nextX - primaryStartX, guideX: best ? best.center : null };
}

function showAlignmentGuide(worldX) {
  if (!Number.isFinite(worldX)) {
    hideAlignmentGuide();
    return;
  }
  if (!alignmentGuide) {
    alignmentGuide = document.createElement('div');
    alignmentGuide.className = 'alignment-guide vertical';
    nodeLayer.appendChild(alignmentGuide);
  }
  alignmentGuide.style.left = `${worldX}px`;
}

function hideAlignmentGuide() {
  alignmentGuide?.remove();
  alignmentGuide = null;
}

function isEditingTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function toggleLineMode() {
  lineMode = !lineMode;
  if (lineMode) boxMode = false;
  if (!lineMode) pendingConnector = null;
  render();
}

function toggleBoxMode() {
  boxMode = !boxMode;
  if (boxMode) {
    lineMode = false;
    pendingConnector = null;
  } else {
    selectedGroupId = null;
  }
  render();
}

function openHelp() {
  openDiagramInspector('help');
}

function closeHelp() {
  if (!helpModal || helpModal.hidden) return;
  helpModal.hidden = true;
  helpButton?.focus();
}

function refreshConnectors() {
  connectorLayer.innerHTML = '';
  renderEdges();
}

function syncMetaText(nodeId, text) {
  const node = diagram.nodes[nodeId];
  if (!node || !['metaLabel', 'metaSpan', 'scene', 'sceneSpan'].includes(node.type)) return;
  const peer = pairedMetaNode(nodeId);
  if (!peer || peer.text === text) return;

  peer.text = text;
  const peerEl = Array.from(document.querySelectorAll('.node'))
    .find((candidate) => candidate.dataset.nodeId === peer.id);
  if (!peerEl) return;

  peerEl.textContent = text;
  const nextSize = nodeSize(peer);
  peerEl.style.width = `${nextSize.width}px`;
  peerEl.style.height = `${nextSize.height}px`;
  centerLiveMetaElement(peer, peerEl, nextSize);
}

function centerLiveMetaElement(node, el, size = nodeSize(node)) {
  if (!node || !el || !['metaLabel', 'metaSpan', 'scene', 'sceneSpan'].includes(node.type)) return;
  const centerX = metaCenterX(node, nodeRects);
  if (!Number.isFinite(centerX)) return;
  el.style.left = `${centerX - size.width / 2}px`;
}

function pairedMetaNode(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return null;
  const pairTypes = markerPairTypes(node.type);
  if (!pairTypes) return null;
  const edge = diagram.edges.find((candidate) => (
    candidate.relation === 'attachment'
    && (candidate.from === nodeId || candidate.to === nodeId)
    && diagram.nodes[candidate.from]?.type !== diagram.nodes[candidate.to]?.type
    && [diagram.nodes[candidate.from]?.type, diagram.nodes[candidate.to]?.type].includes(pairTypes.label)
    && [diagram.nodes[candidate.from]?.type, diagram.nodes[candidate.to]?.type].includes(pairTypes.span)
  ));
  if (edge) return diagram.nodes[edge.from === nodeId ? edge.to : edge.from] || null;

  return Object.values(diagram.nodes).find((candidate) => (
    candidate.parentId === node.parentId
    && candidate.id !== nodeId
    && ((node.type === pairTypes.label && candidate.type === pairTypes.span)
      || (node.type === pairTypes.span && candidate.type === pairTypes.label))
  )) || null;
}

function markerPairTypes(type) {
  if (type === 'metaLabel' || type === 'metaSpan') {
    return { label: 'metaLabel', span: 'metaSpan' };
  }
  if (type === 'scene' || type === 'sceneSpan') {
    return { label: 'scene', span: 'sceneSpan' };
  }
  return null;
}

function renderConnectorHandles() {
  if (!lineMode) return;
  const selectedEdge = selectedEdgeId ? diagram.edges.find((edge) => edge.id === selectedEdgeId) : null;
  Object.values(diagram.nodes).forEach((node) => {
    const shouldShow = node.id === activeLineNodeId
      || node.id === endpointDrag?.hoverNodeId
      || node.id === selectedNodeId
      || node.id === pendingConnector?.fromId
      || node.id === selectedEdge?.from
      || node.id === selectedEdge?.to;
    if (!shouldShow) return;
    const rect = nodeRects.get(node.id);
    if (!rect) return;
    ['top', 'right', 'bottom', 'left'].forEach((side) => {
      const endpointRole = selectedEdge && node.id === selectedEdge.from
        ? 'from'
        : selectedEdge && node.id === selectedEdge.to ? 'to' : null;
      const isCurrentEndpoint = (endpointRole === 'from' && (selectedEdge.fromSide || 'right') === side)
        || (endpointRole === 'to' && (selectedEdge.toSide || 'left') === side);
      const point = sidePoint(rect, side);
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'connector-handle';
      if (endpointRole) handle.classList.add('endpoint-target');
      if (isCurrentEndpoint) handle.classList.add('endpoint-current', `endpoint-${endpointRole}`);
      if (pendingConnector?.fromId === node.id && pendingConnector?.fromSide === side) {
        handle.classList.add('pending');
      }
      if (endpointDrag?.hoverNodeId === node.id && endpointDrag?.hoverSide === side) {
        handle.classList.add('pending');
      }
      handle.style.left = `${point.x}px`;
      handle.style.top = `${point.y}px`;
      handle.title = endpointDrag
        ? `Drop to connect ${endpointDrag.role === 'from' ? 'source' : 'target'} to ${side}`
        : endpointRole
        ? (isCurrentEndpoint ? `Drag to move ${endpointRole === 'from' ? 'source' : 'target'} port` : `Move selected connector ${endpointRole === 'from' ? 'source' : 'target'} to ${side}`)
        : pendingConnector ? `Connect to ${side}` : `Start from ${side}`;
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (selectedEdge && endpointRole && isCurrentEndpoint) {
          startConnectorEndpointDrag(event, selectedEdge, endpointRole, node.id);
        }
      });
      handle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (suppressConnectorHandleClick) return;
        if (selectedEdge && endpointRole) {
          if (!isCurrentEndpoint) updateConnectorEndpointSide(selectedEdge.id, endpointRole, side);
          return;
        }
        if (!pendingConnector) {
          startConnector(node.id, side);
        } else if (pendingConnector.fromId === node.id && pendingConnector.fromSide === side) {
          pendingConnector = null;
          render();
        } else {
          finishConnector(node.id, side);
        }
      });
      nodeLayer.appendChild(handle);
    });
  });
}

function nearestSideForPoint(rect, point) {
  const sides = ['top', 'right', 'bottom', 'left'];
  return sides
    .map((side) => {
      const sideCenter = sidePoint(rect, side);
      return {
        side,
        distance: Math.hypot(point.x - sideCenter.x, point.y - sideCenter.y),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.side || 'right';
}

function startConnectorEndpointDrag(event, edge, role, nodeId) {
  endpointDrag = {
    edgeId: edge.id,
    role,
    nodeId,
    pointerId: event.pointerId,
    hoverNodeId: nodeId,
    hoverSide: role === 'from' ? (edge.fromSide || 'right') : (edge.toSide || 'left'),
  };
  selectedEdgeId = edge.id;
  activeLineEdgeId = edge.id;
  pendingConnector = null;
  updateConnectorEndpointDragHover(event);
}

function refreshLineModeHandles() {
  document.querySelectorAll('.connector-handle, .edge-handle').forEach((handle) => handle.remove());
  renderConnectorHandles();
  renderEdgeHandles();
}

function endpointDropCandidateForPoint(point, drag) {
  const edge = diagram.edges.find((item) => item.id === drag.edgeId);
  if (!edge) return null;
  const oppositeNodeId = drag.role === 'from' ? edge.to : edge.from;
  const dropRadius = Math.max(SNAP_GAP * 1.5, 28 / Math.max(transform.scale, 0.1));
  let best = null;
  nodeRects.forEach((rect, nodeId) => {
    if (!diagram.nodes[nodeId] || nodeId === oppositeNodeId) return;
    const expandedContains = point.x >= rect.x - dropRadius
      && point.x <= rect.x + rect.width + dropRadius
      && point.y >= rect.y - dropRadius
      && point.y <= rect.y + rect.height + dropRadius;
    if (!expandedContains) return;
    const side = nearestSideForPoint(rect, point);
    const sideCenter = sidePoint(rect, side);
    const distance = Math.hypot(point.x - sideCenter.x, point.y - sideCenter.y);
    const inside = point.x >= rect.x && point.x <= rect.x + rect.width
      && point.y >= rect.y && point.y <= rect.y + rect.height;
    if (!inside && distance > dropRadius) return;
    const score = inside ? distance * 0.5 : distance;
    if (!best || score < best.score) {
      best = { nodeId, side, score };
    }
  });
  return best;
}

function updateConnectorEndpointDragHover(event) {
  if (!endpointDrag || endpointDrag.pointerId !== event.pointerId) return;
  const candidate = endpointDropCandidateForPoint(worldPointFromEvent(event), endpointDrag);
  const nextNodeId = candidate?.nodeId || null;
  const nextSide = candidate?.side || null;
  if (endpointDrag.hoverNodeId === nextNodeId && endpointDrag.hoverSide === nextSide) return;
  endpointDrag.hoverNodeId = nextNodeId;
  endpointDrag.hoverSide = nextSide;
  activeLineNodeId = nextNodeId;
  refreshLineModeHandles();
}

function finishConnectorEndpointDrag(event) {
  if (!endpointDrag || endpointDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  const drag = endpointDrag;
  const candidate = endpointDropCandidateForPoint(worldPointFromEvent(event), drag);
  endpointDrag = null;
  suppressConnectorHandleClick = true;
  window.setTimeout(() => {
    suppressConnectorHandleClick = false;
  }, 0);
  if (candidate) {
    updateConnectorEndpoint(drag.edgeId, drag.role, candidate.nodeId, candidate.side);
  } else {
    activeLineNodeId = null;
    render();
  }
}

function cancelConnectorEndpointDrag(event = null) {
  if (event && endpointDrag?.pointerId !== event.pointerId) return;
  if (!endpointDrag) return;
  endpointDrag = null;
  activeLineNodeId = null;
  render();
}

function updateConnectorEndpointSide(edgeId, role, side) {
  const edge = diagram.edges.find((item) => item.id === edgeId);
  if (!edge || !['top', 'right', 'bottom', 'left'].includes(side)) return;
  const nodeId = role === 'from' ? edge.from : edge.to;
  updateConnectorEndpoint(edgeId, role, nodeId, side);
}

function updateConnectorEndpoint(edgeId, role, nodeId, side) {
  const edge = diagram.edges.find((item) => item.id === edgeId);
  if (!edge || !diagram.nodes[nodeId] || !['top', 'right', 'bottom', 'left'].includes(side)) return;
  if (role === 'from') {
    if (edge.to === nodeId) return;
    if (edge.from === nodeId && (edge.fromSide || 'right') === side) {
      selectedEdgeId = edge.id;
      activeLineEdgeId = edge.id;
      render();
      return;
    }
    edge.from = nodeId;
    edge.fromSide = side;
  } else if (role === 'to') {
    if (edge.from === nodeId) return;
    if (edge.to === nodeId && (edge.toSide || 'left') === side) {
      selectedEdgeId = edge.id;
      activeLineEdgeId = edge.id;
      render();
      return;
    }
    edge.to = nodeId;
    edge.toSide = side;
  } else {
    return;
  }
  resetEdgeRouteState(edge);
  selectedEdgeId = edge.id;
  activeLineEdgeId = edge.id;
  activeLineNodeId = nodeId;
  pendingConnector = null;
  render();
}

function renderEdges() {
  renderConnectorDefs();
  diagram.edges.forEach((edge) => {
    if (isSharedPlotAttachmentEdge(edge)) return;
    const from = nodeRects.get(edge.from);
    const to = nodeRects.get(edge.to);
    if (!from || !to) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edgePath(from, to, edge.relation, edge));
    path.setAttribute('class', ['connector', displayEdgeType(edge), selectedEdgeId === edge.id ? 'selected' : '', storyFilterClassForItem(edge)].filter(Boolean).join(' '));
    applyEdgeMarkers(path, edge);
    path.dataset.edgeId = edge.id;
    path.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      selectedNodeId = null;
      selectedNodeIds = new Set();
      selectedGroupId = null;
      selectedEdgeId = edge.id;
      activeLineEdgeId = edge.id;
      syncLineStyleControls(edge.type || 'solid');
      updateSelectionVisuals();
      updateSelectionDetails();
    });
    path.addEventListener('pointerenter', () => {
      if (!lineMode) return;
      activeLineEdgeId = edge.id;
      render();
    });
    path.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      lineMode = true;
      boxMode = false;
      selectedEdgeId = edge.id;
      activeLineEdgeId = edge.id;
      selectedNodeId = null;
      selectedNodeIds = new Set();
      render();
    });
    path.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectedNodeId = null;
      selectedNodeIds = new Set();
      selectedGroupId = null;
      selectedEdgeId = edge.id;
      activeLineEdgeId = edge.id;
      syncLineStyleControls(edge.type || 'solid');
      updateSelectionVisuals();
      updateSelectionDetails();
      showEdgeMenu(edge.id, event.clientX, event.clientY);
    });
    connectorLayer.appendChild(path);
  });
  renderSharedPlotAttachmentConnectors();
}

function isSharedPlotAttachmentEdge(edge) {
  if (edge.relation !== 'attachment') return false;
  const fromNode = diagram.nodes[edge.from];
  const toNode = diagram.nodes[edge.to];
  return fromNode?.type === 'plot' && (toNode?.type === 'note' || toNode?.type === 'character');
}

function plotAttachmentNodes(plotId) {
  const notes = Object.values(diagram.nodes)
    .filter((node) => node.type === 'note' && node.parentId === plotId)
    .sort((a, b) => (a.noteOrder ?? a.slot ?? 0) - (b.noteOrder ?? b.slot ?? 0));
  const characters = Object.values(diagram.nodes)
    .filter((node) => node.type === 'character' && node.parentId === plotId)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return [...notes, ...characters].filter((node) => nodeRects.has(node.id));
}

function renderSharedPlotAttachmentConnectors() {
  Object.values(diagram.nodes)
    .filter((node) => node.type === 'plot')
    .forEach((plot) => {
      const parentRect = nodeRects.get(plot.id);
      const attachments = plotAttachmentNodes(plot.id);
      if (!parentRect || !attachments.length) return;
      const rects = attachments.map((node) => nodeRects.get(node.id)).filter(Boolean);
      const path = sharedPlotAttachmentPath(parentRect, rects);
      if (!path) return;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', path);
      el.setAttribute('class', 'connector solid attachment-bus');
      connectorLayer.appendChild(el);
    });
}

function sharedPlotAttachmentPath(parentRect, attachmentRects) {
  const columns = [];
  attachmentRects.forEach((rect) => {
    const centerX = rect.x + rect.width / 2;
    const existing = columns.find((column) => Math.abs(column.x - centerX) < 1);
    if (existing) {
      existing.top = Math.min(existing.top, rect.y);
      existing.bottom = Math.max(existing.bottom, rect.y + rect.height);
    } else {
      columns.push({ x: centerX, top: rect.y, bottom: rect.y + rect.height });
    }
  });
  if (!columns.length) return '';
  columns.sort((a, b) => a.x - b.x);
  const sx = parentRect.x + parentRect.width / 2;
  const sy = parentRect.y + parentRect.height;
  if (columns.length === 1) {
    return `M ${sx} ${sy} V ${columns[0].bottom}`;
  }
  const busY = Math.min(...columns.map((column) => column.top)) - STACK_GAP;
  const minX = Math.min(sx, columns[0].x);
  const maxX = Math.max(sx, columns.at(-1).x);
  const parts = [`M ${sx} ${sy} V ${busY}`, `M ${minX} ${busY} H ${maxX}`];
  columns.forEach((column) => {
    parts.push(`M ${column.x} ${busY} V ${column.bottom}`);
  });
  return parts.join(' ');
}

function renderConnectorDefs() {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" class="connector-arrow"/>
    </marker>`;
  connectorLayer.appendChild(defs);
}

function applyEdgeMarkers(path, edge) {
  const arrows = edge.arrows || 'none';
  if (arrows === 'start' || arrows === 'both') path.setAttribute('marker-start', 'url(#arrowHead)');
  if (arrows === 'end' || arrows === 'both') path.setAttribute('marker-end', 'url(#arrowHead)');
}

function renderMiniMap() {
  if (!miniMapSvg) return;
  miniMapSvg.innerHTML = '';
  if (!nodeRects.size) return;

  const bounds = diagramBounds();
  miniMapSvg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  miniMapSvg.dataset.bounds = JSON.stringify(bounds);

  nodeRects.forEach((rect, nodeId) => {
    const node = diagram.nodes[nodeId];
    if (!node) return;
    const miniNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    miniNode.setAttribute('x', rect.x);
    miniNode.setAttribute('y', rect.y);
    miniNode.setAttribute('width', rect.width);
    miniNode.setAttribute('height', rect.height);
    miniNode.setAttribute('class', [
      'mini-node',
      `mini-${node.type}`,
      node.variant === 'beginning' ? 'mini-beginning' : '',
      node.variant === 'end' ? 'mini-end' : '',
    ].filter(Boolean).join(' '));
    miniNode.setAttribute('fill', nodeFillColor(node));
    miniMapSvg.appendChild(miniNode);
  });

  const viewportRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  viewportRect.id = 'miniMapViewport';
  viewportRect.setAttribute('class', 'mini-viewport');
  miniMapSvg.appendChild(viewportRect);
  updateMiniMapViewport();
}

function nodeFillColor(node, { dark = darkTheme } = {}) {
  if (!node) return styleColorForKey('plot', { dark });
  if (node.type === 'plot') return plotVariantColor(node.variant, { dark });
  if (node.type === 'location') return styleColorForKey('location', { dark });
  if (node.type === 'character') return styleColorForKey('character', { dark });
  if (node.type === 'note') return styleColorForKey('note', { dark });
  if (node.type === 'metaLabel') return styleColorForKey('metaLabel', { dark });
  if (node.type === 'metaSpan') return styleColorForKey('metaSpan', { dark });
  if (node.type === 'scene' || node.type === 'sceneSpan') return styleColorForKey('scene', { dark });
  if (node.type === 'time') return styleColorForKey('time', { dark });
  if (node.type === 'timePassage' || node.type === 'timejump') return styleColorForKey('timePassage', { dark });
  return styleColorForKey('plot', { dark });
}

function updateMiniMapViewport() {
  const viewportRect = document.getElementById('miniMapViewport');
  if (!viewportRect || !viewport) return;
  viewportRect.setAttribute('x', (-transform.x) / transform.scale);
  viewportRect.setAttribute('y', (-transform.y) / transform.scale);
  viewportRect.setAttribute('width', viewport.clientWidth / transform.scale);
  viewportRect.setAttribute('height', viewport.clientHeight / transform.scale);
}

function diagramBounds() {
  const rects = Array.from(nodeRects.values());
  if (!rects.length) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  const margin = Math.round(INCH * 0.5);

  return {
    x: minX - margin,
    y: minY - margin,
    width: Math.max(1, maxX - minX + margin * 2),
    height: Math.max(1, maxY - minY + margin * 2),
  };
}

function panToWorldPoint(x, y) {
  setTransformToWorldPoint(x, y);
  updateTransform();
}

function setTransformToWorldPoint(x, y) {
  transform.x = viewport.clientWidth / 2 - x * transform.scale;
  transform.y = viewport.clientHeight / 2 - y * transform.scale;
}

function worldPointFromEvent(event) {
  const box = viewport.getBoundingClientRect();
  return {
    x: (event.clientX - box.left - transform.x) / transform.scale,
    y: (event.clientY - box.top - transform.y) / transform.scale,
  };
}

function isCanvasBackgroundEvent(event) {
  return event.target === viewport
    || event.target === canvas
    || event.target === groupLayer
    || event.target === connectorLayer;
}

function startViewportPan(event) {
  hideMenu();
  stopAutoPan();
  isPanning = true;
  panStart = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('dragging');
}

function startAutoPan(event) {
  hideMenu();
  isPanning = false;
  panStart = null;
  autoPan = {
    originX: event.clientX,
    originY: event.clientY,
    pointerX: event.clientX,
    pointerY: event.clientY,
    pointerId: event.pointerId,
  };
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('auto-panning');
  autoPanFrame = requestAnimationFrame(tickAutoPan);
}

function updateAutoPanPointer(event) {
  if (!autoPan) return;
  autoPan.pointerX = event.clientX;
  autoPan.pointerY = event.clientY;
}

function tickAutoPan() {
  if (!autoPan) return;
  const deadZone = 8;
  const dx = autoPan.pointerX - autoPan.originX;
  const dy = autoPan.pointerY - autoPan.originY;
  const speedX = Math.abs(dx) <= deadZone ? 0 : dx / 14;
  const speedY = Math.abs(dy) <= deadZone ? 0 : dy / 14;
  transform.x -= speedX;
  transform.y -= speedY;
  updateTransform();
  autoPanFrame = requestAnimationFrame(tickAutoPan);
}

function stopAutoPan() {
  if (autoPanFrame) cancelAnimationFrame(autoPanFrame);
  if (autoPan?.pointerId) {
    try {
      viewport.releasePointerCapture(autoPan.pointerId);
    } catch {}
  }
  autoPanFrame = null;
  autoPan = null;
  viewport.classList.remove('auto-panning');
}

function startLocationAutoPan(event) {
  hideMenu();
  isLocationPanning = false;
  locationPanStart = null;
  locationAutoPan = {
    originY: event.clientY,
    pointerY: event.clientY,
    pointerId: event.pointerId,
  };
  locationColumn.setPointerCapture(event.pointerId);
  locationColumn.classList.add('auto-panning');
  locationAutoPanFrame = requestAnimationFrame(tickLocationAutoPan);
}

function updateLocationAutoPanPointer(event) {
  if (!locationAutoPan) return;
  locationAutoPan.pointerY = event.clientY;
}

function tickLocationAutoPan() {
  if (!locationAutoPan) return;
  const deadZone = 8;
  const dy = locationAutoPan.pointerY - locationAutoPan.originY;
  const speedY = Math.abs(dy) <= deadZone ? 0 : dy / 14;
  transform.y -= speedY;
  updateTransform();
  locationAutoPanFrame = requestAnimationFrame(tickLocationAutoPan);
}

function stopLocationAutoPan() {
  if (locationAutoPanFrame) cancelAnimationFrame(locationAutoPanFrame);
  if (locationAutoPan?.pointerId) {
    try {
      locationColumn.releasePointerCapture(locationAutoPan.pointerId);
    } catch {}
  }
  locationAutoPanFrame = null;
  locationAutoPan = null;
  locationColumn?.classList.remove('auto-panning');
}

function fitDiagramHeight() {
  const bounds = contentBounds();
  if (!bounds.height || !viewport) return;
  const margin = Math.round(INCH * 0.35);
  const availableHeight = Math.max(1, viewport.clientHeight - margin * 2);
  const oldScale = transform.scale;
  const nextScale = Math.max(0.08, Math.min(4, availableHeight / bounds.height));
  const currentWorldCenterX = (viewport.clientWidth / 2 - transform.x) / oldScale;
  transform.scale = nextScale;
  transform.x = viewport.clientWidth / 2 - currentWorldCenterX * nextScale;
  transform.y = margin - bounds.y * nextScale;
  updateTransform();
}

function renderLocationOutline() {
  if (!locationOutline || !locationOutlineNodes || !locationOutlineLines) return;
  locationOutlineNodes.innerHTML = '';
  locationOutlineLines.innerHTML = '';

  let contentRight = 0;
  let maxBottom = 0;
  const outlineLocationRects = new Map();
  const outlineGroupRects = new Map();
  const markerGroups = markerRailGroups();
  const childLocationIds = childLocationIdSet();

  const ensureGroupRect = (groupId, childY) => {
    const group = diagram.locationGroups?.[groupId];
    if (!group) return null;
    const existing = outlineGroupRects.get(groupId);
    if (existing) return existing;

    const parentRect = group.parentGroupId ? ensureGroupRect(group.parentGroupId, childY) : null;
    const trunkX = parentRect ? parentRect.childTrunkX : 0;
    const groupSize = nodeSize({ type: 'location', text: group.text || 'Group' });
    const groupX = parentRect ? trunkX + SNAP_GAP : 0;
    const groupY = childY;
    const childTrunkX = groupX + groupSize.width + SNAP_GAP;
    const groupBox = outlineButton(group.text || 'Group', 'outline-box outline-location', true);
    groupBox.dataset.locationGroupId = groupId;
    placeOutlineBox(groupBox, groupX, groupY, groupSize.width, groupSize.height);
    groupBox.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showLocationGroupMenu(groupId, event.clientX, event.clientY);
    });
    groupBox.addEventListener('blur', () => updateLocationGroupText(groupId, groupBox.textContent));
    groupBox.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      groupBox.blur();
    });
    locationOutlineNodes.appendChild(groupBox);
    const rect = { x: groupX, y: groupY, width: groupSize.width, height: groupSize.height, childTrunkX };
    outlineGroupRects.set(groupId, rect);
    if (parentRect) {
      drawOutlineLine(parentRect.x + parentRect.width, parentRect.y + parentRect.height / 2, trunkX, groupY + groupSize.height / 2);
      drawOutlineLine(trunkX, groupY + groupSize.height / 2, groupX, groupY + groupSize.height / 2);
    }
    contentRight = Math.max(contentRight, groupX + groupSize.width);
    maxBottom = Math.max(maxBottom, groupY + groupSize.height);
    return rect;
  };

  const childGroupItems = (parentGroupId) => Object.values(diagram.locationGroups || {})
    .filter((group) => (group.parentGroupId || null) === (parentGroupId || null))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.text || '').localeCompare(b.text || ''));

  const groupSubtreeBottom = (groupId) => {
    const rect = outlineGroupRects.get(groupId);
    let bottom = rect ? rect.y + rect.height : 0;
    Object.values(diagram.nodes || {}).forEach((node) => {
      if (node.type !== 'location' || !locationBelongsToGroupSubtree(node, groupId)) return;
      const rect = outlineLocationRects.get(node.id);
      if (rect) bottom = Math.max(bottom, rect.y + rect.height);
    });
    childGroupItems(groupId).forEach((childGroup) => {
      bottom = Math.max(bottom, groupSubtreeBottom(childGroup.id));
    });
    return bottom;
  };

  const nextGroupChildY = (parentGroupId) => {
    if (!parentGroupId) return maxBottom + GAP;
    const parentRect = outlineGroupRects.get(parentGroupId);
    const childBottom = groupSubtreeBottom(parentGroupId);
    return Math.max(
      parentRect ? parentRect.y + parentRect.height + GAP : maxBottom + GAP,
      childBottom ? childBottom + GAP : 0,
    );
  };

  const ensureEmptyGroupRect = (groupId) => {
    if (outlineGroupRects.has(groupId)) return outlineGroupRects.get(groupId);
    const group = diagram.locationGroups?.[groupId];
    if (!group) return null;
    if (group.parentGroupId && !outlineGroupRects.has(group.parentGroupId)) {
      ensureEmptyGroupRect(group.parentGroupId);
    }
    return ensureGroupRect(groupId, nextGroupChildY(group.parentGroupId || null));
  };

  markerGroups.forEach((group) => {
    const markerNodes = group.nodes;
    const markerRects = markerNodes.map((node) => nodeRects.get(node.id)).filter(Boolean);
    const markerY = Math.min(...markerRects.map((rect) => rect.y));
    const label = markerRailLabel(group.kind);
    const markerLocation = { type: 'location', text: label };
    const markerLocationSize = nodeSize(markerLocation);
    const markerLocationY = markerY + 5;
    const plotX = markerLocationSize.width + LOCATION_GAP;
    const segmentWidth = OUTLINE_MARKER_SEGMENT_WIDTH;
    const stripWidth = markerNodes.length * segmentWidth - Math.max(0, markerNodes.length - 1) * BOX_BORDER;
    const markerBox = outlineButton(label, 'outline-box outline-location', true);
    placeOutlineBox(markerBox, 0, markerLocationY, markerLocationSize.width, markerLocationSize.height);
    markerBox.addEventListener('blur', () => updateMarkerRailLabel(group.kind, markerBox.textContent));
    markerBox.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      markerBox.blur();
    });
    locationOutlineNodes.appendChild(markerBox);

    markerNodes.forEach((markerNode, index) => {
      const segment = outlineButton('', 'outline-box outline-marker-segment');
      segment.style.background = outlineFillForNode(markerNode);
      segment.title = markerNode.text || defaultTextFor(markerNode.type);
      placeOutlineBox(segment, plotX + index * (segmentWidth - BOX_BORDER), markerY, segmentWidth, PLOT_HEIGHT);
      segment.addEventListener('click', () => navigateToNode(markerNode.id));
      locationOutlineNodes.appendChild(segment);
    });
    drawOutlineLine(markerLocationSize.width, markerLocationY + markerLocationSize.height / 2, plotX, markerY + PLOT_HEIGHT / 2);
    contentRight = Math.max(contentRight, plotX + stripWidth);
    maxBottom = Math.max(maxBottom, markerY + PLOT_HEIGHT, markerLocationY + markerLocationSize.height);
  });

  diagram.railOrder.forEach((railId) => {
    const rail = diagram.rails[railId];
    if (!rail) return;
    const location = diagram.nodes[rail.locationId];
    const locationRect = nodeRects.get(rail.locationId);
    const firstPlotRect = nodeRects.get(rail.plotIds[0]);
    if (!locationRect || !firstPlotRect) return;

    const parentRect = location?.parentLocationId
      ? outlineLocationRects.get(location.parentLocationId)
      : location?.groupId ? ensureGroupRect(location.groupId, locationRect.y) : null;
    const trunkX = parentRect ? parentRect.childTrunkX : 0;
    const locationX = parentRect ? trunkX + SNAP_GAP : 0;
    const locationY = locationRect.y;
    const childTrunkX = locationX + locationRect.width + SNAP_GAP;
    const locationBox = outlineButton(location?.text || 'Location', 'outline-box outline-location', true);
    placeOutlineBox(locationBox, locationX, locationY, locationRect.width, locationRect.height);
    outlineLocationRects.set(rail.locationId, { x: locationX, y: locationY, width: locationRect.width, height: locationRect.height, childTrunkX });
    if (parentRect) {
      drawOutlineLine(parentRect.x + parentRect.width, parentRect.y + parentRect.height / 2, trunkX, locationY + locationRect.height / 2);
      drawOutlineLine(trunkX, locationY + locationRect.height / 2, locationX, locationY + locationRect.height / 2);
    }
    contentRight = Math.max(contentRight, locationX + locationRect.width);
    locationBox.addEventListener('click', () => navigateToNode(rail.locationId));
    locationBox.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectNode(rail.locationId);
      showNodeMenu(rail.locationId, event.clientX, event.clientY);
    });
    locationBox.addEventListener('blur', () => updateOutlineLocationText(rail.locationId, locationBox.textContent));
    locationBox.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      locationBox.blur();
    });
    locationOutlineNodes.appendChild(locationBox);

    const meta = firstRailMeta(rail);
    const maxCharacters = maxRailCharacterCount(rail);
    const maxPlotNotes = maxRailPlotNoteCount(rail);
    const visiblePlotNotes = Math.min(maxPlotNotes, CHARACTER_COLUMN_LIMIT);
    const visibleCharacters = Math.min(maxCharacters, Math.max(0, CHARACTER_COLUMN_LIMIT - visiblePlotNotes));
    const plotWidth = OUTLINE_COMPACT_PLOT_WIDTH;
    const characterOverhang = Math.max(0, (OUTLINE_COMPACT_CHARACTER_WIDTH - plotWidth) / 2);
    const clearChildTrunkPlotX = childLocationIds.has(rail.locationId) && Math.max(maxCharacters, maxPlotNotes) > 0
      ? childTrunkX + GAP + characterOverhang
      : 0;
    const plotX = Math.max(locationX + locationRect.width + LOCATION_GAP, clearChildTrunkPlotX);
    const plotY = firstPlotRect.y;
    if (meta) {
      const metaBox = outlineButton('', 'outline-box outline-meta');
      placeOutlineBox(metaBox, plotX, plotY - META_SPAN_HEIGHT - 2, plotWidth, META_SPAN_HEIGHT);
      metaBox.addEventListener('click', () => navigateToNode(meta.id));
      locationOutlineNodes.appendChild(metaBox);
    }

    const firstPlotId = rail.plotIds[0];
    const lastPlotId = rail.plotIds.at(-1);
    const plotBox = outlineButton('', 'outline-box outline-plot');
    placeOutlineBox(plotBox, plotX, plotY, plotWidth, firstPlotRect.height);
    applyOutlinePlotFill(plotBox, diagram.nodes[firstPlotId], diagram.nodes[lastPlotId]);
    contentRight = Math.max(contentRight, plotX + plotWidth);
    const splitLine = document.createElement('span');
    splitLine.className = 'outline-plot-split';
    plotBox.appendChild(splitLine);
    plotBox.addEventListener('click', (event) => {
      const box = plotBox.getBoundingClientRect();
      const localX = event.clientX - box.left;
      navigateToNode(localX <= box.width / 2 ? firstPlotId : lastPlotId);
    });
    locationOutlineNodes.appendChild(plotBox);
    drawOutlineLine(locationX + locationRect.width, locationY + locationRect.height / 2, plotX, plotY + firstPlotRect.height / 2);

    let stackY = plotY + firstPlotRect.height + GAP;
    let previousStackBottom = plotY + firstPlotRect.height;
    for (let index = 0; index < visiblePlotNotes; index += 1) {
      const noteBox = outlineButton('', 'outline-box outline-note');
      const noteX = plotX + plotWidth / 2 - OUTLINE_COMPACT_CHARACTER_WIDTH / 2;
      placeOutlineBox(noteBox, noteX, stackY, OUTLINE_COMPACT_CHARACTER_WIDTH, NOTE_HEIGHT);
      locationOutlineNodes.appendChild(noteBox);
      drawOutlineLine(plotX + plotWidth / 2, previousStackBottom, plotX + plotWidth / 2, stackY);
      contentRight = Math.max(contentRight, noteX + OUTLINE_COMPACT_CHARACTER_WIDTH);
      previousStackBottom = stackY + NOTE_HEIGHT;
      stackY += NOTE_HEIGHT + STACK_GAP;
    }
    if (visibleCharacters > 0) {
      const characterX = plotX + plotWidth / 2 - OUTLINE_COMPACT_CHARACTER_WIDTH / 2;
      for (let index = 0; index < visibleCharacters; index += 1) {
        const characterBox = outlineButton('', 'outline-box outline-character');
        placeOutlineBox(characterBox, characterX, stackY, OUTLINE_COMPACT_CHARACTER_WIDTH, NOTE_HEIGHT);
        locationOutlineNodes.appendChild(characterBox);
        drawOutlineLine(plotX + plotWidth / 2, previousStackBottom, plotX + plotWidth / 2, stackY);
        contentRight = Math.max(contentRight, characterX + OUTLINE_COMPACT_CHARACTER_WIDTH);
        previousStackBottom = stackY + NOTE_HEIGHT;
        stackY += NOTE_HEIGHT + STACK_GAP;
      }
    }
    maxBottom = Math.max(maxBottom, locationY + locationRect.height, plotY + firstPlotRect.height, stackY);
  });

  childGroupItems(null).forEach(function renderMissingGroups(group) {
    ensureEmptyGroupRect(group.id);
    childGroupItems(group.id).forEach(renderMissingGroups);
  });

  const contentWidth = Math.ceil(contentRight + OUTLINE_PANEL_RIGHT_PADDING);
  locationOutline.dataset.contentWidth = String(contentWidth);
  locationOutline.style.width = `${contentWidth}px`;
  locationOutline.style.height = `${Math.max(maxBottom + GAP, locationColumn.clientHeight)}px`;
  locationOutlineNodes.style.width = `${contentWidth}px`;
  locationOutlineLines.setAttribute('width', contentWidth);
  locationOutlineLines.setAttribute('height', Math.max(maxBottom + GAP, locationColumn.clientHeight));
  updateLocationColumnWidth();
}

function outlineButton(text, className, editable = false) {
  const button = document.createElement(editable ? 'div' : 'button');
  if (!editable) button.type = 'button';
  button.className = className;
  button.textContent = text;
  if (editable) {
    button.contentEditable = 'true';
    button.spellcheck = false;
    button.tabIndex = 0;
  }
  return button;
}

function applyOutlinePlotFill(el, firstNode, lastNode) {
  const left = outlineFillForNode(firstNode);
  const right = outlineFillForNode(lastNode || firstNode);
  el.style.background = `linear-gradient(90deg, ${left} 0 50%, ${right} 50% 100%)`;
}

function outlineFillForNode(node) {
  if (!node) return 'var(--plot)';
  if (node.type === 'metaLabel') return 'var(--meta-label)';
  if (node.type === 'metaSpan') return 'var(--meta-span)';
  if (node.type === 'scene' || node.type === 'sceneSpan') return 'var(--scene)';
  if (node.type === 'time') return 'var(--time)';
  if (node.type === 'timePassage') return 'var(--timejump)';
  if (node.type !== 'plot') return `var(--${node.type})`;
  if (!node.variant || node.variant === 'normal') return 'var(--plot)';
  return `var(--${node.variant})`;
}

function placeOutlineBox(box, x, y, width, height) {
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
}

function drawOutlineLine(x1, y1, x2, y2) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M ${x1} ${y1} H ${x2} V ${y2}`);
  path.setAttribute('class', 'location-outline-line');
  locationOutlineLines.appendChild(path);
}

function firstRailMeta(rail) {
  const plotId = rail.plotIds.find((id) => (
    Object.values(diagram.nodes).some((node) => node.parentId === id && node.type === 'metaSpan')
  ));
  return Object.values(diagram.nodes).find((node) => node.parentId === plotId && node.type === 'metaSpan') || null;
}

function maxRailCharacterCount(rail) {
  return rail.plotIds.reduce((max, plotId) => {
    const count = Object.values(diagram.nodes)
      .filter((node) => node.parentId === plotId && node.type === 'character')
      .length;
    return Math.max(max, count);
  }, 0);
}

function maxRailPlotNoteCount(rail) {
  return rail.plotIds.reduce((max, plotId) => Math.max(max, directPlotNotes(plotId).length), 0);
}

function childLocationIdSet() {
  return new Set(Object.values(diagram.nodes)
    .filter((node) => node.type === 'location' && node.parentLocationId)
    .map((node) => node.parentLocationId));
}

function markerRailNodes() {
  return Object.values(diagram.nodes)
    .filter((node) => node.type === 'metaLabel' || (node.type === 'scene' && node.parentId) || node.type === 'time')
    .map((node) => ({ node, rect: nodeRects.get(node.id) }))
    .filter((item) => item.rect)
    .sort((a, b) => {
      const xDiff = a.rect.x - b.rect.x;
      return Math.abs(xDiff) > 0.5 ? xDiff : a.rect.y - b.rect.y;
    })
    .map((item) => item.node);
}

function markerRailGroups() {
  return [
    { kind: 'films', nodes: markerRailNodesByType('metaLabel') },
    { kind: 'scenes', nodes: markerRailNodesByType('scene') },
    { kind: 'years', nodes: markerRailNodesByType('time') },
  ].filter((group) => group.nodes.length);
}

function markerRailNodesByType(type) {
  return Object.values(diagram.nodes)
    .filter((node) => node.type === type && (type !== 'scene' || node.parentId))
    .map((node) => ({ node, rect: nodeRects.get(node.id) }))
    .filter((item) => item.rect)
    .sort((a, b) => {
      const xDiff = a.rect.x - b.rect.x;
      return Math.abs(xDiff) > 0.5 ? xDiff : a.rect.y - b.rect.y;
    })
    .map((item) => item.node);
}

function markerRailLabel(kind) {
  if (kind === 'films') return diagram.filmRailLabel || 'Films';
  if (kind === 'scenes') return diagram.sceneRailLabel || 'Scenes / Chapters';
  if (kind === 'years') return diagram.yearRailLabel || 'Years';
  return diagram.markerRailLabel || 'Years / Films';
}

function updateMarkerRailLabel(kind, text) {
  if (kind === 'films') {
    diagram.filmRailLabel = text.trim() || 'Films';
  } else if (kind === 'scenes') {
    diagram.sceneRailLabel = text.trim() || 'Scenes / Chapters';
  } else if (kind === 'years') {
    diagram.yearRailLabel = text.trim() || 'Years';
  } else {
    diagram.markerRailLabel = text.trim() || 'Years / Films';
  }
  render();
}

function updateOutlineLocationText(nodeId, text) {
  const node = diagram.nodes[nodeId];
  if (!node) return;
  node.text = text.trim() || defaultTextFor(node.type);
  render();
}

function navigateToNode(nodeId) {
  const rect = nodeRects.get(nodeId);
  if (!rect) return;
  selectedNodeId = nodeId;
  selectedEdgeId = null;
  panToWorldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  updateSelectionVisuals();
  updateSelectionDetails();
}

function syncLocationColumnScroll() {
  if (!locationColumn || !locationOutline || locationColumn.hidden) return;
  locationOutline.style.transform = `translateY(${transform.y - locationOutline.offsetTop}px) scale(${transform.scale})`;
  locationColumn.style.backgroundPosition = `0 ${transform.y % 24}px`;
  updateLocationColumnWidth();
}

function updateTimePassageLabels() {
  if (!viewport) return;
  const worldTop = -transform.y / transform.scale;
  const worldBottom = (viewport.clientHeight - transform.y) / transform.scale;
  const worldLeft = -transform.x / transform.scale;
  const worldRight = (viewport.clientWidth - transform.x) / transform.scale;
  document.querySelectorAll('.node.timePassage').forEach((el) => {
    const nodeId = el.dataset.nodeId;
    const rect = nodeRects.get(nodeId);
    const label = el.querySelector('.time-passage-label');
    if (!rect || !label) return;
    const horizontallyVisible = rect.x < worldRight && rect.x + rect.width > worldLeft;
    const visibleTop = Math.max(rect.y, worldTop);
    const visibleBottom = Math.min(rect.y + rect.height, worldBottom);
    const visibleHeight = visibleBottom - visibleTop;
    if (!horizontallyVisible || visibleHeight < 75) {
      label.hidden = true;
      return;
    }
    label.hidden = false;
    label.style.top = `${visibleTop + visibleHeight / 2 - rect.y}px`;
  });
}

function updateLocationColumnWidth() {
  if (!workspaceShell || !locationOutline || locationColumn?.hidden) return;
  const contentWidth = Number(locationOutline.dataset.contentWidth) || 254;
  const scaledWidth = Math.ceil(contentWidth * transform.scale + OUTLINE_PANEL_PADDING + OUTLINE_PANEL_RIGHT_PADDING);
  const maxWidth = Math.max(24, Math.floor(window.innerWidth * 0.5));
  const visibleWidth = Math.min(Math.max(24, scaledWidth), maxWidth);
  workspaceShell.style.setProperty('--location-column-width', `${visibleWidth}px`);
  locationOutline.style.setProperty('--location-outline-scroll-width', `${Math.max(0, scaledWidth)}px`);
}

function renderEdgeHandles() {
  if (!lineMode) return;
  diagram.edges.forEach((edge) => {
    if (edge.id !== activeLineEdgeId && edge.id !== selectedEdgeId) return;
    const from = nodeRects.get(edge.from);
    const to = nodeRects.get(edge.to);
    if (!from || !to) return;
    edgeHandlePoints(from, to, edge).forEach((handlePoint) => {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'edge-handle';
      if (selectedEdgeId === edge.id) handle.classList.add('selected');
      handle.style.left = `${handlePoint.x}px`;
      handle.style.top = `${handlePoint.y}px`;
      handle.title = 'Drag to adjust line; right-click to delete';
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectedNodeId = null;
        selectedNodeIds = new Set();
        selectedGroupId = null;
        selectedEdgeId = edge.id;
        activeLineEdgeId = edge.id;
        edgeDrag = {
          edgeId: edge.id,
          mode: handlePoint.mode,
          property: handlePoint.property,
          handleId: handlePoint.handleId,
          axis: handlePoint.axis,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startValue: handlePoint.axis === 'x' ? handlePoint.x : handlePoint.y,
          defaultValue: handlePoint.value,
        };
        handle.setPointerCapture(event.pointerId);
        updateSelectionVisuals();
        updateSelectionDetails();
      });
      handle.addEventListener('pointermove', (event) => {
        if (!edgeDrag || edgeDrag.edgeId !== edge.id) return;
        const target = diagram.edges.find((item) => item.id === edge.id);
        if (!target) return;
        target.manualRouting = true;
      if (edgeDrag.axis === 'x') {
          const dx = (event.clientX - edgeDrag.startClientX) / transform.scale;
          const nextX = snapToGrid((edgeDrag.startValue ?? edgeDrag.defaultValue) + dx);
          if (edgeDrag.handleId) {
            setRouteHandle(target, edgeDrag.handleId, { x: nextX, y: handlePoint.y, axisLock: 'x' });
          } else if (edgeDrag.property) {
            target[edgeDrag.property] = nextX;
          }
          handle.style.left = `${nextX}px`;
        } else if (edgeDrag.axis === 'y') {
          const dy = (event.clientY - edgeDrag.startClientY) / transform.scale;
          const nextY = snapToGrid((edgeDrag.startValue ?? edgeDrag.defaultValue) + dy);
          if (edgeDrag.handleId) {
            setRouteHandle(target, edgeDrag.handleId, { x: handlePoint.x, y: nextY, axisLock: 'y' });
          } else if (edgeDrag.property) {
            target[edgeDrag.property] = nextY;
          }
          handle.style.top = `${nextY}px`;
        } else {
          const dx = (event.clientX - edgeDrag.startClientX) / transform.scale;
          const dy = (event.clientY - edgeDrag.startClientY) / transform.scale;
          const nextX = snapToGrid(handlePoint.x + dx);
          const nextY = snapToGrid(handlePoint.y + dy);
          setRouteHandle(target, edgeDrag.handleId, { x: nextX, y: nextY, axisLock: 'both' });
          handle.style.left = `${nextX}px`;
          handle.style.top = `${nextY}px`;
        }
        updateGhostEdge(target);
      });
      handle.addEventListener('pointerup', (event) => {
        if (!edgeDrag || edgeDrag.edgeId !== edge.id) return;
        edgeDrag = null;
        handle.releasePointerCapture(event.pointerId);
        removeGhostEdge();
        render();
      });
      handle.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectedNodeId = null;
        selectedNodeIds = new Set();
        selectedEdgeId = edge.id;
        activeLineEdgeId = edge.id;
        syncLineStyleControls(edge.type || 'solid');
        updateSelectionVisuals();
        updateSelectionDetails();
        showEdgeMenu(edge.id, event.clientX, event.clientY);
      });
      nodeLayer.appendChild(handle);
    });
  });
}

function edgeHandlePoint(from, to, edge) {
  return edgeHandlePoints(from, to, edge)[0] || { x: 0, y: 0 };
}

function setRouteHandle(edge, handleId, patch) {
  if (!handleId) return;
  edge.routeHandles = Array.isArray(edge.routeHandles) ? edge.routeHandles : [];
  const existing = edge.routeHandles.find((handle) => handle.id === handleId);
  if (existing) {
    Object.assign(existing, patch, { id: handleId, userMoved: true });
  } else {
    edge.routeHandles.push({ id: handleId, kind: patch.axisLock === 'x' ? 'verticalRail' : 'horizontalRail', ...patch, userMoved: true });
  }
}

function edgeHandlePoints(from, to, edge) {
  if (edge.relation === 'manual') {
    return manualRoute(from, to, edge).handles.map((handle) => ({
      ...handle,
      handleId: handle.id || null,
      axis: handle.axisLock || handle.axis,
      property: handle.property || handle.id,
      value: (handle.axisLock || handle.axis) === 'x' ? handle.x : handle.y,
    }));
  }

  return [{
    x: (from.x + from.width + to.x) / 2,
    y: (from.y + from.height / 2 + to.y + to.height / 2) / 2,
    axis: 'x',
    property: 'stepX',
    value: (from.x + from.width + to.x) / 2,
  }];
}

function updateGhostEdge(edge) {
  removeGhostEdge();
  const from = nodeRects.get(edge.from);
  const to = nodeRects.get(edge.to);
  if (!from || !to) return;
  const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  ghost.setAttribute('d', edgePath(from, to, edge.relation, edge));
  ghost.setAttribute('class', ['connector', 'ghost', displayEdgeType(edge)].join(' '));
  ghost.dataset.ghost = 'true';
  connectorLayer.appendChild(ghost);
}

function removeGhostEdge() {
  connectorLayer.querySelectorAll('[data-ghost="true"]').forEach((node) => node.remove());
}

function edgeHandleMode(edge) {
  const side = edge.fromSide || 'right';
  return side === 'left' || side === 'right' ? 'x' : 'y';
}

function edgePath(from, to, relation, edge = {}) {
  const start = { x: from.x + from.width, y: from.y + from.height / 2 };
  const end = { x: to.x, y: to.y + to.height / 2 };

  if (relation === 'attachment') {
    const notePath = noteAttachmentPath(edge, from, to);
    if (notePath) return notePath;
    const metaTimePath = metaTimeAttachmentPath(edge);
    if (metaTimePath) return metaTimePath;
    const sx = from.x + from.width / 2;
    const sy = to.y < from.y ? from.y : from.y + from.height;
    const ex = to.x + to.width / 2;
    const ey = to.y < from.y ? to.y + to.height : to.y;
    return `M ${sx} ${sy} V ${ey}`;
  }

  if (relation === 'branch') {
    const sx = from.x + from.width;
    const sy = from.y + from.height / 2;
    const ex = to.x;
    const ey = to.y + to.height / 2;
    const preferredX = edge.stepX ?? defaultStepX({ x: sx, y: sy }, { x: ex, y: ey }, 'right');
    const trunkX = adjustedBranchTrunkX(edge, preferredX, sy, ey);
    return `M ${sx} ${sy} H ${trunkX} V ${ey} H ${ex}`;
  }

  if (relation === 'returnBranch') {
    const sx = from.x + from.width;
    const sy = from.y + from.height / 2;
    const ex = to.x;
    const ey = to.y + to.height / 2;
    const preferredX = edge.stepX ?? defaultStepX({ x: sx, y: sy }, { x: ex, y: ey }, 'right');
    const trunkX = adjustedBranchTrunkX(edge, preferredX, sy, ey);
    return `M ${sx} ${sy} H ${trunkX} V ${ey} H ${ex}`;
  }

  if (relation === 'manual') {
    return manualRoute(from, to, edge).path;
  }

  return `M ${start.x} ${start.y} H ${end.x}`;
}

function metaTimeAttachmentPath(edge) {
  return null;
}

function noteAttachmentPath(edge, fromRect, toRect) {
  const fromNode = diagram.nodes[edge.from];
  const toNode = diagram.nodes[edge.to];
  if (toNode?.type !== 'note') return null;
  const placement = validNotePlacement(toNode.notePlacement) ? toNode.notePlacement : defaultNotePlacement(toNode.parentId);

  if (placement === 'below' || fromNode?.type === 'plot') {
    const sx = fromRect.x + fromRect.width / 2;
    const sy = fromRect.y + fromRect.height;
    const ex = toRect.x + toRect.width / 2;
    const ey = toRect.y;
    if (Math.abs(sx - ex) < 0.5) return `M ${sx} ${sy} V ${ey}`;
    const midY = sy + Math.max(STACK_GAP, Math.min(GAP, Math.abs(ey - sy) / 2));
    return `M ${sx} ${sy} V ${midY} H ${ex} V ${ey}`;
  }

  if (placement === 'left') {
    const sx = fromRect.x;
    const sy = toRect.y + toRect.height / 2;
    const ex = toRect.x + toRect.width;
    return `M ${sx} ${sy} H ${ex}`;
  }

  const sx = fromRect.x + fromRect.width;
  const sy = toRect.y + toRect.height / 2;
  const ex = toRect.x;
  return `M ${sx} ${sy} H ${ex}`;
}

function metaLabelForTime(timeNode) {
  const directParent = diagram.nodes[timeNode.parentId];
  if (directParent?.type === 'metaLabel') return directParent;
  return Object.values(diagram.nodes).find((node) => node.parentId === timeNode.parentId && node.type === 'metaLabel') || null;
}

function displayEdgeType(edge) {
  return metaTimeAttachmentPath(edge) ? 'solid' : (edge.type || 'solid');
}

function sidePoint(rect, side) {
  if (side === 'top') return { x: rect.x + rect.width / 2, y: rect.y };
  if (side === 'bottom') return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  if (side === 'left') return { x: rect.x, y: rect.y + rect.height / 2 };
  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
}

function adjustedBranchTrunkX(edge, preferredX, startY, endY) {
  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  return branchAvoidanceRects(edge).reduce((trunkX, rect) => {
    const overlapsY = bottom >= rect.y && top <= rect.y + rect.height;
    const tooCloseX = trunkX >= rect.x - SNAP_GAP && trunkX <= rect.x + rect.width + SNAP_GAP;
    if (!overlapsY || !tooCloseX) return trunkX;

    const leftX = rect.x - SNAP_GAP;
    const rightX = rect.x + rect.width + SNAP_GAP;
    return Math.abs(trunkX - leftX) <= Math.abs(trunkX - rightX) ? leftX : rightX;
  }, preferredX);
}

function branchAvoidanceRects(edge) {
  const parentIds = new Set([edge.from, edge.to]);
  return Object.entries(diagram.nodes)
    .filter(([, node]) => parentIds.has(node.parentId) && attachmentCountsForBranchClearance(node))
    .map(([nodeId]) => nodeRects.get(nodeId))
    .filter(Boolean);
}

function attachmentCountsForBranchClearance(node) {
  if (node.type === 'character') return true;
  if (node.type !== 'note') return false;
  return diagram.nodes[node.parentId]?.type === 'plot';
}

function manualRoute(from, to, edge = {}) {
  const router = window.DiagrmrRouter;
  if (router) {
    const sameRail = diagram.nodes[edge.from]?.railId
      && diagram.nodes[edge.from]?.railId === diagram.nodes[edge.to]?.railId;
    const route = router.routeConnector({
      id: edge.id,
      fromBoxId: edge.from,
      fromEdge: edge.fromSide || 'right',
      toBoxId: edge.to,
      toEdge: edge.toSide || 'left',
      routeMode: sameRail ? 'sameRail' : 'differentRail',
      routeHandles: edge.routeHandles || [],
      manualRouting: !!edge.manualRouting,
    }, {
      [edge.from]: { id: edge.from, ...from },
      [edge.to]: { id: edge.to, ...to },
    }, {
      minStub: SNAP_GAP,
      snapSize: SNAP_GAP,
    });
    if (!edge.manualRouting) edge.routeHandles = route.handles || [];
    return {
      path: pointsToPath(route.points || []),
      handles: route.handles || [],
    };
  }

  const start = sidePoint(from, edge.fromSide || 'right');
  const end = sidePoint(to, edge.toSide || 'left');
  const key = `${edge.fromSide || 'right'}>${edge.toSide || 'left'}`;
  const sameRail = diagram.nodes[edge.from]?.railId
    && diagram.nodes[edge.from]?.railId === diagram.nodes[edge.to]?.railId;
  const route = sameRail
    ? sameRailManualRoute(key, start, end, edge)
    : differentRailManualRoute(key, start, end, edge, from, to);
  return {
    path: pointsToPath(route.points),
    handles: route.handles || [],
  };
}

function sameRailManualRoute(key, start, end, edge) {
  if (key === 'right>left' && end.x >= start.x && pointsHorizontallyAligned(start, end)) {
    return lineRoute([start, end]);
  }
  const topY = routeValue(edge, 'routeY1', Math.min(start.y, end.y) - GAP);
  const bottomY = routeValue(edge, 'routeY2', Math.max(start.y, end.y) + GAP);
  const leftX = routeValue(edge, 'routeX1', Math.min(start.x, end.x) - GAP);
  const rightX = routeValue(edge, 'routeX2', Math.max(start.x, end.x) + GAP);
  const midX = routeValue(edge, 'routeMidX', snapToGrid((start.x + end.x) / 2));

  switch (key) {
    case 'right>right':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'right>top':
      return lineRoute([start, { x: midX, y: start.y }, { x: midX, y: topY }, { x: end.x, y: topY }, end], [
        xHandle('routeMidX', midX, start.y, topY),
        yHandle('routeY1', topY, midX, end.x),
      ]);
    case 'right>bottom':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX2', rightX, start.y, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);
    case 'left>left':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: topY }, { x: end.x, y: topY }, end], [
        xHandle('routeX1', leftX, start.y, topY),
        yHandle('routeY1', topY, leftX, end.x),
      ]);
    case 'left>right':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        xHandle('routeX1', leftX, start.y, topY),
        yHandle('routeY1', topY, leftX, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'left>top':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: topY }, { x: end.x, y: topY }, end], [
        xHandle('routeX1', leftX, start.y, topY),
        yHandle('routeY1', topY, leftX, end.x),
      ]);
    case 'left>bottom':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX1', leftX, start.y, bottomY),
        yHandle('routeY2', bottomY, leftX, end.x),
      ]);
    case 'top>left':
      return lineRoute([start, { x: start.x, y: topY }, { x: midX, y: topY }, { x: midX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, midX),
        xHandle('routeMidX', midX, topY, end.y),
      ]);
    case 'top>right':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'top>top':
      return lineRoute([start, { x: start.x, y: topY }, { x: end.x, y: topY }, end], [yHandle('routeY1', topY, start.x, end.x)]);
    case 'top>bottom':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);
    case 'bottom>left':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: midX, y: bottomY }, { x: midX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, midX),
        xHandle('routeMidX', midX, bottomY, end.y),
      ]);
    case 'bottom>right':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: rightX, y: bottomY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, rightX),
        xHandle('routeX2', rightX, bottomY, end.y),
      ]);
    case 'bottom>top':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: midX, y: bottomY }, { x: midX, y: topY }, { x: end.x, y: topY }, end], [
        yHandle('routeY2', bottomY, start.x, midX),
        xHandle('routeMidX', midX, bottomY, topY),
        yHandle('routeY1', topY, midX, end.x),
      ]);
    case 'bottom>bottom':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: end.x, y: bottomY }, end], [yHandle('routeY2', bottomY, start.x, end.x)]);
    default:
      return routedManualRoute(key, start, end, edge, true);
  }
}

function differentRailManualRoute(key, start, end, edge, from, to) {
  return routedManualRoute(key, start, end, edge, false);
}

function differentRailPlacement(from, to) {
  const overlap = Math.min(from.x + from.width, to.x + to.width) - Math.max(from.x, to.x);
  if (overlap > Math.min(from.width, to.width) * 0.25) return 'parallel';
  const fromCenter = from.x + from.width / 2;
  const toCenter = to.x + to.width / 2;
  return toCenter < fromCenter ? 'downLeft' : 'downRight';
}

function parallelRailManualRoute(key, start, end, edge) {
  const leftX = routeValue(edge, 'routeX1', Math.min(start.x, end.x) - GAP);
  const rightX = routeValue(edge, 'routeX2', Math.max(start.x, end.x) + GAP);
  const topY = routeValue(edge, 'routeY1', Math.min(start.y, end.y) - GAP);
  const bottomY = routeValue(edge, 'routeY2', Math.max(start.y, end.y) + GAP);
  const midX = routeValue(edge, 'routeMidX', snapToGrid((start.x + end.x) / 2));
  const midY = routeValue(edge, 'routeMidY', snapToGrid((start.y + end.y) / 2));

  switch (key) {
    case 'right>left':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: midY }, { x: end.x, y: midY }, end], [
        xHandle('routeX2', rightX, start.y, midY),
        yHandle('routeMidY', midY, rightX, end.x),
      ]);
    case 'right>right':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: end.y }, end], [xHandle('routeX2', rightX, start.y, end.y)]);
    case 'right>top':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: midY }, { x: end.x, y: midY }, end], [
        xHandle('routeX2', rightX, start.y, midY),
        yHandle('routeMidY', midY, rightX, end.x),
      ]);
    case 'right>bottom':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX2', rightX, start.y, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);
    case 'left>left':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: end.y }, end], [xHandle('routeX1', leftX, start.y, end.y)]);
    case 'left>right':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: midY }, { x: end.x, y: midY }, end], [
        xHandle('routeX1', leftX, start.y, midY),
        yHandle('routeMidY', midY, leftX, end.x),
      ]);
    case 'left>top':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: midY }, { x: end.x, y: midY }, end], [
        xHandle('routeX1', leftX, start.y, midY),
        yHandle('routeMidY', midY, leftX, end.x),
      ]);
    case 'left>bottom':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX1', leftX, start.y, bottomY),
        yHandle('routeY2', bottomY, leftX, end.x),
      ]);
    case 'top>left':
      return lineRoute([start, { x: start.x, y: topY }, { x: leftX, y: topY }, { x: leftX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, leftX),
        xHandle('routeX1', leftX, topY, end.y),
      ]);
    case 'top>right':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'top>top':
      return lineRoute([start, { x: start.x, y: topY }, { x: end.x, y: topY }, end], [yHandle('routeY1', topY, start.x, end.x)]);
    case 'top>bottom':
      return lineRoute([start, { x: start.x, y: topY }, { x: leftX, y: topY }, { x: leftX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        yHandle('routeY1', topY, start.x, leftX),
        xHandle('routeX1', leftX, topY, bottomY),
        yHandle('routeY2', bottomY, leftX, end.x),
      ]);
    case 'bottom>left':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: leftX, y: bottomY }, { x: leftX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, leftX),
        xHandle('routeX1', leftX, bottomY, end.y),
      ]);
    case 'bottom>right':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: rightX, y: bottomY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, rightX),
        xHandle('routeX2', rightX, bottomY, end.y),
      ]);
    case 'bottom>top':
      return lineRoute([start, end]);
    case 'bottom>bottom':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: leftX, y: bottomY }, { x: leftX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, leftX),
        xHandle('routeX1', leftX, bottomY, end.y),
      ]);
    default:
      return routedManualRoute(key, start, end, edge, false);
  }
}

function downLeftRailManualRoute(key, start, end, edge) {
  const leftX = routeValue(edge, 'routeX1', Math.min(start.x, end.x) - GAP);
  const rightX = routeValue(edge, 'routeX2', Math.max(start.x, end.x) + GAP);
  const topY = routeValue(edge, 'routeY1', Math.min(start.y, end.y) - GAP);
  const bottomY = routeValue(edge, 'routeY2', Math.max(start.y, end.y) + GAP);
  const midY = routeValue(edge, 'routeMidY', snapToGrid((start.y + end.y) / 2));

  switch (key) {
    case 'right>left':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: midY }, { x: leftX, y: midY }, { x: leftX, y: end.y }, end], [
        xHandle('routeX2', rightX, start.y, midY),
        yHandle('routeMidY', midY, rightX, leftX),
        xHandle('routeX1', leftX, midY, end.y),
      ]);
    case 'right>right':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: end.y }, end], [xHandle('routeX2', rightX, start.y, end.y)]);
    case 'right>top':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: topY }, { x: end.x, y: topY }, end], [
        xHandle('routeX2', rightX, start.y, topY),
        yHandle('routeY1', topY, rightX, end.x),
      ]);
    case 'right>bottom':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX2', rightX, start.y, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);
    case 'left>left':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: end.y }, end], [xHandle('routeX1', leftX, start.y, end.y)]);
    case 'left>right':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: end.y }, end], [xHandle('routeX1', leftX, start.y, end.y)]);
    case 'left>top':
      return lineRoute([start, { x: end.x, y: start.y }, end]);
    case 'left>bottom':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: end.x, y: bottomY }, end], [yHandle('routeY2', bottomY, start.x, end.x)]);
    case 'top>left':
      return lineRoute([start, { x: start.x, y: topY }, { x: leftX, y: topY }, { x: leftX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, leftX),
        xHandle('routeX1', leftX, topY, end.y),
      ]);
    case 'top>right':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'top>top':
      return lineRoute([start, { x: start.x, y: topY }, { x: end.x, y: topY }, end], [yHandle('routeY1', topY, start.x, end.x)]);
    case 'top>bottom':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);
    case 'bottom>left':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: leftX, y: bottomY }, { x: leftX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, leftX),
        xHandle('routeX1', leftX, bottomY, end.y),
      ]);
    case 'bottom>right':
      return lineRoute([start, { x: start.x, y: end.y }, end]);
    case 'bottom>top':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: end.x, y: bottomY }, end], [yHandle('routeY2', bottomY, start.x, end.x)]);
    case 'bottom>bottom':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: end.x, y: bottomY }, end], [yHandle('routeY2', bottomY, start.x, end.x)]);
    default:
      return routedManualRoute(key, start, end, edge, false);
  }
}

function routedManualRoute(key, start, end, edge, sameRail) {
  const x1Default = isHorizontalSide(edge.fromSide || 'right')
    ? defaultOuterX(start.x, edge.fromSide || 'right')
    : snapToGrid((start.x + end.x) / 2);
  const x2Default = isHorizontalSide(edge.toSide || 'left')
    ? defaultOuterX(end.x, edge.toSide || 'left')
    : snapToGrid((start.x + end.x) / 2);
  const y1Default = isVerticalSide(edge.fromSide || 'bottom')
    ? defaultOuterY(start.y, edge.fromSide || 'bottom')
    : (sameRail ? Math.min(start.y, end.y) - GAP : snapToGrid((start.y + end.y) / 2));
  const y2Default = isVerticalSide(edge.toSide || 'top')
    ? defaultOuterY(end.y, edge.toSide || 'top')
    : (sameRail ? Math.max(start.y, end.y) + GAP : snapToGrid((start.y + end.y) / 2));
  const midXDefault = snapToGrid((start.x + end.x) / 2);
  const midYDefault = snapToGrid((start.y + end.y) / 2);

  const x1 = routeValue(edge, 'routeX1', x1Default);
  const x2 = routeValue(edge, 'routeX2', x2Default);
  const y1 = routeValue(edge, 'routeY1', y1Default);
  const y2 = routeValue(edge, 'routeY2', y2Default);
  const midX = routeValue(edge, 'routeMidX', midXDefault);
  const midY = routeValue(edge, 'routeMidY', midYDefault);
  const topY = routeValue(edge, 'routeY1', Math.min(start.y, end.y) - GAP);
  const bottomY = routeValue(edge, 'routeY2', Math.max(start.y, end.y) + GAP);
  const leftX = routeValue(edge, 'routeX1', Math.min(start.x, end.x) - GAP);
  const rightX = routeValue(edge, 'routeX2', Math.max(start.x, end.x) + GAP);

  switch (key) {
    case 'right>left':
      return lineRoute([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end], [xHandle('routeMidX', midX, start.y, end.y)]);
    case 'right>right':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: end.y }, end], [xHandle('routeX2', rightX, start.y, end.y)]);
    case 'right>top':
      return lineRoute([start, { x: end.x, y: start.y }, end]);
    case 'right>bottom':
      return lineRoute([start, { x: rightX, y: start.y }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX2', rightX, start.y, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);

    case 'left>left':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: end.y }, end], [xHandle('routeX1', leftX, start.y, end.y)]);
    case 'left>right':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: midY }, { x: rightX, y: midY }, { x: rightX, y: end.y }, end], [
        xHandle('routeX1', leftX, start.y, midY),
        yHandle('routeMidY', midY, leftX, rightX),
        xHandle('routeX2', rightX, midY, end.y),
      ]);
    case 'left>top':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: topY }, { x: end.x, y: topY }, end], [
        xHandle('routeX1', leftX, start.y, topY),
        yHandle('routeY1', topY, leftX, end.x),
      ]);
    case 'left>bottom':
      return lineRoute([start, { x: leftX, y: start.y }, { x: leftX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        xHandle('routeX1', leftX, start.y, bottomY),
        yHandle('routeY2', bottomY, leftX, end.x),
      ]);

    case 'top>left':
      return lineRoute([start, { x: start.x, y: topY }, { x: x2, y: topY }, { x: x2, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, x2),
        xHandle('routeX2', x2, topY, end.y),
      ]);
    case 'top>right':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, end.y),
      ]);
    case 'top>top':
      return lineRoute([start, { x: start.x, y: topY }, { x: end.x, y: topY }, end], [yHandle('routeY1', topY, start.x, end.x)]);
    case 'top>bottom':
      return lineRoute([start, { x: start.x, y: topY }, { x: rightX, y: topY }, { x: rightX, y: bottomY }, { x: end.x, y: bottomY }, end], [
        yHandle('routeY1', topY, start.x, rightX),
        xHandle('routeX2', rightX, topY, bottomY),
        yHandle('routeY2', bottomY, rightX, end.x),
      ]);

    case 'bottom>left':
      if (!sameRail) return lineRoute([start, { x: start.x, y: end.y }, end]);
      return lineRoute([start, { x: start.x, y: bottomY }, { x: x2, y: bottomY }, { x: x2, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, x2),
        xHandle('routeX2', x2, bottomY, end.y),
      ]);
    case 'bottom>right':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: rightX, y: bottomY }, { x: rightX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, rightX),
        xHandle('routeX2', rightX, bottomY, end.y),
      ]);
    case 'bottom>top':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: midX, y: bottomY }, { x: midX, y: end.y }, end], [
        yHandle('routeY2', bottomY, start.x, midX),
        xHandle('routeMidX', midX, bottomY, end.y),
      ]);
    case 'bottom>bottom':
      return lineRoute([start, { x: start.x, y: bottomY }, { x: end.x, y: bottomY }, end], [yHandle('routeY2', bottomY, start.x, end.x)]);
    default:
      return lineRoute([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end], [xHandle('routeMidX', midX, start.y, end.y)]);
  }
}

function routeValue(edge, property, fallback) {
  return Number.isFinite(edge[property]) ? edge[property] : snapToGrid(fallback);
}

function lineRoute(points, handles = []) {
  return { points: normalizeRoutePoints(points), handles: handles.filter(Boolean) };
}

function normalizeRoutePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return Math.abs(point.x - previous.x) > 0.1 || Math.abs(point.y - previous.y) > 0.1;
  });
}

function pointsToPath(points) {
  if (!points.length) return '';
  return points.slice(1).reduce((path, point) => `${path} L ${point.x} ${point.y}`, `M ${points[0].x} ${points[0].y}`);
}

function xHandle(property, x, y1, y2) {
  if (Math.abs(y2 - y1) <= 0.1) return null;
  return { x, y: (y1 + y2) / 2, axis: 'x', property, value: x };
}

function yHandle(property, y, x1, x2) {
  if (Math.abs(x2 - x1) <= 0.1) return null;
  return { x: (x1 + x2) / 2, y, axis: 'y', property, value: y };
}

function orthogonalPath(start, end, fromSide, toSide, edge = {}) {
  if (usesSideDogleg(edge, start, end)) {
    const route = sideDoglegRoute(start, end, fromSide, toSide, edge);
    return `M ${start.x} ${start.y} H ${route.startX} V ${route.midY} H ${route.endX} V ${end.y} H ${end.x}`;
  }
  if (usesVerticalDogleg(edge, start, end)) {
    const route = verticalDoglegRoute(start, end, fromSide, toSide, edge);
    return `M ${start.x} ${start.y} V ${route.startY} H ${route.midX} V ${route.endY} H ${end.x} V ${end.y}`;
  }

  if (pointsVerticallyAligned(start, end)) {
    return `M ${start.x} ${start.y} V ${end.y}`;
  }
  if (pointsHorizontallyAligned(start, end)) {
    return `M ${start.x} ${start.y} H ${end.x}`;
  }

  if (isHorizontalSide(fromSide) && isVerticalSide(toSide)) {
    return `M ${start.x} ${start.y} H ${end.x} V ${end.y}`;
  }
  if (isVerticalSide(fromSide) && isHorizontalSide(toSide)) {
    return `M ${start.x} ${start.y} V ${end.y} H ${end.x}`;
  }

  if (isHorizontalSide(fromSide)) {
    const midX = edge.stepX ?? defaultStepX(start, end, fromSide);
    return `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`;
  }

  const midY = edge.stepY ?? defaultStepY(start, end, fromSide);
  return `M ${start.x} ${start.y} V ${midY} H ${end.x} V ${end.y}`;
}

function usesSideDogleg(edge, start, end) {
  if (edge.relation !== 'manual') return false;
  if (!isHorizontalSide(edge.fromSide || 'right') || !isHorizontalSide(edge.toSide || 'left')) return false;
  return !isStraightHorizontalSideConnection(start, end, edge.fromSide || 'right', edge.toSide || 'left')
    || edge.doglegStartX !== undefined
    || edge.doglegMidY !== undefined
    || edge.doglegEndX !== undefined;
}

function sideDoglegRoute(start, end, fromSide, toSide, edge = {}) {
  return {
    startX: edge.doglegStartX ?? defaultOuterX(start.x, fromSide),
    midY: edge.doglegMidY ?? snapToGrid((start.y + end.y) / 2),
    endX: edge.doglegEndX ?? defaultOuterX(end.x, toSide),
  };
}

function defaultOuterX(x, side) {
  return x + (side === 'left' ? -GAP : GAP);
}

function usesVerticalDogleg(edge, start, end) {
  if (edge.relation !== 'manual') return false;
  if (!isVerticalSide(edge.fromSide || 'bottom') || !isVerticalSide(edge.toSide || 'top')) return false;
  return !isStraightVerticalSideConnection(start, end, edge.fromSide || 'bottom', edge.toSide || 'top')
    || edge.doglegStartY !== undefined
    || edge.doglegMidX !== undefined
    || edge.doglegEndY !== undefined;
}

function verticalDoglegRoute(start, end, fromSide, toSide, edge = {}) {
  return {
    startY: edge.doglegStartY ?? defaultOuterY(start.y, fromSide),
    midX: edge.doglegMidX ?? snapToGrid((start.x + end.x) / 2),
    endY: edge.doglegEndY ?? defaultOuterY(end.y, toSide),
  };
}

function defaultOuterY(y, side) {
  return y + (side === 'top' ? -GAP : GAP);
}

function isStraightHorizontalSideConnection(start, end, fromSide, toSide) {
  if (!pointsHorizontallyAligned(start, end)) return false;
  return (fromSide === 'right' && toSide === 'left' && end.x >= start.x)
    || (fromSide === 'left' && toSide === 'right' && end.x <= start.x);
}

function isStraightVerticalSideConnection(start, end, fromSide, toSide) {
  if (!pointsVerticallyAligned(start, end)) return false;
  return (fromSide === 'bottom' && toSide === 'top' && end.y >= start.y)
    || (fromSide === 'top' && toSide === 'bottom' && end.y <= start.y);
}

function pointsVerticallyAligned(start, end) {
  return Math.abs(start.x - end.x) <= ALIGN_TOLERANCE;
}

function pointsHorizontallyAligned(start, end) {
  return Math.abs(start.y - end.y) <= ALIGN_TOLERANCE;
}

function isHorizontalSide(side) {
  return side === 'left' || side === 'right';
}

function isVerticalSide(side) {
  return side === 'top' || side === 'bottom';
}

function defaultStepX(start, end, fromSide) {
  const direction = fromSide === 'right' ? 1 : -1;
  if ((fromSide === 'right' && end.x > start.x) || (fromSide === 'left' && end.x < start.x)) {
    return (start.x + end.x) / 2;
  }
  return start.x + direction * GAP;
}

function defaultStepY(start, end, fromSide) {
  const direction = fromSide === 'bottom' ? 1 : -1;
  if ((fromSide === 'bottom' && end.y > start.y) || (fromSide === 'top' && end.y < start.y)) {
    return (start.y + end.y) / 2;
  }
  return start.y + direction * GAP;
}

function defaultTextFor(type) {
  if (type === 'location') return 'Location';
  if (type === 'character') return 'Character';
  if (type === 'scene') return 'Scene / Chapter';
  if (type === 'sceneSpan') return 'Scene / Chapter';
  if (type === 'note') return 'Note';
  if (type === 'timejump') return 'Time Jump';
  if (type === 'metaLabel') return 'Title';
  if (type === 'metaSpan') return 'Meta';
  if (type === 'time') return 'Year';
  if (type === 'timePassage') return 'Time Passage';
  return 'Plot point';
}

function selectNode(nodeId) {
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  updateSelectionVisuals();
  updateSelectionDetails();
  if (storyDrawer && !storyDrawer.hidden) renderStoryDrawer();
}

function nodeIdFromTarget(target) {
  return target?.closest?.('.node')?.dataset?.nodeId || null;
}

function selectedOrActiveNodeId(target) {
  return nodeIdFromTarget(target) || selectedNodeId || Array.from(selectedNodeIds)[0] || null;
}

function commitNodeTextFromElement(el) {
  const nodeId = nodeIdFromTarget(el);
  const node = diagram.nodes[nodeId];
  if (!node) return;
  const nextText = el.textContent.trim() || defaultTextFor(node.type);
  node.text = nextText;
  syncMetaText(node.id, nextText);
}

function toggleNodeSelection(nodeId) {
  selectedEdgeId = null;
  selectedGroupId = null;
  if (selectedNodeIds.has(nodeId)) {
    selectedNodeIds.delete(nodeId);
  } else {
    selectedNodeIds.add(nodeId);
  }
  selectedNodeId = selectedNodeIds.size ? Array.from(selectedNodeIds).at(-1) : null;
  updateSelectionVisuals();
  updateSelectionDetails();
}

function isNodeSelected(nodeId) {
  return selectedNodeId === nodeId || selectedNodeIds.has(nodeId);
}

function clearNodeSelection() {
  selectedNodeId = null;
  selectedNodeIds = new Set();
  selectedGroupId = null;
}

function updateSelectionVisuals() {
  document.querySelectorAll('.node').forEach((nodeEl) => {
    nodeEl.classList.toggle('selected', isNodeSelected(nodeEl.dataset.nodeId));
  });
  document.querySelectorAll('.connector').forEach((edgeEl) => {
    edgeEl.classList.toggle('selected', edgeEl.dataset.edgeId === selectedEdgeId);
  });
  document.querySelectorAll('.group-box').forEach((groupEl) => {
    groupEl.classList.toggle('selected', groupEl.dataset.groupId === selectedGroupId);
  });
  if (storyDrawer && !storyDrawer.hidden) renderStoryDrawer();
}

function updateSelectionDetails() {
  if (!selectionDetails) return;
  if (pendingConnector && diagram.nodes[pendingConnector.fromId]) {
    const source = diagram.nodes[pendingConnector.fromId];
    selectionDetails.innerHTML = `
      <strong>Connector pending</strong><br>
      From: ${escapeHtml(source.text)} (${pendingConnector.fromSide})<br>
      Click an edge handle on another box to finish.
    `;
    return;
  }

  if (selectedNodeIds.size > 1) {
    const rects = Array.from(selectedNodeIds).map((id) => nodeRects.get(id)).filter(Boolean);
    const left = rects.length ? Math.min(...rects.map((rect) => rect.x)) : 0;
    const top = rects.length ? Math.min(...rects.map((rect) => rect.y)) : 0;
    const right = rects.length ? Math.max(...rects.map((rect) => rect.x + rect.width)) : 0;
    const bottom = rects.length ? Math.max(...rects.map((rect) => rect.y + rect.height)) : 0;
    const centerXs = rects.map((rect) => rect.x + rect.width / 2);
    const minCenterX = centerXs.length ? Math.min(...centerXs) : 0;
    const maxCenterX = centerXs.length ? Math.max(...centerXs) : 0;
    const centerStatus = Math.abs(maxCenterX - minCenterX) <= ALIGN_TOLERANCE
      ? 'center-aligned'
      : `${formatInches(maxCenterX - minCenterX)} apart`;
    selectionDetails.innerHTML = `
      <strong>${selectedNodeIds.size} boxes selected</strong><br>
      Ctrl-click boxes to add/remove.<br>
      Drag selected plot/location boxes together.
      ${rects.length ? `<div class="spec-grid">
        <span>X</span><strong>${formatInches(left)}</strong>
        <span>Y</span><strong>${formatInches(top)}</strong>
        <span>W</span><strong>${formatInches(right - left)}</strong>
        <span>H</span><strong>${formatInches(bottom - top)}</strong>
        <span>CX</span><strong>${centerStatus}</strong>
      </div>` : ''}
    `;
    return;
  }

  if (selectedNodeId && diagram.nodes[selectedNodeId]) {
    const node = diagram.nodes[selectedNodeId];
    const rect = nodeRects.get(selectedNodeId);
    selectionDetails.innerHTML = `
      <strong>${labelForNode(node)}</strong><br>
      ${escapeHtml(node.text)}<br>
      Rail: ${node.railId || 'attached'}
      ${storySummaryHtml(node)}
      ${rect ? `<div class="spec-grid">
        <span>X</span><strong>${formatInches(rect.x)}</strong>
        <span>Y</span><strong>${formatInches(rect.y)}</strong>
        <span>W</span><strong>${formatInches(rect.width)}</strong>
        <span>H</span><strong>${formatInches(rect.height)}</strong>
      </div>` : ''}
    `;
    return;
  }

  if (selectedEdgeId) {
    const edge = diagram.edges.find((item) => item.id === selectedEdgeId);
    selectionDetails.innerHTML = edge
      ? `<strong>Connector</strong><br>
        Type: ${edge.type || 'solid'}<br>
        Relation: ${edge.relation}<br>
        From: ${escapeHtml(diagram.nodes[edge.from]?.text || edge.from)} (${edge.fromSide || 'right'})<br>
        To: ${escapeHtml(diagram.nodes[edge.to]?.text || edge.to)} (${edge.toSide || 'left'})<br>
        Arrows: ${edge.arrows || 'none'}
        ${storySummaryHtml(edge)}`
      : 'Nothing selected';
    return;
  }

  if (selectedGroupId) {
    const group = (diagram.groups || []).find((item) => item.id === selectedGroupId);
    selectionDetails.innerHTML = group
      ? `<strong>Enclosing box</strong><br>${escapeHtml(group.note || 'Note')}
        ${storySummaryHtml(group)}
        <div class="spec-grid">
          <span>X</span><strong>${formatInches(group.x)}</strong>
          <span>Y</span><strong>${formatInches(group.y)}</strong>
          <span>W</span><strong>${formatInches(group.width)}</strong>
          <span>H</span><strong>${formatInches(group.height)}</strong>
        </div>
        Note: ${group.noteCorner || 'bottom-left'}<br>
        Border: ${group.borderType || 'level3'}`
      : 'Nothing selected';
    return;
  }

  selectionDetails.textContent = 'Nothing selected';
}

function formatInches(value) {
  return `${Math.round((value / INCH) * 10) / 10}"`;
}

function diagramStatsItems() {
  const nodes = Object.values(diagram.nodes);
  const edges = diagram.edges || [];
  const groups = diagram.groups || [];
  const plotCount = nodes.filter((node) => node.type === 'plot').length;
  const characterCount = nodes.filter((node) => node.type === 'character').length;
  const locationCount = nodes.filter((node) => node.type === 'location').length;
  const metaCount = nodes.filter((node) => node.type === 'metaLabel' || node.type === 'metaSpan').length;
  const sceneCount = nodes.filter((node) => node.type === 'scene' || node.type === 'sceneSpan').length;
  const timeCount = nodes.filter((node) => node.type === 'time' || node.type === 'timePassage').length;
  const noteCount = nodes.filter((node) => node.type === 'note').length;
  const groupCount = (diagram.groups || []).length;
  const locationGroupCount = Object.keys(diagram.locationGroups || {}).length;
  const storyCount = [
    ...nodes,
    ...edges,
    ...groups,
  ].filter((item) => item.storyNote || tagLabel(item)).length;
  let bounds = null;
  try {
    bounds = usedDiagramBounds();
  } catch {
    bounds = null;
  }
  return [
    ['Locations/Rails', locationCount],
    ['Plots', plotCount],
    ['Characters', characterCount],
    ['Meta/Scene/Time', metaCount + sceneCount + timeCount],
    ['Notes', noteCount],
    ['Connectors', edges.length],
    ['Enclosing Boxes', groupCount],
    ['Location Groups', locationGroupCount],
    ['Story/Tagged Items', storyCount],
    ['Used Size', bounds ? `${formatInches(bounds.width)} x ${formatInches(bounds.height)}` : 'n/a'],
  ];
}

function updateDiagramStats() {
  if (!diagramStats) return;
  diagramStats.replaceChildren();
  const stats = buildDiagramStats();
  appendStatsSection('Overview', stats.overview);
  appendStatsSection('Plot Words', stats.words);
  appendStatsSection('Characters', stats.characters);
  appendStatsSection('Structure', stats.structure);
  const tableGrid = document.createElement('div');
  tableGrid.className = 'stats-table-grid';
  appendStatsTable(tableGrid, 'Plot Types', stats.plotTypes);
  appendStatsTable(tableGrid, 'Box And Marker Types', stats.nodeTypes);
  appendStatsTable(tableGrid, 'Line Types', stats.lineTypes);
  if (tableGrid.childElementCount) diagramStats.appendChild(tableGrid);
}

function appendStatsSection(title, items) {
  if (!diagramStats) return;
  const section = document.createElement('div');
  section.className = 'stats-section';
  const heading = document.createElement('h4');
  heading.textContent = title;
  section.appendChild(heading);
  const cardGrid = document.createElement('div');
  cardGrid.className = 'stats-card-grid';
  items.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'stats-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.append(strong, span);
    cardGrid.appendChild(card);
  });
  section.appendChild(cardGrid);
  diagramStats.appendChild(section);
}

function appendStatsTable(parent, title, rows) {
  if (!parent || !rows.length) return;
  const section = document.createElement('div');
  section.className = 'stats-section stats-table-section';
  const heading = document.createElement('h4');
  heading.textContent = title;
  const table = document.createElement('table');
  table.className = 'stats-table';
  const tbody = document.createElement('tbody');
  rows.forEach(([label, value]) => {
    const tr = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    const valueCell = document.createElement('td');
    valueCell.textContent = value;
    tr.append(labelCell, valueCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.append(heading, table);
  parent.appendChild(section);
}

function buildDiagramStats() {
  const nodes = Object.values(diagram.nodes || {});
  const edges = diagram.edges || [];
  const groups = diagram.groups || [];
  const rails = Object.values(diagram.rails || {});
  const plots = nodes.filter((node) => node.type === 'plot');
  const characters = nodes.filter((node) => node.type === 'character');
  const locations = nodes.filter((node) => node.type === 'location');
  const notes = nodes.filter((node) => node.type === 'note');
  const metaLabels = nodes.filter((node) => node.type === 'metaLabel');
  const metaSpans = nodes.filter((node) => node.type === 'metaSpan');
  const scenes = nodes.filter((node) => node.type === 'scene');
  const sceneSpans = nodes.filter((node) => node.type === 'sceneSpan');
  const times = nodes.filter((node) => node.type === 'time');
  const timePassages = nodes.filter((node) => node.type === 'timePassage' || node.type === 'timejump');
  const locationGroups = Object.values(diagram.locationGroups || {});
  const customVariants = new Set(customBoxStyles().map((style) => style.id));
  const customPlotCount = plots.filter((node) => customVariants.has(node.variant)).length;
  const storyCount = [...nodes, ...edges, ...groups].filter((item) => item.storyNote || tagLabel(item)).length;
  const railPlotCounts = rails.map((rail) => Array.isArray(rail.plotIds) ? rail.plotIds.length : 0);
  const longestRailCount = Math.max(0, ...railPlotCounts);
  const longestRail = rails.find((rail) => (rail.plotIds?.length || 0) === longestRailCount);
  const avgPlotsPerRail = railPlotCounts.length ? averageNumber(railPlotCounts) : 0;
  const wordStats = plotWordStats(plots);
  const characterStats = buildCharacterStats(characters, plots);
  let bounds = null;
  try {
    bounds = usedDiagramBounds();
  } catch {
    bounds = null;
  }
  return {
    overview: [
      ['Locations/Rails', `${locations.length}/${rails.length}`],
      ['Plots', plots.length],
      ['Characters', characters.length],
      ['Notes', notes.length],
      ['Connectors', edges.length],
      ['Enclosing Boxes', groups.length],
      ['Meta/Scene/Time', metaLabels.length + metaSpans.length + scenes.length + sceneSpans.length + times.length + timePassages.length],
      ['Custom Plot Boxes', customPlotCount],
      ['Story/Tagged Items', storyCount],
      ['Used Size', bounds ? `${formatInches(bounds.width)} x ${formatInches(bounds.height)}` : 'n/a'],
    ],
    words: [
      ['Total Plot Words', wordStats.total],
      ['Avg Words/Plot', formatStatNumber(wordStats.average)],
      ['Most Words', wordStats.most ? wordStats.most.count : 'n/a'],
      ['Least Words', wordStats.least ? wordStats.least.count : 'n/a'],
    ],
    characters: [
      ['Character Boxes', characters.length],
      ['Unique Names', characterStats.uniqueCount],
      ['Avg Characters/Plot', formatStatNumber(characterStats.averagePerPlot)],
      ['Max On One Plot', characterStats.maxOnPlot ? characterStats.maxOnPlot.count : '0'],
      ['Most Repeated', characterStats.mostRepeated ? `${characterStats.mostRepeated.name} (${characterStats.mostRepeated.count})` : 'n/a'],
      ['Plots With Characters', characterStats.plotsWithCharacters],
    ],
    structure: [
      ['Location Groups', locationGroups.length],
      ['Top-Level Groups', locationGroups.filter((group) => !group.parentGroupId).length],
      ['Subgroups', locationGroups.filter((group) => group.parentGroupId).length],
      ['Max Group Depth', maxLocationGroupDepth()],
      ['Longest Rail', longestRail ? `${longestRailCount} plots` : 'n/a'],
      ['Avg Plots/Rail', formatStatNumber(avgPlotsPerRail)],
    ],
    plotTypes: countPlotTypes(plots),
    nodeTypes: countNodeTypes(nodes),
    lineTypes: countLineTypes(edges, groups),
  };
}

function plotWordStats(plots) {
  const counted = plots.map((node) => ({ node, count: wordCount(node.text) }));
  const total = counted.reduce((sum, item) => sum + item.count, 0);
  const nonEmpty = counted.filter((item) => item.count > 0);
  return {
    total,
    average: counted.length ? total / counted.length : 0,
    most: nonEmpty.slice().sort((a, b) => b.count - a.count)[0] || null,
    least: nonEmpty.slice().sort((a, b) => a.count - b.count)[0] || null,
  };
}

function buildCharacterStats(characters, plots) {
  const byName = new Map();
  characters.forEach((node) => {
    const name = (node.text || '').trim() || 'Unnamed character';
    incrementMap(byName, name);
  });
  const countsByPlot = plots.map((plot) => ({
    plot,
    count: characters.filter((character) => character.parentId === plot.id).length,
  }));
  const maxOnPlot = countsByPlot.slice().sort((a, b) => b.count - a.count)[0] || null;
  const mostRepeated = mapToStatRows(byName)[0];
  return {
    uniqueCount: byName.size,
    averagePerPlot: plots.length ? characters.length / plots.length : 0,
    maxOnPlot,
    mostRepeated: mostRepeated ? { name: mostRepeated[0], count: mostRepeated[1] } : null,
    plotsWithCharacters: countsByPlot.filter((item) => item.count > 0).length,
  };
}

function countPlotTypes(plots) {
  const counts = new Map();
  plots.forEach((node) => incrementMap(counts, plotVariantName(node.variant)));
  return mapToStatRows(counts);
}

function plotVariantName(variant) {
  const normalized = variant || 'normal';
  const item = allPlotVariantItems().find((candidate) => candidate.id === normalized);
  return item?.label || normalized;
}

function countNodeTypes(nodes) {
  const labels = {
    location: 'Location',
    character: 'Character',
    note: 'Note',
    metaLabel: 'Film/Meta top',
    metaSpan: 'Film/Meta span',
    scene: 'Scene/Chapter top',
    sceneSpan: 'Scene/Chapter span',
    time: 'Year/Time',
    timePassage: 'Time Passage',
    timejump: 'Time Passage',
  };
  const counts = new Map();
  nodes.forEach((node) => {
    const label = labels[node.type];
    if (label) incrementMap(counts, label);
  });
  return mapToStatRows(counts);
}

function countLineTypes(edges, groups) {
  const counts = new Map();
  edges.forEach((edge) => incrementMap(counts, lineTypeLabel(edge.type || 'solid')));
  groups.forEach((group) => incrementMap(counts, lineTypeLabel(group.borderType || 'level3')));
  return mapToStatRows(counts);
}

function maxLocationGroupDepth() {
  const groups = diagram.locationGroups || {};
  const memo = new Map();
  function depth(groupId, seen = new Set()) {
    if (!groupId || !groups[groupId] || seen.has(groupId)) return 0;
    if (memo.has(groupId)) return memo.get(groupId);
    seen.add(groupId);
    const value = 1 + depth(groups[groupId].parentGroupId, seen);
    memo.set(groupId, value);
    return value;
  }
  return Object.keys(groups).reduce((max, groupId) => Math.max(max, depth(groupId)), 0);
}

function incrementMap(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function mapToStatRows(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function wordCount(text) {
  const words = String(text || '').trim().match(/\S+/g);
  return words ? words.length : 0;
}

function averageNumber(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatStatNumber(value) {
  if (!Number.isFinite(value)) return '0';
  return `${Math.round(value * 10) / 10}`;
}

function truncateStatText(text, limit = 42) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Untitled';
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}...` : normalized;
}

function customBoxStyles() {
  diagram.styles = normalizeStyleSettings(diagram.styles);
  return diagram.styles.customBoxStyles;
}

function styleColorForKey(key, { dark = darkTheme } = {}) {
  diagram.styles = normalizeStyleSettings(diagram.styles);
  const target = STYLE_COLOR_TARGETS.find((item) => item.id === key);
  const lightColor = diagram.styles.colorOverrides[key] || target?.defaultColor || '#ffffff';
  if (!dark) return lightColor;
  if (!diagram.styles.colorOverrides[key] && target?.darkColor) return target.darkColor;
  return darkenHex(lightColor, 0.58);
}

function plotVariantColor(variant, options = {}) {
  const key = variant && variant !== 'normal' ? variant : 'plot';
  const custom = customBoxStyleForVariant(key);
  const useDark = options.dark ?? darkTheme;
  if (custom) return useDark ? darkenHex(custom.color, 0.58) : custom.color;
  return styleColorForKey(key, options);
}

function customBoxStyleForVariant(variant) {
  if (!variant || !String(variant).startsWith('custom-')) return null;
  return customBoxStyles().find((style) => style.id === variant) || null;
}

function allPlotVariantItems() {
  return BUILT_IN_PLOT_VARIANTS.concat(customBoxStyles().map((style) => ({
    id: style.id,
    label: style.label,
    colorName: 'Custom',
    color: style.color,
  })));
}

function customNodeFill(node) {
  if (node?.type !== 'plot') return null;
  if (!node.variant || node.variant === 'normal') return null;
  return plotVariantColor(node.variant);
}

function darkenHex(hex, factor = 0.62) {
  const color = normalizeHexColor(hex, '#d9d9d9').slice(1);
  const r = Math.round(parseInt(color.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(color.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(color.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function plotVariantLabel(variant) {
  const item = allPlotVariantItems().find((candidate) => candidate.id === (variant || 'normal'));
  if (!item) return 'Normal plot (Grey)';
  return item.colorName === 'Custom' ? `${item.label} (${item.color})` : `${item.label} (${item.colorName})`;
}

function lineTypeLabel(type) {
  const lineType = LINE_TYPES.find((item) => item.id === (type || 'solid')) || LINE_TYPES[0];
  const meaning = diagram.styles?.lineLabels?.[lineType.id];
  return meaning ? `${lineType.label} (${meaning})` : lineType.label;
}

function renderStyleSettings() {
  if (!customBoxStyleList || !lineLabelList) return;
  diagram.styles = normalizeStyleSettings(diagram.styles);

  renderDefaultColorSettings();
  renderPresetPalette();
  updateCustomBoxStyleSwatch();

  customBoxStyleList.innerHTML = '';
  customBoxStyles().forEach((style) => {
    const row = document.createElement('div');
    row.className = `style-row style-color-row ${activeStyleColorTarget?.kind === 'custom' && activeStyleColorTarget.id === style.id ? 'active' : ''}`;
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'style-swatch';
    swatch.dataset.styleKind = 'custom';
    swatch.dataset.styleId = style.id;
    swatch.style.background = style.color;
    swatch.title = `Choose color for ${style.label}.`;
    swatch.addEventListener('click', () => {
      openStylePalette({ kind: 'custom', id: style.id });
    });
    row.appendChild(swatch);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = style.label;
    input.title = 'Rename this custom box type.';
    input.addEventListener('input', () => {
      style.label = input.value.trim() || 'Custom';
      updateLineStyleLabels();
      autosave();
    });
    row.appendChild(input);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'X';
    remove.title = 'Remove this custom box type. Existing boxes using it become normal plot boxes.';
    remove.addEventListener('click', () => removeCustomBoxStyle(style.id));
    row.appendChild(remove);
    customBoxStyleList.appendChild(row);
  });

  lineLabelList.innerHTML = '';
  LINE_TYPES.forEach((type) => {
    const row = document.createElement('div');
    row.className = 'style-row line-label-row';
    const swatch = document.createElement('span');
    swatch.className = `style-swatch line-swatch ${type.id}`;
    row.appendChild(swatch);
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = type.label;
    input.value = diagram.styles.lineLabels[type.id] || '';
    input.title = `Meaning label for ${type.label} lines.`;
    input.addEventListener('input', () => {
      const value = input.value.trim();
      if (value) diagram.styles.lineLabels[type.id] = value;
      else delete diagram.styles.lineLabels[type.id];
      updateLineStyleLabels();
      autosave();
    });
    row.appendChild(input);
    lineLabelList.appendChild(row);
  });
}

function renderDefaultColorSettings() {
  if (!boxColorStyleList) return;
  boxColorStyleList.innerHTML = '';
  STYLE_COLOR_TARGETS.forEach((target) => {
    const row = document.createElement('div');
    row.className = `style-row style-color-row ${activeStyleColorTarget?.kind === 'default' && activeStyleColorTarget.id === target.id ? 'active' : ''}`;
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'style-swatch';
    swatch.dataset.styleKind = 'default';
    swatch.dataset.styleId = target.id;
    swatch.style.background = styleColorForKey(target.id, { dark: false });
    swatch.title = `Choose color for ${target.label}.`;
    swatch.addEventListener('click', () => {
      openStylePalette({ kind: 'default', id: target.id });
    });
    row.appendChild(swatch);
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'style-label-button';
    label.textContent = target.label;
    label.title = `Choose color for ${target.label}.`;
    label.addEventListener('click', () => {
      openStylePalette({ kind: 'default', id: target.id });
    });
    row.appendChild(label);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'style-reset-button';
    reset.textContent = '\u21ba';
    reset.setAttribute('aria-label', `Reset ${target.label} to the default color.`);
    reset.title = `Reset ${target.label} to the default color.`;
    reset.disabled = !diagram.styles.colorOverrides[target.id];
    reset.addEventListener('click', () => {
      delete diagram.styles.colorOverrides[target.id];
      render();
      recordHistory();
      autosave();
    });
    row.appendChild(reset);
    boxColorStyleList.appendChild(row);
  });
}

function renderPresetPalette() {
  if (!presetColorPalette) return;
  presetColorPalette.innerHTML = '';
  PASTEL_PALETTE.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-swatch';
    button.style.background = color;
    button.title = `Use ${color}.`;
    button.addEventListener('click', () => applyPaletteColor(color));
    presetColorPalette.appendChild(button);
  });
}

function updateCustomBoxStyleSwatch() {
  if (!customBoxStyleSwatch) return;
  customBoxStyleSwatch.dataset.styleKind = 'newCustom';
  customBoxStyleSwatch.dataset.styleId = 'new';
  customBoxStyleSwatch.style.background = normalizePaletteColor(customBoxStyleColor?.value, '#d9d9d9');
  customBoxStyleSwatch.onclick = () => openStylePalette({ kind: 'newCustom', id: 'new' });
}

function openStylePalette(target) {
  if (!presetColorPalette) return;
  activeStyleColorTarget = target;
  renderStyleSettings();
  requestAnimationFrame(() => {
    const anchor = stylePaletteAnchorForTarget(target);
    if (!anchor) return;
    presetColorPalette.hidden = false;
    positionStylePalette(anchor);
  });
}

function closeStylePalette({ rerender = true } = {}) {
  if (presetColorPalette) presetColorPalette.hidden = true;
  activeStyleColorTarget = null;
  if (rerender) renderStyleSettings();
}

function stylePaletteAnchorForTarget(target) {
  if (!target) return null;
  if (target.kind === 'newCustom') return customBoxStyleSwatch;
  const kind = CSS.escape(target.kind);
  const id = CSS.escape(target.id);
  return document.querySelector(`.style-swatch[data-style-kind="${kind}"][data-style-id="${id}"]`);
}

function positionStylePalette(anchor) {
  if (!presetColorPalette || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const width = presetColorPalette.offsetWidth || 292;
  const height = presetColorPalette.offsetHeight || 78;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8));
  presetColorPalette.style.left = `${Math.round(left)}px`;
  presetColorPalette.style.top = `${Math.round(top)}px`;
}

function applyPaletteColor(color) {
  const safeColor = normalizePaletteColor(color, '#ffffff');
  diagram.styles = normalizeStyleSettings(diagram.styles);
  if (!activeStyleColorTarget) return;
  if (activeStyleColorTarget.kind === 'newCustom') {
    if (customBoxStyleColor) customBoxStyleColor.value = safeColor;
    updateCustomBoxStyleSwatch();
    closeStylePalette({ rerender: false });
    return;
  }
  if (activeStyleColorTarget.kind === 'custom') {
    const style = customBoxStyles().find((item) => item.id === activeStyleColorTarget.id);
    if (style) style.color = safeColor;
  } else {
    diagram.styles.colorOverrides[activeStyleColorTarget.id] = safeColor;
  }
  if (customBoxStyleColor) customBoxStyleColor.value = safeColor;
  closeStylePalette({ rerender: false });
  render();
  recordHistory();
  autosave();
}

function addCustomBoxStyle() {
  const label = (customBoxStyleLabel?.value || '').trim();
  const color = normalizePaletteColor(customBoxStyleColor?.value, '#d9d9d9');
  if (!label) {
    customBoxStyleLabel?.focus();
    return;
  }
  diagram.styles = normalizeStyleSettings(diagram.styles);
  const style = {
    id: `custom-${nextId('style')}`,
    label,
    color,
  };
  diagram.styles.customBoxStyles.push(style);
  activeStyleColorTarget = null;
  if (customBoxStyleLabel) customBoxStyleLabel.value = '';
  if (customBoxStyleColor) customBoxStyleColor.value = '#d9d9d9';
  render();
  recordHistory();
  autosave();
}

function removeCustomBoxStyle(styleId) {
  diagram.styles = normalizeStyleSettings(diagram.styles);
  diagram.styles.customBoxStyles = diagram.styles.customBoxStyles.filter((style) => style.id !== styleId);
  Object.values(diagram.nodes).forEach((node) => {
    if (node.type === 'plot' && node.variant === styleId) node.variant = 'normal';
  });
  if (activeStyleColorTarget?.kind === 'custom' && activeStyleColorTarget.id === styleId) {
    closeStylePalette({ rerender: false });
  }
  render();
  renderStyleSettings();
  recordHistory();
  autosave();
}

function applyCustomStyleVariables() {
  STYLE_COLOR_TARGETS.forEach((target) => {
    document.body.style.setProperty(target.cssVar, styleColorForKey(target.id));
  });
  customBoxStyles().forEach((style) => {
    document.body.style.setProperty(`--${style.id}`, darkTheme ? darkenHex(style.color, 0.58) : style.color);
  });
}

function refreshRenderedNodeColors() {
  document.querySelectorAll('.node').forEach((el) => {
    const node = diagram.nodes[el.dataset.nodeId];
    if (node) el.style.background = nodeFillColor(node);
  });
  renderMiniMap();
  renderLocationOutline();
}

function updateLineStyleLabels() {
  [lineStyleSelect, toolbarLineStyleSelect].forEach((select) => {
    if (!select) return;
    Array.from(select.options).forEach((option) => {
      option.textContent = lineTypeLabel(option.value);
    });
  });
}

function labelForNode(node) {
  if (node.type === 'plot') return `Plot: ${node.variant || 'normal'}`;
  if (node.type === 'scene') return 'Scene/Chapter';
  if (node.type === 'sceneSpan') return 'Scene/Chapter Span';
  return node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

function storySummaryHtml(item) {
  const tags = tagLabel(item);
  const hasNote = Boolean(item?.storyNote?.trim());
  if (!tags && !hasNote) return '';
  return `<div class="story-summary">
    ${tags ? `<span>Tags: ${escapeHtml(tags)}</span>` : ''}
    ${hasNote ? '<span>Notes saved</span>' : ''}
  </div>`;
}

function tagLabel(item) {
  return Array.isArray(item?.tags) ? item.tags.join(', ') : '';
}

function currentStoryTarget() {
  if (selectedNodeId && diagram.nodes[selectedNodeId]) {
    return { kind: 'node', item: diagram.nodes[selectedNodeId], label: `${labelForNode(diagram.nodes[selectedNodeId])}: ${diagram.nodes[selectedNodeId].text || ''}` };
  }
  if (selectedEdgeId) {
    const edge = diagram.edges.find((item) => item.id === selectedEdgeId);
    if (edge) {
      return {
        kind: 'edge',
        item: edge,
        label: `Connector: ${diagram.nodes[edge.from]?.text || edge.from} -> ${diagram.nodes[edge.to]?.text || edge.to}`,
      };
    }
  }
  if (selectedGroupId) {
    const group = (diagram.groups || []).find((item) => item.id === selectedGroupId);
    if (group) return { kind: 'group', item: group, label: `Enclosing box: ${group.note || 'Note'}` };
  }
  return null;
}

function openStoryDrawerForSelection() {
  hideMenu();
  if (!storyDrawer) return;
  storyDrawer.hidden = false;
  syncStoryDrawerToggle();
  positionStorySearchPopover();
  renderStoryDrawer();
  requestAnimationFrame(() => storyNotesInput?.focus());
}

function closeStoryDrawer() {
  if (storyDrawer) storyDrawer.hidden = true;
  syncStoryDrawerToggle();
  positionStorySearchPopover();
}

function toggleStoryDrawer() {
  if (!storyDrawer || storyDrawer.hidden) {
    openStoryDrawerForSelection();
    return;
  }
  closeStoryDrawer();
}

function syncStoryDrawerToggle() {
  storyDrawerToggle?.classList.toggle('active', Boolean(storyDrawer && !storyDrawer.hidden));
}

function renderStoryDrawer() {
  if (!storyDrawerTarget || !storyTagsInput || !storyNotesInput) return;
  const target = currentStoryTarget();
  if (!target) {
    storyDrawerTarget.textContent = 'Nothing selected';
    storyTagsInput.value = '';
    storyNotesInput.value = '';
    storyTagsInput.disabled = true;
    storyNotesInput.disabled = true;
    return;
  }
  normalizeStoryFields(target.item);
  storyDrawerTarget.textContent = target.label;
  storyTagsInput.disabled = false;
  storyNotesInput.disabled = false;
  storyTagsInput.value = tagLabel(target.item);
  storyNotesInput.value = target.item.storyNote || '';
}

function updateCurrentStoryDetails() {
  const target = currentStoryTarget();
  if (!target) return;
  normalizeStoryFields(target.item);
  target.item.tags = (storyTagsInput?.value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  target.item.storyNote = storyNotesInput?.value || '';
  if (target.kind === 'node') {
    const nodeEl = document.querySelector(`.node[data-node-id="${CSS.escape(target.item.id)}"]`);
    if (nodeEl) nodeEl.dataset.tags = tagLabel(target.item);
  }
  updateSelectionDetails();
  updateStoryFilterVisuals();
  renderMiniMap();
  renderLocationOutline();
  if (diagramInspectorModal && !diagramInspectorModal.hidden) renderDiagramInspector();
  recordHistory();
  autosave();
}

function itemStorySearchText(item, options = {}) {
  if (!item) return '';
  const includeNotes = options.notes !== false;
  const includeTags = options.tags !== false;
  const fields = [item.text, item.note];
  if (includeNotes) fields.push(item.storyNote);
  if (includeTags) fields.push(tagLabel(item));
  if (item.from || item.to) {
    fields.push(diagram.nodes[item.from]?.text, diagram.nodes[item.to]?.text, item.relation, item.type);
  }
  return fields.filter(Boolean).join(' ').toLowerCase();
}

function storySearchItemAllowed(item) {
  if (!item) return false;
  if (item.from || item.to) return storySearchScopes.connectors;
  if (diagram.groups?.some((group) => group === item)) return storySearchScopes.groups;
  return storySearchScopes.boxes;
}

function scopedStorySearchText(item) {
  if (!storySearchItemAllowed(item)) return '';
  return itemStorySearchText(item, {
    notes: storySearchScopes.notes,
    tags: storySearchScopes.tags,
  });
}

function storyFilterClassForItem(item) {
  const query = storyFilter.trim().toLowerCase();
  if (!query) return '';
  return scopedStorySearchText(item).includes(query) ? 'filter-match' : 'filter-dim';
}

function updateStoryFilterVisuals() {
  document.querySelectorAll('.node').forEach((el) => {
    const item = diagram.nodes[el.dataset.nodeId];
    el.classList.remove('filter-match', 'filter-dim', 'filter-current');
    const cls = storyFilterClassForItem(item);
    if (cls) el.classList.add(cls);
  });
  document.querySelectorAll('.connector').forEach((el) => {
    const item = diagram.edges.find((edge) => edge.id === el.dataset.edgeId);
    el.classList.remove('filter-match', 'filter-dim', 'filter-current');
    const cls = storyFilterClassForItem(item);
    if (cls) el.classList.add(cls);
  });
  document.querySelectorAll('.group-box, .group-note').forEach((el) => {
    const item = (diagram.groups || []).find((group) => group.id === el.dataset.groupId);
    el.classList.remove('filter-match', 'filter-dim', 'filter-current');
    const cls = storyFilterClassForItem(item);
    if (cls) el.classList.add(cls);
  });
  markCurrentStorySearchResult();
}

function buildStorySearchResults() {
  const query = storyFilter.trim().toLowerCase();
  if (!query) return [];
  const results = [];
  Object.values(diagram.nodes).forEach((node) => {
    if (!scopedStorySearchText(node).includes(query)) return;
    const rect = nodeRects.get(node.id);
    if (!rect) return;
    results.push({
      kind: 'node',
      id: node.id,
      label: node.text || defaultTextFor(node.type),
      point: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    });
  });
  diagram.edges.forEach((edge) => {
    if (!scopedStorySearchText(edge).includes(query)) return;
    const fromRect = nodeRects.get(edge.from);
    const toRect = nodeRects.get(edge.to);
    if (!fromRect && !toRect) return;
    const fromPoint = fromRect
      ? { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 }
      : null;
    const toPoint = toRect
      ? { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 }
      : fromPoint;
    results.push({
      kind: 'edge',
      id: edge.id,
      label: `${diagram.nodes[edge.from]?.text || 'Connector'} -> ${diagram.nodes[edge.to]?.text || ''}`,
      point: {
        x: fromPoint && toPoint ? (fromPoint.x + toPoint.x) / 2 : toPoint.x,
        y: fromPoint && toPoint ? (fromPoint.y + toPoint.y) / 2 : toPoint.y,
      },
    });
  });
  (diagram.groups || []).forEach((group) => {
    if (!scopedStorySearchText(group).includes(query)) return;
    results.push({
      kind: 'group',
      id: group.id,
      label: group.note || 'Enclosing box',
      point: { x: group.x + group.width / 2, y: group.y + group.height / 2 },
    });
  });
  return results.sort((a, b) => (a.point.x - b.point.x) || (a.point.y - b.point.y) || a.label.localeCompare(b.label));
}

function refreshStorySearchResults(preserveCurrent = false) {
  const current = preserveCurrent ? storySearchResults[storySearchIndex] : null;
  storySearchResults = buildStorySearchResults();
  if (!storySearchResults.length) {
    storySearchIndex = -1;
  } else if (current) {
    const nextIndex = storySearchResults.findIndex((result) => result.kind === current.kind && result.id === current.id);
    storySearchIndex = nextIndex >= 0 ? nextIndex : Math.min(storySearchIndex, storySearchResults.length - 1);
  } else {
    storySearchIndex = 0;
  }
  updateStorySearchControls();
  markCurrentStorySearchResult();
}

function updateStorySearchControls() {
  if (storySearchCount) {
    storySearchCount.textContent = storySearchResults.length
      ? `${storySearchIndex + 1}/${storySearchResults.length}`
      : '0/0';
  }
  const disabled = storySearchResults.length === 0;
  if (storySearchPrev) storySearchPrev.disabled = disabled;
  if (storySearchNext) storySearchNext.disabled = disabled;
  if (storySearchToggle) {
    storySearchToggle.classList.toggle('active', Boolean(storyFilter.trim()) || Boolean(storySearchPopover && !storySearchPopover.hidden));
    storySearchToggle.title = storyFilter.trim()
      ? `Search: ${storySearchResults.length} match${storySearchResults.length === 1 ? '' : 'es'}`
      : 'Search boxes, notes, tags, connectors, and groups.';
  }
}

function markCurrentStorySearchResult() {
  document.querySelectorAll('.filter-current').forEach((el) => el.classList.remove('filter-current'));
  const result = storySearchResults[storySearchIndex];
  if (!result || !storyFilter.trim()) return;
  if (result.kind === 'node') {
    document.querySelector(`.node[data-node-id="${CSS.escape(result.id)}"]`)?.classList.add('filter-current');
  } else if (result.kind === 'edge') {
    document.querySelector(`.connector[data-edge-id="${CSS.escape(result.id)}"]`)?.classList.add('filter-current');
  } else if (result.kind === 'group') {
    document.querySelectorAll(`.group-box[data-group-id="${CSS.escape(result.id)}"], .group-note[data-group-id="${CSS.escape(result.id)}"]`)
      .forEach((el) => el.classList.add('filter-current'));
  }
}

function openStorySearch() {
  if (!storySearchPopover) return;
  storySearchPopover.hidden = false;
  storySearchToggle?.classList.add('active');
  positionStorySearchPopover();
  refreshStorySearchResults(true);
  requestAnimationFrame(() => {
    positionStorySearchPopover();
    storyFilterInput?.focus();
  });
}

function closeStorySearch() {
  if (!storySearchPopover) return;
  storySearchPopover.hidden = true;
  storySearchToggle?.classList.toggle('active', Boolean(storyFilter.trim()));
}

function toggleStorySearch() {
  if (!storySearchPopover) return;
  if (storySearchPopover.hidden) openStorySearch();
  else closeStorySearch();
}

function positionStorySearchPopover() {
  if (!storySearchPopover || !storySearchToggle || storySearchPopover.hidden) return;
  const width = storySearchPopover.offsetWidth || 280;
  const toggleRect = storySearchToggle.getBoundingClientRect();
  let left = Math.min(toggleRect.left, window.innerWidth - width - 8);
  if (storyDrawer && !storyDrawer.hidden) {
    const drawerRect = storyDrawer.getBoundingClientRect();
    left = Math.min(left, drawerRect.left - width - 12);
  }
  left = Math.max(8, left);
  storySearchPopover.style.setProperty('--search-popover-left', `${Math.round(left)}px`);
  storySearchPopover.style.setProperty('--search-popover-top', `${Math.round(toggleRect.bottom + 8)}px`);
}

function clearStorySearch() {
  storyFilter = '';
  if (storyFilterInput) storyFilterInput.value = '';
  storySearchResults = [];
  storySearchIndex = -1;
  refreshStorySearchResults(false);
  updateStoryFilterVisuals();
  updateStorySearchControls();
  storyFilterInput?.focus();
}

function updateStorySearchScopes() {
  storySearchScopeInputs.forEach((input) => {
    storySearchScopes[input.value] = input.checked;
  });
  refreshStorySearchResults(true);
  updateStoryFilterVisuals();
}

function jumpStorySearch(delta = 0) {
  if (!storySearchResults.length) return;
  if (delta) {
    storySearchIndex = (storySearchIndex + delta + storySearchResults.length) % storySearchResults.length;
  } else if (storySearchIndex < 0) {
    storySearchIndex = 0;
  }
  const result = storySearchResults[storySearchIndex];
  if (!result) return;
  if (result.kind === 'node') {
    navigateToNode(result.id);
  } else if (result.kind === 'edge') {
    selectedEdgeId = result.id;
    clearNodeSelection();
    panToWorldPoint(result.point.x, result.point.y);
    updateSelectionVisuals();
    updateSelectionDetails();
  } else if (result.kind === 'group') {
    clearNodeSelection();
    selectedGroupId = result.id;
    selectedEdgeId = null;
    panToWorldPoint(result.point.x, result.point.y);
    updateSelectionVisuals();
    updateSelectionDetails();
  }
  updateStorySearchControls();
  markCurrentStorySearchResult();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function showNodeMenu(nodeId, x, y) {
  const node = diagram.nodes[nodeId];
  const isPlot = node.type === 'plot';
  const isCharacter = node.type === 'character';
  const isLocation = node.type === 'location';
  const items = [];
  const groupIds = selectedNodeIds.has(nodeId) ? Array.from(selectedNodeIds) : [nodeId];
  const hasGroup = groupIds.length > 1;

  if (hasGroup) {
    items.push({
      label: `Selection (${groupIds.length})`,
      submenu: [
        ['Space selected to .2', () => spaceSelectedToGap(groupIds)],
        ['Align center X', () => alignSelectedCenterX(groupIds, nodeId)],
        ...allPlotVariantItems().map((variant) => [`Type: ${plotVariantLabel(variant.id)}`, () => setSelectedPlotVariant(groupIds, variant.id)]),
        {
          label: 'Box border',
          submenu: lineTypeItems((type) => setSelectedNodeBorder(groupIds, type)),
        },
      ],
    });
    items.push(['divider']);
  }

  items.push({
    label: 'Text',
    submenu: [
      ['Edit', () => editNodeText(nodeId)],
      ['Copy', () => copyNodeText(nodeId)],
      ['Paste', () => pasteNodeText(nodeId)],
      ['Cut', () => cutNodeText(nodeId)],
    ],
  });
  items.push(['Details...', () => openStoryDrawerForSelection()]);
  items.push(['divider']);

  if (isPlot) {
    items.push(['Add plot point before', () => addPlotBefore(nodeId)]);
    items.push(['Add plot point after', () => addPlotAfter(nodeId)]);
  }
  if (isLocation) {
    items.push(['Add plot point after', () => addPlotAfter(nodeId)]);
    items.push({
      label: 'Location organization',
      submenu: buildLocationOrganizationItems(nodeId),
    });
  }
  if (isCharacter) {
    items.push(['Add character below this', () => addCharacterAfterCharacter(nodeId)]);
    items.push(['Add note', () => addAttachment(nodeId, 'note')]);
  }
  if (isLocation) {
    items.push(['Add note', () => addAttachment(nodeId, 'note')]);
  }
  if (isPlot) {
    items.push(['Add character under this', () => addAttachment(nodeId, 'character')]);
    items.push({
      label: 'Add box...',
      submenu: [
        ['Note', () => addAttachment(nodeId, 'note')],
        ['Scene / Chapter', () => addSceneChapterBox(nodeId)],
        ['Time', () => addTimeBox(nodeId)],
        ['Time passage', () => addTimePassageBox(nodeId)],
        ['Meta', () => addMetaBox(nodeId)],
      ],
    });
    items.push({
      label: 'Add branch',
      submenu: buildBranchItems(nodeId),
    });
    items.push({
      label: 'Move to...',
      submenu: buildMoveItems(nodeId),
    });
    items.push({
      label: 'Type (Color)',
      submenu: allPlotVariantItems().map((variant) => [plotVariantLabel(variant.id), () => setPlotVariant(nodeId, variant.id)]),
    });
  }
  if (['metaLabel', 'metaSpan', 'scene', 'sceneSpan', 'time', 'timePassage', 'note'].includes(node.type)) {
    items.push(['Add note', () => addAttachment(nodeId, 'note')]);
  }

  if (node.type === 'note' && noteCanShiftSide(node)) {
    items.push({
      label: 'Note placement',
      submenu: [
        ['Left', () => setNotePlacement(nodeId, 'left')],
        ['Right', () => setNotePlacement(nodeId, 'right')],
      ],
    });
  }

  if (node.type === 'note') {
    items.push({
      label: 'Note line',
      submenu: lineTypeItems((type) => setNoteLineType(nodeId, type)),
    });
  }

  items.push({
    label: 'Box border',
    submenu: lineTypeItems((type) => setSelectedNodeBorder(groupIds, type)),
  });

  if (node.railId) {
    items.push(['divider']);
    items.push(['Copy X position', () => copyAnchor(nodeId)]);
    items.push(['Align to copied X', () => alignToCopiedAnchor(nodeId)]);
    if (groupIds.length > 1) items.push(['Align selected center X', () => alignSelectedCenterX(groupIds, nodeId)]);
    items.push(['Move rail up', () => moveRailInOutline(node.railId, -1)]);
    items.push(['Move rail down', () => moveRailInOutline(node.railId, 1)]);
  }

  items.push(['divider']);
  items.push(['Delete', () => deleteNode(nodeId)]);

  contextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      contextMenu.appendChild(divider);
      return;
    }
    if (item.submenu) {
      contextMenu.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    if (!item[1]) button.disabled = true;
    button.addEventListener('click', () => {
      if (!item[1]) return;
      hideMenu();
      item[1]();
    });
    contextMenu.appendChild(button);
  });

  positionContextMenu(x, y);
}

function showEdgeMenu(edgeId, x, y) {
  const items = [
    ['Details...', () => openStoryDrawerForSelection()],
    ['divider'],
    ['Delete connector', () => deleteEdge(edgeId)],
    ['divider'],
    {
      label: 'Line type',
      submenu: lineTypeItems((type) => setEdgeType(edgeId, type)),
    },
    {
      label: 'Arrows',
      submenu: [
        ['None', () => setEdgeArrows(edgeId, 'none')],
        ['Start', () => setEdgeArrows(edgeId, 'start')],
        ['End', () => setEdgeArrows(edgeId, 'end')],
        ['Both', () => setEdgeArrows(edgeId, 'both')],
      ],
    },
    ['Reset route', () => resetEdgeRoute(edgeId)],
  ];

  contextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      contextMenu.appendChild(divider);
      return;
    }
    if (item.submenu) {
      contextMenu.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    if (!item[1]) button.disabled = true;
    button.addEventListener('click', () => {
      if (!item[1]) return;
      hideMenu();
      item[1]();
    });
    contextMenu.appendChild(button);
  });

  positionContextMenu(x, y);
}

function showGroupMenu(groupId, x, y) {
  const items = [
    ['Details...', () => openStoryDrawerForSelection()],
    ['divider'],
    ['Edit note', () => focusGroupNote(groupId)],
    {
      label: 'Note Placement',
      submenu: [
        ['Top left', () => setGroupNoteCorner(groupId, 'top-left')],
        ['Top right', () => setGroupNoteCorner(groupId, 'top-right')],
        ['Bottom left', () => setGroupNoteCorner(groupId, 'bottom-left')],
        ['Bottom right', () => setGroupNoteCorner(groupId, 'bottom-right')],
      ],
    },
    {
      label: 'Box border',
      submenu: lineTypeItems((type) => setGroupBorder(groupId, type)),
    },
    ['divider'],
    ['Delete', () => deleteGroup(groupId)],
  ];

  contextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      contextMenu.appendChild(divider);
      return;
    }
    if (item.submenu) {
      contextMenu.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    if (!item[1]) button.disabled = true;
    button.addEventListener('click', () => {
      if (!item[1]) return;
      hideMenu();
      item[1]();
    });
    contextMenu.appendChild(button);
  });

  positionContextMenu(x, y);
}

function showCanvasMenu(event) {
  const point = worldPointFromEvent(event);
  const items = [
    ['Add rail here', () => addStandaloneRailAt(point)],
    {
      label: 'Add space here',
      submenu: timelineSpaceItems((inches) => addTimelineSpaceAt(point.x, inches), () => addCustomTimelineSpaceAt(point.x)),
    },
    {
      label: 'Remove space here',
      submenu: timelineSpaceItems((inches) => removeTimelineSpaceAt(point.x, inches), () => removeCustomTimelineSpaceAt(point.x)),
    },
    ['divider'],
    ['Topmost', moveToTopmostBox],
    ['Leftmost', moveToLeftmostTopBox],
    ['Rightmost', moveToRightmostBox],
    ['Bottommost', moveToBottommostBox],
    ['divider'],
    [locationColumn?.hidden ? 'Show Locations' : 'Hide Locations', () => setLocationColumnOpen(Boolean(locationColumn?.hidden))],
    ['Location Org...', openLocationOrganizer],
    [miniMapVisible ? 'Hide Map' : 'Show Map', toggleMiniMap],
    ['Diagram Manager...', openDiagramInspector],
    ['divider'],
    [lineMode ? 'Leave Line Mode' : 'Line Mode', toggleLineMode],
    [boxMode ? 'Leave Box Mode' : 'Box Mode', toggleBoxMode],
    ['Auto Shift', toggleAutoShift],
    ['Grid', toggleGrid],
    [darkTheme ? 'Light' : 'Dark', toggleTheme],
  ];

  contextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      contextMenu.appendChild(divider);
      return;
    }
    if (item.submenu) {
      contextMenu.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    button.addEventListener('click', () => {
      hideMenu();
      item[1]();
    });
    contextMenu.appendChild(button);
  });
  positionContextMenu(event.clientX, event.clientY);
}

function timelineSpaceItems(applyPreset, applyCustom) {
  return [
    ['0.2"', () => applyPreset(0.2)],
    ['0.4"', () => applyPreset(0.4)],
    ['1"', () => applyPreset(1)],
    ['2"', () => applyPreset(2)],
    ['Custom...', applyCustom],
  ];
}

function addTimelineSpaceAt(x, inches) {
  if (!Number.isFinite(x) || !Number.isFinite(inches) || inches <= 0) return;
  const insertionX = snapToGrid(x);
  const delta = snapToGrid(inches * INCH);
  if (delta <= 0) return;
  shiftTimelineSpace(insertionX, delta, { force: true });
  render();
  recordHistory();
  autosave();
}

function addCustomTimelineSpaceAt(x) {
  const input = window.prompt('Space to add in inches:', '1');
  if (input === null) return;
  const value = Number.parseFloat(String(input).replace('"', '').trim());
  if (!Number.isFinite(value) || value <= 0) return;
  addTimelineSpaceAt(x, Math.min(24, Math.max(0.1, value)));
}

function removeTimelineSpaceAt(x, inches) {
  if (!Number.isFinite(x) || !Number.isFinite(inches) || inches <= 0) return;
  const insertionX = snapToGrid(x);
  const delta = snapToGrid(inches * INCH);
  if (delta <= 0) return;
  removeTimelineSpace(insertionX, delta);
  render();
  recordHistory();
  autosave();
}

function removeCustomTimelineSpaceAt(x) {
  const input = window.prompt('Space to remove in inches:', '1');
  if (input === null) return;
  const value = Number.parseFloat(String(input).replace('"', '').trim());
  if (!Number.isFinite(value) || value <= 0) return;
  removeTimelineSpaceAt(x, Math.min(24, Math.max(0.1, value)));
}

function addSceneChapterMarker(point) {
  const id = nextId('node');
  diagram.nodes[id] = normalizeStoryFields({
    id,
    type: 'scene',
    text: defaultTextFor('scene'),
    anchorX: snapToGrid(point.x),
    anchorY: snapToGrid(point.y),
  });
  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addSceneChapterBox(parentId) {
  const baseSlot = nextAttachmentSlot(parentId);
  const labelId = nextId('node');
  const spanId = nextId('node');
  diagram.nodes[labelId] = normalizeStoryFields({
    id: labelId,
    type: 'scene',
    text: defaultTextFor('scene'),
    parentId,
    slot: baseSlot,
  });
  diagram.nodes[spanId] = normalizeStoryFields({
    id: spanId,
    type: 'sceneSpan',
    text: defaultTextFor('sceneSpan'),
    parentId,
    slot: baseSlot + 1,
  });
  diagram.edges.push({ id: nextId('edge'), from: labelId, to: spanId, type: 'level1', relation: 'attachment' });
  setSingleSelectedNode(spanId);
  selectedEdgeId = null;
  focusAfterRender(spanId);
  render();
}

function lineTypeItems(callback) {
  return LINE_TYPES.map((type) => [lineTypeLabel(type.id), () => callback(type.id)]);
}

function buildBranchItems(sourceId) {
  const source = diagram.nodes[sourceId];
  const items = [
    ['New location above', () => addBranch(sourceId, 'above')],
    ['New location below', () => addBranch(sourceId, 'below')],
    ['New location bottom', () => addBranch(sourceId, 'bottom')],
    ['divider'],
  ];

  const existingItems = buildLocationRailTreeItems(
    (location) => location.railId !== source.railId,
    (location) => addBranchToExistingLocation(sourceId, location.railId),
  );

  items.push({
    label: 'Existing location',
    submenu: existingItems.length ? existingItems : [['No other locations yet', null]],
  });

  return items;
}

function buildRailConnectionItems(nodeId) {
  const node = diagram.nodes[nodeId];
  const rail = diagram.rails[node.railId];
  if (!rail) return [['No rail found', null]];

  const index = rail.plotIds.indexOf(nodeId);
  const items = [];
  const previousId = rail.plotIds[index - 1] || rail.locationId;
  const nextId = rail.plotIds[index + 1] || null;

  if (previousId) {
    items.push(['Line from previous', () => addSequenceEdge(previousId, nodeId)]);
  }
  if (nextId) {
    items.push(['Line to next', () => addSequenceEdge(nodeId, nextId)]);
  }
  if (!items.length) {
    items.push(['No neighboring boxes', null]);
  }

  return items;
}

function buildLocationOrganizationItems(nodeId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location') return [['Only locations can be organized', null]];
  const parentItems = buildLocationRailTreeItems(
    (location) => location.id !== nodeId && !isLocationDescendant(location.id, nodeId),
    (location) => setLocationParent(nodeId, location.id),
  );
  const groupItems = buildLocationGroupTreeItems(
    () => true,
    (group) => setLocationGroup(nodeId, group.id),
  );
  const newSubgroupItems = buildLocationGroupTreeItems(
    () => true,
    (group) => createLocationSubgroupForLocation(nodeId, group.id),
  );

  return [
    {
      label: 'Add to group',
      submenu: [
        ['New group', () => createLocationGroupForLocation(nodeId)],
        {
          label: 'New subgroup under...',
          submenu: newSubgroupItems.length ? newSubgroupItems : [['No groups yet', null]],
        },
        groupItems.length ? ['divider'] : null,
        ...groupItems,
      ].filter(Boolean),
    },
    ['Remove from group', node.groupId ? () => setLocationGroup(nodeId, null) : null],
    ['divider'],
    {
      label: 'Make sub-location of',
      submenu: parentItems.length ? parentItems : [['No valid parent locations', null]],
    },
    ['Move out one level', () => moveLocationOutOneLevel(nodeId)],
    ['Make top-level', () => {
      node.parentLocationId = null;
      node.groupId = null;
      render();
    }],
  ];
}

function buildLocationGroupTreeItems(filter, callback, parentGroupId = null) {
  const groups = Object.values(diagram.locationGroups || {})
    .filter((group) => (group.parentGroupId || null) === parentGroupId)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.text || '').localeCompare(b.text || ''));

  return groups.flatMap((group) => {
    const childItems = buildLocationGroupTreeItems(filter, callback, group.id);
    const canUse = !filter || filter(group);
    if (canUse && childItems.length) {
      return [{
        label: group.text || 'Untitled group',
        submenu: [
          ['Use this group', () => callback(group)],
          ['divider'],
          ...childItems,
        ],
      }];
    }
    if (canUse) return [[group.text || 'Untitled group', () => callback(group)]];
    return childItems.length ? [{ label: group.text || 'Untitled group', submenu: childItems }] : [];
  });
}

function createLocationGroupForLocation(nodeId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location') return;
  const id = nextId('location-group');
  diagram.locationGroups[id] = {
    id,
    text: 'Group',
    parentGroupId: null,
    order: Object.keys(diagram.locationGroups || {}).length,
  };
  node.groupId = id;
  node.parentLocationId = null;
  render();
  requestAnimationFrame(() => focusLocationGroupForEditing(id));
}

function createLocationSubgroupForLocation(nodeId, parentGroupId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location' || !diagram.locationGroups?.[parentGroupId]) return;
  const id = nextId('location-group');
  diagram.locationGroups[id] = {
    id,
    text: 'Group',
    parentGroupId,
    order: Object.keys(diagram.locationGroups || {}).length,
  };
  node.groupId = id;
  node.parentLocationId = null;
  render();
  requestAnimationFrame(() => focusLocationGroupForEditing(id));
}

function setLocationGroup(nodeId, groupId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location') return;
  node.groupId = groupId || null;
  if (groupId) node.parentLocationId = null;
  render();
}

function showLocationGroupMenu(groupId, x, y) {
  const group = diagram.locationGroups?.[groupId];
  if (!group) return;
  const parentItems = buildLocationGroupTreeItems(
    (candidate) => candidate.id !== groupId && !isLocationGroupDescendant(candidate.id, groupId),
    (candidate) => setLocationGroupParent(groupId, candidate.id),
  );
  const items = [
    ['Rename', () => focusLocationGroupForEditing(groupId)],
    ['Add subgroup', () => createLocationSubgroup(groupId)],
    ['Gather group rails', () => gatherLocationGroupRails(groupId)],
    ['Move group rails up', () => moveLocationGroupRails(groupId, -1)],
    ['Move group rails down', () => moveLocationGroupRails(groupId, 1)],
    {
      label: 'Make sub-group of',
      submenu: parentItems.length ? parentItems : [['No valid parent groups', null]],
    },
    ['Move out one level', group.parentGroupId ? () => moveLocationGroupOutOneLevel(groupId) : null],
    ['Make top-level', group.parentGroupId ? () => setLocationGroupParent(groupId, null) : null],
    ['divider'],
    ['Delete group', () => deleteLocationGroup(groupId)],
  ];
  contextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      contextMenu.appendChild(divider);
      return;
    }
    if (item.submenu) {
      contextMenu.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    if (!item[1]) button.disabled = true;
    button.addEventListener('click', () => {
      if (!item[1]) return;
      hideMenu();
      item[1]();
    });
    contextMenu.appendChild(button);
  });
  positionContextMenu(x, y);
}

function focusLocationGroupForEditing(groupId) {
  const el = locationOutlineNodes?.querySelector(`[data-location-group-id="${groupId}"]`);
  if (!el) return;
  el.focus();
  document.getSelection()?.selectAllChildren(el);
}

function createLocationSubgroup(parentGroupId) {
  const id = nextId('location-group');
  diagram.locationGroups[id] = {
    id,
    text: 'Group',
    parentGroupId,
    order: Object.keys(diagram.locationGroups || {}).length,
  };
  render();
  requestAnimationFrame(() => focusLocationGroupForEditing(id));
}

function setLocationGroupParent(groupId, parentGroupId) {
  const group = diagram.locationGroups?.[groupId];
  if (!group || group.id === parentGroupId || isLocationGroupDescendant(parentGroupId, groupId)) return;
  group.parentGroupId = parentGroupId || null;
  render();
}

function moveLocationGroupOutOneLevel(groupId) {
  const group = diagram.locationGroups?.[groupId];
  if (!group?.parentGroupId) return;
  const parent = diagram.locationGroups[group.parentGroupId];
  group.parentGroupId = parent?.parentGroupId || null;
  render();
}

function deleteLocationGroup(groupId) {
  if (!diagram.locationGroups?.[groupId]) return;
  Object.values(diagram.nodes).forEach((node) => {
    if (node.groupId === groupId) node.groupId = null;
  });
  Object.values(diagram.locationGroups).forEach((group) => {
    if (group.parentGroupId === groupId) group.parentGroupId = null;
  });
  delete diagram.locationGroups[groupId];
  render();
}

function updateLocationGroupText(groupId, text) {
  const group = diagram.locationGroups?.[groupId];
  if (!group) return;
  group.text = text.trim() || 'Group';
  render();
}

function isLocationGroupDescendant(groupId, possibleAncestorId) {
  if (!groupId) return false;
  let current = diagram.locationGroups?.[groupId];
  const seen = new Set();
  while (current?.parentGroupId && !seen.has(current.parentGroupId)) {
    if (current.parentGroupId === possibleAncestorId) return true;
    seen.add(current.parentGroupId);
    current = diagram.locationGroups[current.parentGroupId];
  }
  return false;
}

function locationBelongsToGroupSubtree(location, groupId) {
  if (!location || !groupId) return false;
  if (location.groupId === groupId || isLocationGroupDescendant(location.groupId, groupId)) return true;
  let current = location;
  const seen = new Set();
  while (current?.parentLocationId && !seen.has(current.parentLocationId)) {
    seen.add(current.parentLocationId);
    current = diagram.nodes[current.parentLocationId];
    if (current?.groupId === groupId || isLocationGroupDescendant(current?.groupId, groupId)) return true;
  }
  return false;
}

function gatherLocationGroupRails(groupId) {
  const groupedRailIds = locationGroupRailIds(groupId);
  if (groupedRailIds.length < 2) return;

  const groupedSet = new Set(groupedRailIds);
  const firstIndex = diagram.railOrder.findIndex((railId) => groupedSet.has(railId));
  const remaining = diagram.railOrder.filter((railId) => !groupedSet.has(railId));
  diagram.railOrder = [
    ...remaining.slice(0, firstIndex),
    ...groupedRailIds,
    ...remaining.slice(firstIndex),
  ];
  render();
}

function moveLocationGroupRails(groupId, direction) {
  moveOutlineItemRails({ kind: 'group', id: groupId }, direction);
}

function moveOutlineItemRails(item, direction) {
  const siblings = outlineSiblingItemsFor(item)
    .map((sibling) => ({ ...sibling, railIds: outlineItemRailIds(sibling) }))
    .filter((sibling) => sibling.railIds.length)
    .sort((a, b) => firstRailIndex(a.railIds) - firstRailIndex(b.railIds));
  const index = siblings.findIndex((sibling) => sibling.kind === item.kind && sibling.id === item.id);
  if (index < 0) return;
  const target = siblings[index + (direction < 0 ? -1 : 1)];
  if (!target) return;

  const movingRailIds = siblings[index].railIds;
  const movingSet = new Set(movingRailIds);
  const remaining = diagram.railOrder.filter((railId) => !movingSet.has(railId));
  const targetSet = new Set(target.railIds);
  const targetIndexes = remaining
    .map((railId, railIndex) => (targetSet.has(railId) ? railIndex : -1))
    .filter((railIndex) => railIndex >= 0);
  if (!targetIndexes.length) return;
  const insertIndex = direction < 0
    ? Math.min(...targetIndexes)
    : Math.max(...targetIndexes) + 1;
  diagram.railOrder = [
    ...remaining.slice(0, insertIndex),
    ...movingRailIds,
    ...remaining.slice(insertIndex),
  ];
  render();
}

function outlineSiblingItemsFor(item) {
  if (item.kind === 'group') {
    const group = diagram.locationGroups?.[item.id];
    if (!group) return [];
    return outlineChildItems(group.parentGroupId || null);
  }
  const location = diagram.nodes[item.id];
  if (!location || location.type !== 'location') return [];
  if (location.groupId) return outlineChildItems(location.groupId);
  if (location.parentLocationId) return childLocationItems(location.parentLocationId);
  return outlineChildItems(null);
}

function outlineChildItems(parentGroupId) {
  const groupItems = Object.values(diagram.locationGroups || {})
    .filter((group) => (group.parentGroupId || null) === (parentGroupId || null))
    .map((group) => ({ kind: 'group', id: group.id }));
  const locationItems = diagram.railOrder
    .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
    .filter((location) => location?.type === 'location')
    .filter((location) => {
      if (parentGroupId) return location.groupId === parentGroupId && !location.parentLocationId;
      return !location.groupId && !location.parentLocationId;
    })
    .map((location) => ({ kind: 'location', id: location.id }));
  return [...groupItems, ...locationItems];
}

function childLocationItems(parentLocationId) {
  return diagram.railOrder
    .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
    .filter((location) => location?.type === 'location' && location.parentLocationId === parentLocationId)
    .map((location) => ({ kind: 'location', id: location.id }));
}

function outlineItemRailIds(item) {
  if (item.kind === 'group') return locationGroupRailIds(item.id);
  if (item.kind === 'location') return locationSubtreeRailIds(item.id);
  return [];
}

function locationSubtreeRailIds(locationId) {
  const locationIds = new Set([locationId]);
  expandLocationSetWithDescendants(locationIds);
  return diagram.railOrder.filter((railId) => locationIds.has(diagram.rails[railId]?.locationId));
}

function firstRailIndex(railIds) {
  const indexes = railIds.map((railId) => diagram.railOrder.indexOf(railId)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : Number.POSITIVE_INFINITY;
}

function locationGroupRailIds(groupId) {
  const groupIds = descendantLocationGroupIds(groupId);
  const locationIds = new Set();
  diagram.railOrder.forEach((railId) => {
    const locationId = diagram.rails[railId]?.locationId;
    const location = diagram.nodes[locationId];
    if (location?.groupId && groupIds.has(location.groupId)) locationIds.add(locationId);
  });
  expandLocationSetWithDescendants(locationIds);

  const groupedRailIds = diagram.railOrder.filter((railId) => locationIds.has(diagram.rails[railId]?.locationId));
  return groupedRailIds;
}

function expandLocationSetWithDescendants(locationIds) {
  let changed = true;
  while (changed) {
    changed = false;
    diagram.railOrder.forEach((railId) => {
      const locationId = diagram.rails[railId]?.locationId;
      const location = diagram.nodes[locationId];
      if (!location || locationIds.has(locationId)) return;
      if (location.parentLocationId && locationIds.has(location.parentLocationId)) {
        locationIds.add(locationId);
        changed = true;
      }
    });
  }
}

function descendantLocationGroupIds(groupId) {
  const ids = new Set([groupId]);
  let changed = true;
  while (changed) {
    changed = false;
    Object.values(diagram.locationGroups || {}).forEach((group) => {
      if (!ids.has(group.id) && ids.has(group.parentGroupId)) {
        ids.add(group.id);
        changed = true;
      }
    });
  }
  return ids;
}

function buildLocationRailTreeItems(filter, callback, parentLocationId = null) {
  const children = diagram.railOrder
    .map((railId) => diagram.rails[railId])
    .filter(Boolean)
    .map((rail) => diagram.nodes[rail.locationId])
    .filter((location) => location && (location.parentLocationId || null) === parentLocationId);

  return children.flatMap((location) => {
    const childItems = buildLocationRailTreeItems(filter, callback, location.id);
    const canUse = !filter || filter(location);
    const items = [];
    if (canUse) {
      if (childItems.length) {
        items.push({
          label: location.text || 'Untitled location',
          submenu: [
            ['Use this location', () => callback(location)],
            ['divider'],
            ...childItems,
          ],
        });
      } else {
        items.push([location.text || 'Untitled location', () => callback(location)]);
      }
    } else if (childItems.length) {
      items.push({
        label: location.text || 'Untitled location',
        submenu: childItems,
      });
    }
    return items;
  });
}

function setLocationParent(nodeId, parentLocationId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location') return;
  node.parentLocationId = parentLocationId || null;
  if (parentLocationId) node.groupId = null;
  render();
}

function moveLocationOutOneLevel(nodeId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'location' || !node.parentLocationId) return;
  const parent = diagram.nodes[node.parentLocationId];
  node.parentLocationId = parent?.parentLocationId || null;
  node.groupId = node.parentLocationId ? null : parent?.groupId || null;
  render();
}

function isLocationDescendant(locationId, possibleAncestorId) {
  let current = diagram.nodes[locationId];
  const seen = new Set();
  while (current?.parentLocationId && !seen.has(current.parentLocationId)) {
    if (current.parentLocationId === possibleAncestorId) return true;
    seen.add(current.parentLocationId);
    current = diagram.nodes[current.parentLocationId];
  }
  return false;
}

function locationOutlineDepth(locationId) {
  let depth = 0;
  let current = diagram.nodes[locationId];
  const seen = new Set();
  while (current?.parentLocationId && !seen.has(current.parentLocationId)) {
    seen.add(current.parentLocationId);
    const parent = diagram.nodes[current.parentLocationId];
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

function buildMoveItems(nodeId) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'plot') return [['Only plot boxes can move rails', null]];

  return [
    {
      label: 'This box only',
      submenu: [
        ['New rail above', () => movePlotToNewRail(nodeId, 'single', 'above')],
        ['New rail below', () => movePlotToNewRail(nodeId, 'single', 'below')],
        {
          label: 'Existing rail',
          submenu: buildExistingRailMoveItems(nodeId, 'single'),
        },
      ],
    },
    {
      label: 'This and following',
      submenu: [
        ['New rail above', () => movePlotToNewRail(nodeId, 'following', 'above')],
        ['New rail below', () => movePlotToNewRail(nodeId, 'following', 'below')],
        {
          label: 'Existing rail',
          submenu: buildExistingRailMoveItems(nodeId, 'following'),
        },
      ],
    },
  ];
}

function buildExistingRailMoveItems(nodeId, scope) {
  const source = diagram.nodes[nodeId];
  const items = buildLocationRailTreeItems(
    (location) => location.railId !== source.railId,
    (location) => movePlotToExistingRail(nodeId, scope, location.railId),
  );

  return items.length ? items : [['No other locations yet', null]];
}

function addSequenceEdge(fromId, toId) {
  ensureSequenceEdge(fromId, toId);
  render();
}

function ensureSequenceEdge(fromId, toId) {
  if (!fromId || !toId) return;
  const existing = diagram.edges.some((edge) => (
    edge.relation === 'sequence' && edge.from === fromId && edge.to === toId
  ));
  if (!existing) {
    diagram.edges.push({ id: nextId('edge'), from: fromId, to: toId, type: 'solid', relation: 'sequence' });
  }
}

function startConnector(nodeId, fromSide = 'right') {
  pendingConnector = { fromId: nodeId, fromSide };
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  updateSelectionVisuals();
  updateSelectionDetails();
}

function finishConnector(toId, toSide = 'left') {
  if (!pendingConnector || pendingConnector.fromId === toId) return;
  diagram.edges.push({
    id: nextId('edge'),
    from: pendingConnector.fromId,
    to: toId,
    type: currentLineStyle(),
    relation: 'manual',
    fromSide: pendingConnector.fromSide,
    toSide,
  });
  pendingConnector = null;
  render();
}

function currentLineStyle() {
  return toolbarLineStyleSelect?.value || lineStyleSelect?.value || 'solid';
}

function setEdgeType(edgeId, type) {
  const edge = diagram.edges.find((item) => item.id === edgeId);
  if (!edge) return;
  edge.type = type;
  render();
}

function setEdgeArrows(edgeId, arrows) {
  const edge = diagram.edges.find((item) => item.id === edgeId);
  if (!edge) return;
  edge.arrows = arrows === 'none' ? null : arrows;
  render();
}

function resetEdgeRoute(edgeId) {
  const edge = diagram.edges.find((item) => item.id === edgeId);
  if (!edge) return;
  resetEdgeRouteState(edge);
  render();
}

function deleteEdge(edgeId) {
  diagram.edges = diagram.edges.filter((edge) => edge.id !== edgeId);
  selectedEdgeId = null;
  render();
}

function borderClass(type) {
  return type && type !== 'solid' ? `border-${type}` : '';
}

function groupBorderClass(type) {
  return `border-${type || 'solid'}`;
}

function setSelectedNodeBorder(nodeIds, type) {
  nodeIds.forEach((nodeId) => {
    const node = diagram.nodes[nodeId];
    if (node) node.borderType = type === 'solid' ? null : type;
  });
  render();
}

function setNotePlacement(nodeId, placement) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'note' || !['left', 'right'].includes(placement) || !noteCanShiftSide(node)) return;
  node.notePlacement = placement;
  render();
}

function setNoteLineType(nodeId, type) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'note') return;
  node.borderType = type === 'solid' ? null : type;
  diagram.edges
    .filter((edge) => edge.relation === 'attachment' && edge.to === nodeId)
    .forEach((edge) => {
      edge.type = type;
    });
  render();
}

function snapToGrid(value) {
  return Math.round(value / SNAP_GAP) * SNAP_GAP;
}

function leftForSnappedCenter(width, centerX) {
  return snapToGrid(centerX - width / 2);
}

function copyAnchor(nodeId) {
  const rect = nodeRects.get(nodeId);
  if (!rect) return;
  copiedAnchorX = rect.x;
}

function alignToCopiedAnchor(nodeId) {
  if (!Number.isFinite(copiedAnchorX)) return;
  const node = diagram.nodes[nodeId];
  if (!node || node.type !== 'plot') return;
  node.anchorX = copiedAnchorX;
  render();
}

function editNodeText(nodeId) {
  focusNodeForEditing(nodeId);
}

async function copyNodeText(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return;
  try {
    await navigator.clipboard.writeText(node.text || '');
  } catch {
    focusNodeForEditing(nodeId);
  }
}

async function pasteNodeText(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    node.text = text.trim() || defaultTextFor(node.type);
    syncMetaText(nodeId, node.text);
    setSingleSelectedNode(nodeId);
    selectedEdgeId = null;
    render();
  } catch {
    focusNodeForEditing(nodeId);
  }
}

async function cutNodeText(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return;
  try {
    await navigator.clipboard.writeText(node.text || '');
  } catch {
    focusNodeForEditing(nodeId);
    return;
  }
  node.text = defaultTextFor(node.type);
  syncMetaText(nodeId, node.text);
  setSingleSelectedNode(nodeId);
  selectedEdgeId = null;
  render();
}

function setSelectedPlotVariant(nodeIds, variant) {
  nodeIds.forEach((nodeId) => {
    const node = diagram.nodes[nodeId];
    if (node?.type === 'plot') node.variant = variant;
  });
  render();
}

function spaceSelectedToGap(nodeIds) {
  const movable = nodeIds
    .map((id) => ({ id, node: diagram.nodes[id], rect: nodeRects.get(id) }))
    .filter((item) => item.node && item.rect && isHorizontallyDraggable(item.node))
    .sort((a, b) => a.rect.x - b.rect.x);
  if (movable.length < 2) return;

  let x = movable[0].rect.x;
  movable.forEach((item, index) => {
    if (index > 0) {
      const previous = movable[index - 1];
      x = snapToGrid((previous.node.anchorX ?? previous.rect.x) + previous.rect.width + GAP);
    }
    item.node.anchorX = x;
  });
  render();
}

function alignSelectedCenterX(nodeIds, anchorId) {
  const anchorRect = nodeRects.get(anchorId);
  if (!anchorRect) return;
  const targetCenter = snapToGrid(anchorRect.x + anchorRect.width / 2);
  const selectedIds = new Set(nodeIds);
  nodeIds.forEach((id) => {
    const node = diagram.nodes[id];
    const rect = nodeRects.get(id);
    if (!node || !rect || !isHorizontallyDraggable(node)) return;
    node.anchorX = leftForSnappedCenter(rect.width, targetCenter);
  });
  diagram.edges.forEach((edge) => {
    if (!selectedIds.has(edge.from) || !selectedIds.has(edge.to)) return;
    if (!isVerticalConnector(edge)) return;
    resetEdgeRouteState(edge);
  });
  render();
}

function isVerticalConnector(edge) {
  const fromSide = edge.fromSide || 'right';
  const toSide = edge.toSide || 'left';
  return (fromSide === 'bottom' || fromSide === 'top')
    && (toSide === 'bottom' || toSide === 'top');
}

function resetEdgeRouteState(edge) {
  edge.manualRouting = false;
  edge.routeHandles = [];
  edge.points = [];
  ['stepX', 'stepY', 'doglegStartX', 'doglegMidY', 'doglegEndX', 'doglegStartY', 'doglegMidX', 'doglegEndY', 'routeX1', 'routeX2', 'routeY1', 'routeY2', 'routeMidX', 'routeMidY'].forEach((key) => {
    delete edge[key];
  });
}

function openLocationOrganizer() {
  openDiagramInspector('locationOrg');
}

function openDiagramInspector(tabId = inspectorTab) {
  if (!diagramInspectorModal || !diagramInspectorList) return;
  if (typeof tabId === 'string' && tabId !== inspectorTab) {
    inspectorTab = tabId;
    if (diagramInspectorSearch) diagramInspectorSearch.value = '';
  }
  hideMenu();
  diagramInspectorModal.hidden = false;
  renderDiagramInspector();
  requestAnimationFrame(() => {
    if (diagramInspectorSearchRow && !diagramInspectorSearchRow.hidden) diagramInspectorSearch?.focus();
  });
}

function closeDiagramInspector() {
  if (!diagramInspectorModal) return;
  diagramInspectorModal.hidden = true;
  closeStylePalette({ rerender: false });
}

const INSPECTOR_TABS = [
  { id: 'info', label: 'Info' },
  { id: 'styles', label: 'Styles' },
  { id: 'stats', label: 'Stats' },
  { id: 'export', label: 'Export' },
  { id: 'locations', label: 'Locations' },
  { id: 'locationOrg', label: 'Location Org' },
  { id: 'story', label: 'Details' },
  { id: 'characters', label: 'Characters' },
  { id: 'plots', label: 'Plots' },
  { id: 'notes', label: 'Notes' },
  { id: 'metaTime', label: 'Meta/Scene/Time' },
  { id: 'groups', label: 'Groups/Boxes' },
  { id: 'help', label: 'Help' },
];

const INSPECTOR_SEARCHABLE_TABS = new Set(['locations', 'locationOrg', 'story', 'characters', 'plots', 'notes', 'metaTime', 'groups']);
const INSPECTOR_TAB_SUMMARIES = {
  locations: 'Browse, jump to, or select every location rail and location group.',
  locationOrg: 'Review and reorganize location groups, subgroups, sub-locations, and rail hierarchy.',
  story: 'Review notes, tags, and story-layer details attached to diagram items.',
  characters: 'Browse character boxes and jump to where each character appears.',
  plots: 'Browse plot boxes by rail, color/type, and timeline position.',
  notes: 'Browse note boxes attached to plot, character, location, marker, time-passage, and note items.',
  metaTime: 'Browse film/meta, scene/chapter, year/time, and time-passage markers.',
  groups: 'Browse enclosing boxes and box-mode notes.',
};

function renderDiagramInspector() {
  if (!diagramInspectorTabs || !diagramInspectorList) return;
  if (!INSPECTOR_TABS.some((tab) => tab.id === inspectorTab)) inspectorTab = 'info';
  renderInspectorTabs();
  const query = (diagramInspectorSearch?.value || '').trim().toLowerCase();
  const settingsPanel = renderInspectorSettingsTab();
  if (settingsPanel) {
    diagramInspectorSummary.textContent = settingsPanel.summary;
    diagramInspectorList.innerHTML = '';
    diagramInspectorList.hidden = true;
    if (diagramInspectorSettings) diagramInspectorSettings.hidden = false;
    if (diagramInspectorSearchRow) diagramInspectorSearchRow.hidden = true;
    if (diagramInspectorSearch) {
      diagramInspectorSearch.value = '';
      diagramInspectorSearch.disabled = true;
    }
    return;
  }
  if (diagramInspectorSettings) diagramInspectorSettings.hidden = true;
  diagramInspectorList.hidden = false;
  if (diagramInspectorSearchRow) diagramInspectorSearchRow.hidden = !INSPECTOR_SEARCHABLE_TABS.has(inspectorTab);
  if (diagramInspectorSearch) {
    diagramInspectorSearch.disabled = false;
    diagramInspectorSearch.placeholder = 'Search current section';
  }
  if (inspectorTab === 'locationOrg') {
    renderInspectorLocationOrganizer(query);
    return;
  }
  const rows = inspectorRows(inspectorTab);
  const filtered = query ? rows.filter((row) => inspectorRowText(row).includes(query)) : rows;
  const label = INSPECTOR_TABS.find((tab) => tab.id === inspectorTab)?.label || 'items';
  const flavor = INSPECTOR_TAB_SUMMARIES[inspectorTab] || `Browse ${label.toLowerCase()} in the current diagram.`;
  diagramInspectorSummary.textContent = `${flavor} ${filtered.length} shown of ${rows.length}.`;
  diagramInspectorList.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'inspector-empty';
    empty.textContent = query ? 'No matching items.' : 'No items in this section yet.';
    diagramInspectorList.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  filtered.forEach((row) => appendInspectorRow(fragment, row));
  diagramInspectorList.appendChild(fragment);
}

function renderInspectorTabs() {
  diagramInspectorTabs.innerHTML = '';
  INSPECTOR_TABS.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tab.label;
    button.className = tab.id === inspectorTab ? 'active' : '';
    button.addEventListener('click', () => {
      inspectorTab = tab.id;
      if (diagramInspectorSearch) diagramInspectorSearch.value = '';
      renderDiagramInspector();
    });
    diagramInspectorTabs.appendChild(button);
  });
}

function renderInspectorSettingsTab() {
  const panels = {
    info: inspectorInfoPanel,
    styles: inspectorStylesPanel,
    stats: inspectorStatsPanel,
    export: inspectorExportPanel,
    help: inspectorHelpPanel,
  };
  const activePanel = panels[inspectorTab];
  Object.values(panels).forEach((panel) => {
    if (!panel) return;
    const isActive = panel === activePanel;
    panel.hidden = !isActive;
    panel.classList.toggle('active-panel', isActive);
  });
  if (!activePanel) return null;
  if (inspectorTab === 'info') {
    if (titleInput) titleInput.value = diagram.title || '';
    if (diagramNotesInput) diagramNotesInput.value = diagram.notes || '';
    diagram.info = normalizeDiagramInfo(diagram.info);
    if (diagramAuthorInput) diagramAuthorInput.value = diagram.info.author || '';
    if (diagramDateInput) diagramDateInput.value = diagram.info.date || '';
    if (diagramStatusInput) diagramStatusInput.value = diagram.info.status || '';
    if (diagramSourceInput) diagramSourceInput.value = diagram.info.source || '';
    if (diagramLoglineInput) diagramLoglineInput.value = diagram.info.logline || '';
    return { summary: 'Edit title, author, date/status/source fields, summary, and overall planning notes.' };
  }
  if (inspectorTab === 'styles') {
    renderStyleSettings();
    return { summary: 'Click swatches to choose safe pastel colors, add custom plot types, and label line meanings for this diagram.' };
  }
  if (inspectorTab === 'stats') {
    updateDiagramStats();
    return { summary: 'Review detailed counts, plot word stats, character usage, type breakdowns, structure, and used bounds.' };
  }
  if (inspectorTab === 'export') {
    updateExportSummary();
    return { summary: 'Export the used diagram bounds with optional location diagram, legend, background, and margin settings.' };
  }
  if (inspectorTab === 'help') {
    renderInspectorHelp();
    return { summary: 'Common DIAGRMR workflows, box types, navigation, and shortcuts.' };
  }
  return null;
}

function renderInspectorHelp() {
  if (!inspectorHelpContent) return;
  const source = helpModal?.querySelector('.help-content');
  inspectorHelpContent.innerHTML = source ? source.innerHTML : '<p class="inspector-empty">Help content is unavailable.</p>';
}

function renderInspectorLocationOrganizer(query = '') {
  const rows = locationOrganizerRows(query);
  diagramInspectorSummary.textContent = `${INSPECTOR_TAB_SUMMARIES.locationOrg} ${rows.length} shown.`;
  diagramInspectorList.innerHTML = '';
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'organizer-empty';
    empty.textContent = query ? 'No matching groups or locations.' : 'No locations yet.';
    diagramInspectorList.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => appendOrganizerRow(fragment, row));
  diagramInspectorList.appendChild(fragment);
}

function inspectorRows(tabId) {
  if (tabId === 'locations') {
    const groupRows = Object.values(diagram.locationGroups || {}).map((group) => ({
      kind: 'Location group',
      name: group.text || 'Group',
      meta: group.parentGroupId ? `Subgroup of ${diagram.locationGroups[group.parentGroupId]?.text || 'group'}` : 'Top-level group',
      specs: `${locationGroupRailIds(group.id).length} rails`,
      jumpId: locationGroupRailIds(group.id).map((railId) => diagram.rails[railId]?.locationId).find(Boolean),
      context: (x, y) => showLocationGroupMenu(group.id, x, y),
    }));
    const locationRows = diagram.railOrder
      .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
      .filter((node) => node?.type === 'location')
      .map((node) => nodeInspectorRow(node));
    return [...groupRows, ...locationRows];
  }
  if (tabId === 'characters') {
    return Object.values(diagram.nodes)
      .filter((node) => node.type === 'character')
      .sort((a, b) => (a.text || '').localeCompare(b.text || ''))
      .map((node) => nodeInspectorRow(node));
  }
  if (tabId === 'story') {
    const nodeRows = Object.values(diagram.nodes)
      .filter((node) => node.storyNote || tagLabel(node) || node.type === 'scene')
      .map((node) => nodeInspectorRow(node));
    const edgeRows = diagram.edges
      .filter((edge) => edge.storyNote || tagLabel(edge))
      .map((edge) => edgeInspectorRow(edge));
    const groupRows = (diagram.groups || [])
      .filter((group) => group.storyNote || tagLabel(group))
      .map((group) => groupInspectorRow(group));
    return [...nodeRows, ...edgeRows, ...groupRows];
  }
  if (tabId === 'plots') {
    return Object.values(diagram.nodes)
      .filter((node) => node.type === 'plot')
      .map((node) => nodeInspectorRow(node));
  }
  if (tabId === 'notes') {
    return Object.values(diagram.nodes)
      .filter((node) => node.type === 'note')
      .sort((a, b) => {
        const parentDiff = (a.parentId || '').localeCompare(b.parentId || '');
        if (parentDiff) return parentDiff;
        return (a.noteOrder || 0) - (b.noteOrder || 0);
      })
      .map((node) => nodeInspectorRow(node));
  }
  if (tabId === 'metaTime') {
    return Object.values(diagram.nodes)
      .filter((node) => ['metaLabel', 'metaSpan', 'scene', 'sceneSpan', 'time', 'timePassage', 'timejump'].includes(node.type))
      .map((node) => nodeInspectorRow(node));
  }
  if (tabId === 'groups') {
    return (diagram.groups || []).map((group) => groupInspectorRow(group));
  }
  return [];
}

function nodeInspectorRow(node) {
  const rect = nodeRects.get(node.id);
  const story = tagLabel(node) || (node.storyNote ? 'notes' : '');
  return {
    kind: labelForNode(node),
    name: node.text || defaultTextFor(node.type),
    meta: [node.railId ? `Rail ${node.railId}` : node.parentId ? `Attached to ${diagram.nodes[node.parentId]?.text || node.parentId}` : '', story].filter(Boolean).join(' | '),
    specs: rect ? `${formatInches(rect.x)}, ${formatInches(rect.y)} | ${formatInches(rect.width)} x ${formatInches(rect.height)}` : '',
    jumpId: node.id,
    select: () => selectNode(node.id),
    edit: () => focusNodeForEditing(node.id),
    context: (x, y) => {
      selectNode(node.id);
      showNodeMenu(node.id, x, y);
    },
  };
}

function edgeInspectorRow(edge) {
  const from = diagram.nodes[edge.from];
  const to = diagram.nodes[edge.to];
  const story = tagLabel(edge) || (edge.storyNote ? 'notes' : '');
  return {
    kind: 'Connector',
    name: `${from?.text || edge.from} -> ${to?.text || edge.to}`,
    meta: [`${edge.relation || 'manual'} | ${edge.type || 'solid'}`, story].filter(Boolean).join(' | '),
    specs: `${edge.fromSide || 'right'} to ${edge.toSide || 'left'}${edge.arrows && edge.arrows !== 'none' ? ` | arrows ${edge.arrows}` : ''}`,
    jumpId: edge.from,
    select: () => {
      selectedEdgeId = edge.id;
      clearNodeSelection();
      updateSelectionVisuals();
      updateSelectionDetails();
    },
    context: (x, y) => showEdgeMenu(edge.id, x, y),
  };
}

function groupInspectorRow(group) {
  const story = tagLabel(group) || (group.storyNote ? 'notes' : '');
  return {
    kind: 'Enclosing box',
    name: group.note || 'Note',
    meta: [`Border ${group.borderType || 'level3'}`, story].filter(Boolean).join(' | '),
    specs: `${formatInches(group.x)}, ${formatInches(group.y)} | ${formatInches(group.width)} x ${formatInches(group.height)}`,
    jumpPoint: { x: group.x + group.width / 2, y: group.y + group.height / 2 },
    select: () => {
      clearNodeSelection();
      selectedGroupId = group.id;
      selectedEdgeId = null;
      updateSelectionVisuals();
      updateSelectionDetails();
    },
    context: (x, y) => showGroupMenu(group.id, x, y),
  };
}

function inspectorRowText(row) {
  return [row.kind, row.name, row.meta, row.specs].join(' ').toLowerCase();
}

function appendInspectorRow(fragment, row) {
  const item = document.createElement('div');
  item.className = 'inspector-row';
  item.title = 'Click Jump to center this item. Right-click for its context menu.';

  const kind = document.createElement('span');
  kind.className = 'inspector-kind';
  kind.textContent = row.kind;
  item.appendChild(kind);

  const name = document.createElement('span');
  name.className = 'inspector-name';
  name.textContent = row.name;
  item.appendChild(name);

  const meta = document.createElement('span');
  meta.className = 'inspector-meta';
  meta.textContent = row.meta || '';
  item.appendChild(meta);

  const specs = document.createElement('span');
  specs.className = 'inspector-meta';
  specs.textContent = row.specs || '';
  item.appendChild(specs);

  const actions = document.createElement('div');
  actions.className = 'inspector-actions';
  const jumpButton = document.createElement('button');
  jumpButton.type = 'button';
  jumpButton.textContent = 'Jump';
  jumpButton.disabled = !row.jumpId && !row.jumpPoint;
  jumpButton.addEventListener('click', () => {
    if (row.jumpId) navigateToNode(row.jumpId);
    else if (row.jumpPoint) setTransformToWorldPoint(row.jumpPoint.x, row.jumpPoint.y);
    row.select?.();
  });
  actions.appendChild(jumpButton);

  const selectButton = document.createElement('button');
  selectButton.type = 'button';
  selectButton.textContent = row.edit ? 'Edit' : 'Select';
  selectButton.disabled = !row.select && !row.edit;
  selectButton.addEventListener('click', () => {
    row.select?.();
    if (row.edit) {
      closeDiagramInspector();
      row.edit();
    }
  });
  actions.appendChild(selectButton);
  item.appendChild(actions);

  item.addEventListener('dblclick', () => {
    if (row.jumpId) navigateToNode(row.jumpId);
    else if (row.jumpPoint) setTransformToWorldPoint(row.jumpPoint.x, row.jumpPoint.y);
    row.select?.();
    if (row.edit) {
      closeDiagramInspector();
      row.edit();
    }
  });
  item.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    row.context?.(event.clientX, event.clientY);
  });
  fragment.appendChild(item);
}

function locationOrganizerRows(query = '') {
  const makeGroupRows = (group, depth) => {
    const rows = [{ id: group.id, kind: 'group', text: group.text || 'Group', depth }];
    Object.values(diagram.locationGroups || {})
      .filter((child) => (child.parentGroupId || null) === group.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.text || '').localeCompare(b.text || ''))
      .forEach((child) => rows.push(...makeGroupRows(child, depth + 1)));
    diagram.railOrder
      .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
      .filter((location) => location?.type === 'location' && location.groupId === group.id && !location.parentLocationId)
      .forEach((location) => rows.push(...makeLocationRows(location, depth + 1)));
    return rows;
  };

  const makeLocationRows = (location, depth) => {
    const rows = [{ id: location.id, kind: 'location', text: location.text || 'Location', depth }];
    diagram.railOrder
      .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
      .filter((child) => child?.type === 'location' && child.parentLocationId === location.id)
      .forEach((child) => rows.push(...makeLocationRows(child, depth + 1)));
    return rows;
  };

  const allRows = [];
  Object.values(diagram.locationGroups || {})
    .filter((group) => !group.parentGroupId)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.text || '').localeCompare(b.text || ''))
    .forEach((group) => allRows.push(...makeGroupRows(group, 0)));
  diagram.railOrder
    .map((railId) => diagram.nodes[diagram.rails[railId]?.locationId])
    .filter((location) => location?.type === 'location' && !location.groupId && !location.parentLocationId)
    .forEach((location) => allRows.push(...makeLocationRows(location, 0)));
  return query ? allRows.filter((row) => row.text.toLowerCase().includes(query)) : allRows;
}

function appendOrganizerRow(fragment, { id, kind, text, depth }) {
  const row = document.createElement('div');
  row.className = `organizer-row ${kind}`;
  row.role = 'treeitem';
  row.style.paddingLeft = `${8 + depth * 22}px`;

  const kindEl = document.createElement('span');
  kindEl.className = 'organizer-kind';
  kindEl.textContent = kind === 'group' ? 'Group' : 'Location';
  row.appendChild(kindEl);

  const textEl = document.createElement('span');
  textEl.className = 'organizer-name';
  textEl.textContent = text;
  row.appendChild(textEl);

  row.addEventListener('click', () => {
    if (kind === 'location') {
      navigateToNode(id);
      return;
    }
    const firstRailId = locationGroupRailIds(id)[0];
    const firstLocationId = firstRailId ? diagram.rails[firstRailId]?.locationId : null;
    if (firstLocationId) navigateToNode(firstLocationId);
  });
  row.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'location') {
      selectNode(id);
      showNodeMenu(id, event.clientX, event.clientY);
    } else {
      showLocationGroupMenu(id, event.clientX, event.clientY);
    }
  });
  fragment.appendChild(row);
}

function createSubmenu(label, items) {
  const wrapper = document.createElement('div');
  wrapper.className = 'submenu';

  const labelEl = document.createElement('div');
  labelEl.className = 'submenu-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const panel = document.createElement('div');
  panel.className = 'submenu-panel';
  panel._menuItems = items;
  panel._menuOffset = 0;
  panel._menuPageSize = Number.POSITIVE_INFINITY;
  renderSubmenuPanelItems(panel);

  wrapper.appendChild(panel);
  wrapper.addEventListener('pointerenter', () => positionSubmenuPanel(wrapper, panel));
  return wrapper;
}

function renderSubmenuPanelItems(panel) {
  const items = panel._menuItems || [];
  const pageSize = Number.isFinite(panel._menuPageSize) ? panel._menuPageSize : items.length;
  const needsPaging = items.length > pageSize;
  const maxOffset = Math.max(0, items.length - pageSize);
  panel._menuOffset = Math.max(0, Math.min(panel._menuOffset || 0, maxOffset));
  const start = needsPaging ? panel._menuOffset : 0;
  const visibleItems = needsPaging ? items.slice(start, start + pageSize) : items;

  panel.innerHTML = '';
  if (needsPaging) {
    panel.appendChild(createSubmenuPager(panel, -1, start > 0));
  }

  visibleItems.forEach((item) => {
    if (item[0] === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'divider';
      panel.appendChild(divider);
      return;
    }
    if (item.submenu) {
      panel.appendChild(createSubmenu(item.label, item.submenu));
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item[0];
    button.disabled = !item[1];
    if (item[1]) {
      button.addEventListener('click', () => {
        hideMenu();
        item[1]();
      });
    }
    panel.appendChild(button);
  });

  if (needsPaging) {
    panel.appendChild(createSubmenuPager(panel, 1, start < maxOffset));
  }
}

function createSubmenuPager(panel, direction, enabled) {
  const pager = document.createElement('button');
  pager.type = 'button';
  pager.className = `submenu-pager ${direction < 0 ? 'up' : 'down'}`;
  pager.textContent = direction < 0 ? '▲' : '▼';
  pager.disabled = !enabled;
  if (enabled) {
    pager.addEventListener('pointerenter', () => startMenuAutoScroll(panel, direction));
    pager.addEventListener('pointerleave', () => stopMenuAutoScroll(panel));
    pager.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pageSubmenu(panel, direction);
    });
  }
  return pager;
}

function scrollSpeedFromZone(distance) {
  const factor = Math.max(0.25, 1 - Math.max(0, distance) / MENU_SCROLL_ZONE);
  return MENU_SCROLL_SPEED * factor;
}

function startMenuAutoScroll(panel, delta) {
  if (menuScrollState?.panel === panel) {
    menuScrollState.delta = delta;
    return;
  }
  stopMenuAutoScroll();
  menuScrollState = { panel, delta, frame: null };
  const tick = () => {
    if (!menuScrollState || menuScrollState.panel !== panel) return;
    pageSubmenu(panel, menuScrollState.delta);
    panel.classList.toggle('scrolling-up', menuScrollState.delta < 0);
    panel.classList.toggle('scrolling-down', menuScrollState.delta > 0);
    menuScrollState.frame = setTimeout(tick, 170);
  };
  menuScrollState.frame = setTimeout(tick, 260);
}

function pageSubmenu(panel, direction) {
  const pageSize = Number.isFinite(panel._menuPageSize) ? panel._menuPageSize : (panel._menuItems?.length || 0);
  const maxOffset = Math.max(0, (panel._menuItems?.length || 0) - pageSize);
  panel._menuOffset = Math.max(0, Math.min((panel._menuOffset || 0) + Math.sign(direction), maxOffset));
  renderSubmenuPanelItems(panel);
}

function stopMenuAutoScroll(panel = null) {
  if (!menuScrollState || (panel && menuScrollState.panel !== panel)) return;
  if (menuScrollState.frame) clearTimeout(menuScrollState.frame);
  menuScrollState.panel.classList.remove('scrolling-up', 'scrolling-down');
  menuScrollState = null;
}

function positionContextMenu(x, y) {
  const margin = 8;
  contextMenu.hidden = false;
  contextMenu.style.visibility = 'hidden';
  contextMenu.style.maxHeight = '';
  contextMenu.style.overflowY = '';
  contextMenu.style.left = '0px';
  contextMenu.style.top = '0px';

  const rect = contextMenu.getBoundingClientRect();
  const availableHeight = Math.max(180, window.innerHeight - margin * 2);
  if (rect.height > availableHeight) {
    contextMenu.style.maxHeight = `${availableHeight}px`;
    contextMenu.style.overflowY = 'auto';
  }

  const measuredRect = contextMenu.getBoundingClientRect();
  const left = Math.max(margin, Math.min(x, window.innerWidth - measuredRect.width - margin));
  const top = Math.max(margin, Math.min(y, window.innerHeight - measuredRect.height - margin));
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  contextMenu.style.visibility = 'visible';
  updateSubmenuDirections();
}

function updateSubmenuDirections() {
  contextMenu.querySelectorAll('.submenu').forEach((submenu) => {
    const panel = submenu.querySelector(':scope > .submenu-panel');
    if (panel) positionSubmenuPanel(submenu, panel);
  });
}

function positionSubmenuPanel(submenu, panel) {
  stopMenuAutoScroll(panel);
  panel.classList.remove('open-left');
  panel.style.top = '-5px';
  panel.style.maxHeight = '';
  panel.style.overflowY = '';
  panel.classList.remove('scrollable', 'scrolling-up', 'scrolling-down');
  const margin = 8;
  const availableHeight = Math.max(140, window.innerHeight - margin * 2);
  const rawItems = panel._menuItems || [];
  const pagerRows = rawItems.length * MENU_ITEM_HEIGHT > availableHeight ? 2 : 0;
  const nextPageSize = Math.max(4, Math.floor((availableHeight - pagerRows * MENU_ITEM_HEIGHT - 10) / MENU_ITEM_HEIGHT));
  const nextEffectivePageSize = rawItems.length > nextPageSize ? nextPageSize : Number.POSITIVE_INFINITY;
  if (panel._menuPageSize !== nextEffectivePageSize) {
    panel._menuPageSize = nextEffectivePageSize;
    renderSubmenuPanelItems(panel);
  }
  const submenuRect = submenu.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const panelWidth = panelRect.width || panel.offsetWidth || 220;
  const panelHeight = panelRect.height || panel.offsetHeight || 160;

  if (submenuRect.right + panelWidth > window.innerWidth - margin && submenuRect.left - panelWidth > margin) {
    panel.classList.add('open-left');
  }

  const desiredTop = -5;
  const effectivePanelHeight = Math.min(panelHeight, availableHeight);
  const minTop = margin - submenuRect.top;
  const maxTop = window.innerHeight - effectivePanelHeight - submenuRect.top - margin;
  panel.style.top = `${Math.max(minTop, Math.min(desiredTop, maxTop))}px`;
  if (panelHeight > effectivePanelHeight) {
    panel.classList.add('scrollable');
  }
}

function hideMenu() {
  stopMenuAutoScroll();
  contextMenu.hidden = true;
  contextMenu.style.visibility = '';
}

function freshNodeRect(nodeId) {
  const rect = nodeRects.get(nodeId);
  const node = diagram.nodes[nodeId];
  if (!rect || !node) return rect || null;
  return {
    ...rect,
    ...nodeSize(node),
  };
}

function addPlotAfter(nodeId) {
  const source = diagram.nodes[nodeId];
  const rail = diagram.rails[source.railId];
  if (!rail) return;

  const id = nextId('node');
  const newNode = {
    id,
    type: 'plot',
    variant: 'normal',
    text: defaultTextFor('plot'),
    railId: rail.id,
  };
  const sourceRect = freshNodeRect(nodeId);
  const insertionX = sourceRect ? sourceRect.x + sourceRect.width + (source.type === 'location' ? LOCATION_GAP : GAP) : null;
  const insertedWidth = nodeSize(newNode).width + GAP;
  if (Number.isFinite(insertionX)) {
    shiftTimelineSpace(insertionX, insertedWidth, { sourceRailId: rail.id });
    newNode.anchorX = snapToGrid(insertionX);
  }
  diagram.nodes[id] = {
    ...newNode,
  };

  const sourceIndex = rail.plotIds.indexOf(nodeId);
  if (source.type === 'location') {
    const oldFirst = rail.plotIds[0];
    rail.plotIds.unshift(id);
    diagram.edges.push({ id: nextId('edge'), from: source.id, to: id, type: 'solid', relation: 'sequence' });
    if (oldFirst) {
      diagram.edges = diagram.edges.filter((edge) => !(edge.from === source.id && edge.to === oldFirst));
      diagram.edges.push({ id: nextId('edge'), from: id, to: oldFirst, type: 'solid', relation: 'sequence' });
    }
  } else {
    rail.plotIds.splice(sourceIndex + 1, 0, id);
    diagram.edges.push({ id: nextId('edge'), from: source.id, to: id, type: 'solid', relation: 'sequence' });
  }

  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addPlotBefore(nodeId) {
  const source = diagram.nodes[nodeId];
  if (source?.type !== 'plot') return;
  const rail = diagram.rails[source.railId];
  if (!rail) return;

  const id = nextId('node');
  const sourceRect = freshNodeRect(nodeId);
  const newNode = {
    id,
    type: 'plot',
    variant: 'normal',
    text: defaultTextFor('plot'),
    railId: rail.id,
  };
  const insertionX = sourceRect?.x;
  const insertedWidth = nodeSize(newNode).width + GAP;
  if (Number.isFinite(insertionX)) {
    shiftTimelineSpace(insertionX, insertedWidth, { sourceRailId: rail.id });
    newNode.anchorX = snapToGrid(insertionX);
  }
  diagram.nodes[id] = {
    ...newNode,
  };

  const sourceIndex = rail.plotIds.indexOf(nodeId);
  if (sourceIndex < 0) return;
  const previousId = rail.plotIds[sourceIndex - 1] || rail.locationId;
  rail.plotIds.splice(sourceIndex, 0, id);
  if (previousId) {
    diagram.edges = diagram.edges.filter((edge) => !(
      edge.relation === 'sequence' && edge.from === previousId && edge.to === source.id
    ));
    diagram.edges.push({ id: nextId('edge'), from: previousId, to: id, type: 'solid', relation: 'sequence' });
  }
  diagram.edges.push({ id: nextId('edge'), from: id, to: source.id, type: 'solid', relation: 'sequence' });

  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addAttachment(parentId, type) {
  const id = nextId('node');
  const siblings = Object.values(diagram.nodes).filter((node) => node.parentId === parentId).length;
  const node = {
    id,
    type,
    text: defaultTextFor(type),
    parentId,
    slot: siblings,
  };
  if (type === 'note') {
    node.notePlacement = defaultNotePlacement(parentId);
    node.noteOrder = nextNoteOrder(parentId);
  }
  diagram.nodes[id] = node;
  diagram.edges.push({ id: nextId('edge'), from: parentId, to: id, type: 'solid', relation: 'attachment' });
  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addCharacterAfterCharacter(characterId) {
  const character = diagram.nodes[characterId];
  if (!character?.parentId) return;

  const siblingCharacters = Object.values(diagram.nodes)
    .filter((node) => node.parentId === character.parentId && node.type === 'character')
    .sort((a, b) => (a.slot || 0) - (b.slot || 0));
  const currentIndex = siblingCharacters.findIndex((node) => node.id === characterId);
  const insertSlot = currentIndex >= 0 ? (siblingCharacters[currentIndex].slot || 0) + 1 : siblingCharacters.length;

  Object.values(diagram.nodes).forEach((node) => {
    if (node.parentId === character.parentId && (node.slot || 0) >= insertSlot) {
      node.slot = (node.slot || 0) + 1;
    }
  });

  const id = nextId('node');
  diagram.nodes[id] = {
    id,
    type: 'character',
    text: defaultTextFor('character'),
    parentId: character.parentId,
    slot: insertSlot,
  };
  diagram.edges.push({ id: nextId('edge'), from: character.parentId, to: id, type: 'solid', relation: 'attachment' });
  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addMetaBox(parentId) {
  const baseSlot = nextAttachmentSlot(parentId);
  const labelId = nextId('node');
  const spanId = nextId('node');
  diagram.nodes[labelId] = {
    id: labelId,
    type: 'metaLabel',
    text: defaultTextFor('metaSpan'),
    parentId,
    slot: baseSlot,
  };
  diagram.nodes[spanId] = {
    id: spanId,
    type: 'metaSpan',
    text: defaultTextFor('metaSpan'),
    parentId,
    slot: baseSlot + 1,
  };
  diagram.edges.push({ id: nextId('edge'), from: labelId, to: spanId, type: 'level1', relation: 'attachment' });
  setSingleSelectedNode(spanId);
  selectedEdgeId = null;
  focusAfterRender(spanId);
  render();
}

function addTimeBox(parentId) {
  const id = nextId('node');
  diagram.nodes[id] = {
    id,
    type: 'time',
    text: defaultTextFor('time'),
    parentId,
    slot: nextAttachmentSlot(parentId),
  };
  diagram.edges.push({ id: nextId('edge'), from: parentId, to: id, type: 'level1', relation: 'attachment' });
  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function addTimePassageBox(parentId) {
  const parentRect = nodeRects.get(parentId);
  const id = nextId('node');
  diagram.nodes[id] = {
    id,
    type: 'timePassage',
    text: defaultTextFor('timePassage'),
    parentId,
    slot: nextAttachmentSlot(parentId),
    anchorX: parentRect ? parentRect.x + parentRect.width + SNAP_GAP : null,
  };
  setSingleSelectedNode(id);
  selectedEdgeId = null;
  focusAfterRender(id);
  render();
}

function nextAttachmentSlot(parentId) {
  const slots = Object.values(diagram.nodes)
    .filter((node) => node.parentId === parentId)
    .map((node) => node.slot || 0);
  return slots.length ? Math.max(...slots) + 1 : 0;
}

function addBranch(sourceId, position = 'below') {
  layoutDiagram();
  const source = diagram.nodes[sourceId];
  const sourceRail = diagram.rails[source?.railId];
  const sourceLocation = diagram.nodes[sourceRail?.locationId];
  const sourceRailIndex = diagram.railOrder.indexOf(source.railId);
  const railId = nextId('rail');
  const locationId = nextId('node');
  const plotId = nextId('node');
  const sourceRect = nodeRects.get(sourceId);
  const locationTemplate = {
    id: locationId,
    type: 'location',
    text: defaultTextFor('location'),
    railId,
  };
  inheritBranchLocationOrganization(locationTemplate, sourceLocation);
  const locationSize = nodeSize(locationTemplate);
  const plotAnchorX = sourceRect ? sourceRect.x + sourceRect.width + GAP : null;
  const locationAnchorX = Number.isFinite(plotAnchorX)
    ? plotAnchorX - LOCATION_GAP - locationSize.width
    : null;

  diagram.rails[railId] = {
    id: railId,
    locationId,
    plotIds: [plotId],
    branchFromId: sourceId,
  };
  diagram.nodes[locationId] = locationTemplate;
  if (Number.isFinite(locationAnchorX)) diagram.nodes[locationId].anchorX = snapToGrid(locationAnchorX);
  diagram.nodes[plotId] = {
    id: plotId,
    type: 'plot',
    variant: 'normal',
    text: defaultTextFor('plot'),
    railId,
  };
  const insertIndex = position === 'above'
    ? sourceRailIndex
    : position === 'bottom'
      ? diagram.railOrder.length
      : sourceRailIndex + 1;
  diagram.railOrder.splice(Math.max(0, insertIndex), 0, railId);
  diagram.edges.push({ id: nextId('edge'), from: sourceId, to: plotId, type: 'solid', relation: 'branch' });
  diagram.edges.push({ id: nextId('edge'), from: locationId, to: plotId, type: 'solid', relation: 'sequence' });
  setSingleSelectedNode(locationId);
  selectedEdgeId = null;
  tabFocusLinks.set(locationId, plotId);
  focusAfterRender(locationId);
  render();
}

function inheritBranchLocationOrganization(location, sourceLocation) {
  if (!location || sourceLocation?.type !== 'location') return;
  if (sourceLocation.parentLocationId) {
    location.parentLocationId = sourceLocation.parentLocationId;
    location.groupId = null;
    return;
  }
  if (sourceLocation.groupId) {
    location.groupId = sourceLocation.groupId;
  }
}

function addStandaloneRail() {
  addStandaloneRailAt({ x: START_X + nodeSize({ type: 'location', text: defaultTextFor('location') }).width + LOCATION_GAP, y: Number.POSITIVE_INFINITY });
}

function addStandaloneRailAt(point = { x: START_X, y: Number.POSITIVE_INFINITY }) {
  const railId = nextId('rail');
  const locationId = nextId('node');
  const plotId = nextId('node');
  const plotAnchorX = snapToGrid(Number.isFinite(point.x) ? point.x : START_X);
  const locationTemplate = {
    id: locationId,
    type: 'location',
    text: defaultTextFor('location'),
    railId,
  };
  const locationSize = nodeSize(locationTemplate);
  const locationAnchorX = snapToGrid(plotAnchorX - LOCATION_GAP - locationSize.width);

  diagram.rails[railId] = {
    id: railId,
    locationId,
    plotIds: [plotId],
  };
  diagram.nodes[locationId] = { ...locationTemplate, anchorX: locationAnchorX };
  diagram.nodes[plotId] = {
    id: plotId,
    type: 'plot',
    variant: 'normal',
    text: defaultTextFor('plot'),
    railId,
    anchorX: plotAnchorX,
  };
  diagram.railOrder.splice(railInsertIndexForY(point.y), 0, railId);
  diagram.edges.push({ id: nextId('edge'), from: locationId, to: plotId, type: 'solid', relation: 'sequence' });
  setSingleSelectedNode(locationId);
  selectedEdgeId = null;
  tabFocusLinks.set(locationId, plotId);
  focusAfterRender(locationId);
  render();
}

function railInsertIndexForY(y) {
  if (!Number.isFinite(y)) return diagram.railOrder.length;
  layoutDiagram();
  const bounds = diagram.railOrder.map((railId) => railBounds(railId)).filter(Boolean);
  if (!bounds.length) return 0;
  if (y < bounds[0].top) return 0;
  for (let index = 0; index < bounds.length - 1; index += 1) {
    const midpoint = (bounds[index].bottom + bounds[index + 1].top) / 2;
    if (y < midpoint) return index + 1;
  }
  return bounds.length;
}

function railBounds(railId) {
  const rail = diagram.rails[railId];
  if (!rail) return null;
  const ids = new Set([rail.locationId, ...rail.plotIds]);
  Object.values(diagram.nodes).forEach((node) => {
    if (node.parentId && ids.has(node.parentId)) ids.add(node.id);
  });
  const rects = Array.from(ids)
    .map((id) => nodeRects.get(id))
    .filter(Boolean);
  if (!rects.length) return null;
  return {
    top: Math.min(...rects.map((rect) => rect.y)),
    bottom: Math.max(...rects.map((rect) => rect.y + rect.height)),
  };
}

function addBranchToExistingLocation(sourceId, targetRailId) {
  const targetRail = diagram.rails[targetRailId];
  if (!targetRail) return;

  const plotId = nextId('node');
  diagram.nodes[plotId] = {
    id: plotId,
    type: 'plot',
    variant: 'normal',
    text: defaultTextFor('plot'),
    railId: targetRailId,
  };

  layoutDiagram();
  const sourceRect = nodeRects.get(sourceId);
  const desiredX = sourceRect ? sourceRect.x + sourceRect.width + GAP : Number.POSITIVE_INFINITY;
  diagram.nodes[plotId].anchorX = Number.isFinite(desiredX) ? desiredX : null;
  let insertIndex = targetRail.plotIds.findIndex((id) => {
    const rect = nodeRects.get(id);
    return rect && rect.x + rect.width > desiredX;
  });
  if (insertIndex === -1) insertIndex = targetRail.plotIds.length;
  const oldFirstId = targetRail.plotIds[0] || null;

  targetRail.plotIds.splice(insertIndex, 0, plotId);
  if (insertIndex === 0) {
    const location = diagram.nodes[targetRail.locationId];
    const locationSize = location ? nodeSize(location) : null;
    if (location && locationSize && Number.isFinite(desiredX)) {
      location.anchorX = snapToGrid(desiredX - LOCATION_GAP - locationSize.width);
    }
    if (oldFirstId) {
      diagram.edges = diagram.edges.filter((edge) => !(
        edge.relation === 'sequence' && edge.from === targetRail.locationId && edge.to === oldFirstId
      ));
    }
    ensureSequenceEdge(targetRail.locationId, plotId);
    if (oldFirstId) ensureSequenceEdge(plotId, oldFirstId);
  }

  diagram.edges.push({ id: nextId('edge'), from: sourceId, to: plotId, type: 'solid', relation: 'returnBranch' });
  setSingleSelectedNode(plotId);
  selectedEdgeId = null;
  focusAfterRender(plotId);
  render();
}

function movePlotToNewRail(plotId, scope, position) {
  layoutDiagram();
  const source = diagram.nodes[plotId];
  const sourceRail = diagram.rails[source?.railId];
  if (!sourceRail) return;

  const movedIds = movedPlotIds(plotId, scope);
  if (!movedIds.length) return;
  const firstMovedRect = nodeRects.get(movedIds[0]);
  preserveAnchorXs(movedIds);
  detachPlotsFromRail(sourceRail, movedIds);

  const railId = nextId('rail');
  const locationId = nextId('node');
  diagram.rails[railId] = {
    id: railId,
    locationId,
    plotIds: [...movedIds],
  };
  diagram.nodes[locationId] = {
    id: locationId,
    type: 'location',
    text: defaultTextFor('location'),
    railId,
  };
  const locationSize = nodeSize(diagram.nodes[locationId]);
  if (firstMovedRect) {
    diagram.nodes[locationId].anchorX = firstMovedRect.x - LOCATION_GAP - locationSize.width;
  }
  movedIds.forEach((id) => {
    diagram.nodes[id].railId = railId;
  });
  ensureSequenceEdge(locationId, movedIds[0]);

  const sourceRailIndex = diagram.railOrder.indexOf(sourceRail.id);
  const insertAt = position === 'above' ? sourceRailIndex : sourceRailIndex + 1;
  diagram.railOrder.splice(Math.max(0, insertAt), 0, railId);

  setSingleSelectedNode(locationId);
  selectedEdgeId = null;
  tabFocusLinks.set(locationId, movedIds[0]);
  focusAfterRender(locationId);
  render();
}

function movePlotToExistingRail(plotId, scope, targetRailId) {
  layoutDiagram();
  const source = diagram.nodes[plotId];
  const sourceRail = diagram.rails[source?.railId];
  const targetRail = diagram.rails[targetRailId];
  if (!sourceRail || !targetRail || sourceRail.id === targetRail.id) return;

  const movedIds = movedPlotIds(plotId, scope);
  if (!movedIds.length) return;
  preserveAnchorXs(movedIds);
  detachPlotsFromRail(sourceRail, movedIds);

  const firstMovedRect = nodeRects.get(movedIds[0]);
  const desiredX = diagram.nodes[movedIds[0]].anchorX ?? firstMovedRect?.x ?? Number.POSITIVE_INFINITY;
  let insertIndex = targetRail.plotIds.findIndex((id) => {
    const rect = nodeRects.get(id);
    return rect && rect.x + rect.width > desiredX;
  });
  if (insertIndex === -1) insertIndex = targetRail.plotIds.length;

  targetRail.plotIds.splice(insertIndex, 0, ...movedIds);
  movedIds.forEach((id) => {
    diagram.nodes[id].railId = targetRail.id;
  });

  setSingleSelectedNode(movedIds[0]);
  selectedEdgeId = null;
  render();
}

function movedPlotIds(plotId, scope) {
  const source = diagram.nodes[plotId];
  const rail = diagram.rails[source?.railId];
  if (!rail) return [];
  const index = rail.plotIds.indexOf(plotId);
  if (index < 0) return [];
  return scope === 'following' ? rail.plotIds.slice(index) : [plotId];
}

function preserveAnchorXs(nodeIds) {
  nodeIds.forEach((nodeId) => {
    const node = diagram.nodes[nodeId];
    const rect = nodeRects.get(nodeId);
    if (node && rect) node.anchorX = rect.x;
  });
}

function detachPlotsFromRail(sourceRail, movedIds) {
  const movedSet = new Set(movedIds);
  const originalPlotIds = [...sourceRail.plotIds];
  const firstIndex = originalPlotIds.indexOf(movedIds[0]);
  if (firstIndex < 0) return;

  const lastIndex = firstIndex + movedIds.length - 1;
  const previousId = originalPlotIds[firstIndex - 1] || sourceRail.locationId;
  const nextId = originalPlotIds[lastIndex + 1] || null;
  const firstMovedId = movedIds[0];
  const lastMovedId = movedIds[movedIds.length - 1];

  sourceRail.plotIds = originalPlotIds.filter((id) => !movedSet.has(id));
  diagram.edges = diagram.edges.filter((edge) => {
    if (edge.relation !== 'sequence') return true;
    if (edge.from === previousId && edge.to === firstMovedId) return false;
    if (nextId && edge.from === lastMovedId && edge.to === nextId) return false;
    if (movedSet.has(edge.from) && movedSet.has(edge.to)) return true;
    return !(movedSet.has(edge.from) || movedSet.has(edge.to));
  });

  if (movedIds.length === 1 && nextId) {
    ensureSequenceEdge(previousId, nextId);
  }
}

function setPlotVariant(nodeId, variant) {
  const node = diagram.nodes[nodeId];
  if (node?.type !== 'plot') return;
  node.variant = variant;
  render();
}

function moveRail(railId, direction) {
  layoutDiagram();
  preserveRailLocationAnchor(railId);
  const index = diagram.railOrder.indexOf(railId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= diagram.railOrder.length) return;
  const [rail] = diagram.railOrder.splice(index, 1);
  diagram.railOrder.splice(next, 0, rail);
  render();
}

function moveRailInOutline(railId, direction) {
  const locationId = diagram.rails[railId]?.locationId;
  const location = diagram.nodes[locationId];
  if (location?.type === 'location') {
    moveOutlineItemRails({ kind: 'location', id: location.id }, direction);
    return;
  }
  moveRail(railId, direction);
}

function preserveRailLocationAnchor(railId) {
  const rail = diagram.rails[railId];
  const location = diagram.nodes[rail?.locationId];
  const rect = location ? nodeRects.get(location.id) : null;
  if (location && rect && !Number.isFinite(location.anchorX)) {
    location.anchorX = rect.x;
  }
}

function deleteNode(nodeId) {
  const node = diagram.nodes[nodeId];
  if (!node) return;
  const pairedNode = pairedMetaNode(nodeId);
  const deletesPair = Boolean(pairedNode);
  if (!confirm(`Delete "${node.text}"${deletesPair ? ' and its paired marker box' : ''}?`)) return;
  const deletedRect = nodeRects.get(nodeId);
  if (node.type === 'plot' && deletedRect) {
    preserveTimelinePositionsFrom(deletedRect.x + deletedRect.width);
  }

  const nodeIdsToDelete = collectNodeDeletionIds(nodeId);

  if (node.type === 'location' && node.railId) {
    const rail = diagram.rails[node.railId];
    rail?.plotIds.forEach((id) => {
      collectNodeDeletionIds(id).forEach((deleteId) => nodeIdsToDelete.add(deleteId));
    });
    delete diagram.rails[node.railId];
    diagram.railOrder = diagram.railOrder.filter((id) => id !== node.railId);
  }

  Object.values(diagram.rails).forEach((rail) => {
    rail.plotIds = rail.plotIds.filter((id) => !nodeIdsToDelete.has(id));
  });

  diagram.edges = diagram.edges.filter((edge) => !nodeIdsToDelete.has(edge.from) && !nodeIdsToDelete.has(edge.to));
  nodeIdsToDelete.forEach((deleteId) => {
    delete diagram.nodes[deleteId];
  });
  if (lastCreatedNodeId === nodeId || !diagram.nodes[lastCreatedNodeId]) lastCreatedNodeId = null;
  clearNodeSelection();
  render();
}

function collectNodeDeletionIds(nodeId, ids = new Set()) {
  if (!nodeId || ids.has(nodeId) || !diagram.nodes[nodeId]) return ids;
  ids.add(nodeId);

  const pairedNode = pairedMetaNode(nodeId);
  if (pairedNode && !ids.has(pairedNode.id)) {
    collectNodeDeletionIds(pairedNode.id, ids);
  }

  Object.values(diagram.nodes)
    .filter((candidate) => candidate.parentId === nodeId)
    .forEach((candidate) => collectNodeDeletionIds(candidate.id, ids));
  return ids;
}

function updateTransform() {
  canvas.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
  viewport.style.backgroundPosition = `${transform.x % 24}px ${transform.y % 24}px`;
  document.getElementById('zoomReset').textContent = `${Math.round(transform.scale * 100)}%`;
  viewport.classList.toggle('line-mode', lineMode);
  viewport.classList.toggle('box-mode', boxMode);
  lineModeToggle.classList.toggle('active', lineMode);
  boxModeToggle?.classList.toggle('active', boxMode);
  updateMiniMapViewport();
  syncLocationColumnScroll();
  updateTimePassageLabels();
}

function updateAppearance() {
  document.body.classList.toggle('grid-off', !gridVisible);
  document.body.classList.toggle('dark-theme', darkTheme);
  document.body.classList.toggle('mini-map-floating', miniMapVisible);
  document.body.classList.toggle('mini-map-hidden', !miniMapVisible);
  autoShiftToggle?.classList.toggle('active', autoShiftEnabled);
  if (autoShiftToggle) autoShiftToggle.textContent = 'Auto Shift';
  gridToggle?.classList.toggle('active', gridVisible);
  if (gridToggle) gridToggle.textContent = 'Grid';
  themeToggle?.classList.toggle('active', darkTheme);
  if (themeToggle) themeToggle.textContent = darkTheme ? 'Light' : 'Dark';
  applyCustomStyleVariables();
  syncStoryDrawerToggle();
  syncLocationToggleButtons();
  updateLocationColumnWidth();
}

function updateHeaderDiagramTitle() {
  if (!headerDiagramTitle) return;
  const title = (diagram.title || '').trim();
  headerDiagramTitle.textContent = title ? `- ${title}` : '';
  document.title = title ? `DIAGRMR - ${title}` : 'DIAGRMR';
}

function toggleGrid() {
  gridVisible = !gridVisible;
  localStorage.setItem('diagrmr.gridVisible', String(gridVisible));
  updateAppearance();
}

function toggleAutoShift() {
  autoShiftEnabled = !autoShiftEnabled;
  localStorage.setItem('diagrmr.autoShift', String(autoShiftEnabled));
  updateAppearance();
}

function toggleMiniMap() {
  miniMapVisible = !miniMapVisible;
  localStorage.setItem('diagrmr.miniMapVisible', String(miniMapVisible));
  updateAppearance();
  renderMiniMap();
}

function setLocationColumnOpen(open) {
  if (!locationColumn || !workspaceShell) return;
  locationColumn.hidden = !open;
  workspaceShell.classList.toggle('locations-open', open);
  syncLocationToggleButtons();
  updateMiniMapViewport();
  syncLocationColumnScroll();
}

function syncLocationToggleButtons() {
  const open = Boolean(locationColumn && !locationColumn.hidden);
  [locationColumnToggle, locationPanelTab].forEach((button) => {
    if (!button) return;
    button.classList.toggle('active', open);
    if (button === locationColumnToggle) button.dataset.arrow = open ? '>' : '<';
    if (button === locationPanelTab) button.textContent = 'Locations';
  });
}

function syncLineStyleControls(value) {
  if (!value) return;
  if (lineStyleSelect && lineStyleSelect.value !== value) lineStyleSelect.value = value;
  if (toolbarLineStyleSelect && toolbarLineStyleSelect.value !== value) toolbarLineStyleSelect.value = value;
}

function toggleTheme() {
  darkTheme = !darkTheme;
  localStorage.setItem('diagrmr.theme', darkTheme ? 'dark' : 'light');
  updateAppearance();
  refreshRenderedNodeColors();
  renderStyleSettings();
}

function selectedZoomAnchor() {
  const nodeId = selectedNodeId || Array.from(selectedNodeIds)[0];
  const rect = nodeId ? nodeRects.get(nodeId) : null;
  if (!rect) return null;
  return {
    x: transform.x + (rect.x + rect.width / 2) * transform.scale,
    y: transform.y + (rect.y + rect.height / 2) * transform.scale,
  };
}

function zoomAt(delta, centerX = viewport.clientWidth / 2, centerY = viewport.clientHeight / 2) {
  const oldScale = transform.scale;
  const nextScale = Math.max(0.08, Math.min(4, oldScale + delta));
  const anchor = selectedZoomAnchor();
  if (anchor) {
    centerX = anchor.x;
    centerY = anchor.y;
  }
  const worldX = (centerX - transform.x) / oldScale;
  const worldY = (centerY - transform.y) / oldScale;
  transform.scale = nextScale;
  transform.x = centerX - worldX * nextScale;
  transform.y = centerY - worldY * nextScale;
  updateTransform();
}

function setZoomAt(nextScale, centerX = viewport.clientWidth / 2, centerY = viewport.clientHeight / 2) {
  const oldScale = transform.scale;
  const scale = Math.max(0.08, Math.min(4, nextScale));
  const anchor = selectedZoomAnchor();
  if (anchor) {
    centerX = anchor.x;
    centerY = anchor.y;
  }
  const worldX = (centerX - transform.x) / oldScale;
  const worldY = (centerY - transform.y) / oldScale;
  transform.scale = scale;
  transform.x = centerX - worldX * scale;
  transform.y = centerY - worldY * scale;
  updateTransform();
}

function exportDiagramFile() {
  if (exportFileType?.value !== 'svg') return;
  layoutDiagram();
  const svg = buildExportSvg({
    includeLocationOutline: Boolean(exportLocationOutline?.checked),
    includeLegend: Boolean(exportLegend?.checked),
    background: exportBackground?.value || 'grid',
    margin: exportMarginPx(),
  });
  downloadTextFile(svg, `${safeFileBaseName()}.svg`, 'image/svg+xml');
}

function exportMarginPx() {
  const raw = Number.parseFloat(exportMarginInput?.value || '0.5');
  const inches = Number.isFinite(raw) ? Math.min(3, Math.max(0, raw)) : 0.5;
  return Math.round(INCH * inches);
}

function updateExportSummary() {
  if (!exportSummary || !nodeRects.size) return;
  const margin = exportMarginPx();
  const mainBounds = contentBounds();
  exportSummary.textContent = `Used bounds: ${Math.round(mainBounds.width / INCH * 10) / 10}" x ${Math.round(mainBounds.height / INCH * 10) / 10}" + ${Math.round(margin / INCH * 10) / 10}" margin.`;
}

function buildExportSvg({ includeLocationOutline, includeLegend, background, margin = Math.round(INCH * 0.5) }) {
  const mainBounds = contentBounds();
  const outline = includeLocationOutline ? buildLocationOutlineExport() : null;
  const legend = includeLegend ? buildExportLegend() : null;
  const outlineGap = outline ? GAP : 0;
  const legendGap = legend ? GAP : 0;
  const unionMinY = outline ? Math.min(mainBounds.y, outline.bounds.y) : mainBounds.y;
  const diagramMaxY = outline
    ? Math.max(mainBounds.y + mainBounds.height, outline.bounds.y + outline.bounds.height)
    : mainBounds.y + mainBounds.height;
  const legendMaxY = legend ? unionMinY + legend.height : unionMinY;
  const unionMaxY = Math.max(diagramMaxY, legendMaxY);
  const exportWidth = Math.ceil((outline?.width || 0) + outlineGap + mainBounds.width + legendGap + (legend?.width || 0) + margin * 2);
  const exportHeight = Math.ceil(unionMaxY - unionMinY + margin * 2);
  const mainOffsetX = margin + (outline?.width || 0) + outlineGap - mainBounds.x;
  const mainOffsetY = margin - unionMinY;
  const outlineOffsetX = margin;
  const outlineOffsetY = margin - unionMinY;
  const legendOffsetX = margin + (outline?.width || 0) + outlineGap + mainBounds.width + legendGap;
  const legendOffsetY = margin;
  const backgroundRect = background === 'transparent'
    ? ''
    : `<rect width="100%" height="100%" fill="${background === 'grid' ? 'url(#grid)' : '#fff'}"/>`;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ` width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">`,
    '<defs>',
    background === 'grid' ? svgGridPattern() : '',
    exportArrowMarkers(),
    exportOutlinePlotGradients(),
    exportSvgStyles(),
    '</defs>',
    backgroundRect,
    outline ? `<g class="export-location-outline" transform="translate(${outlineOffsetX} ${outlineOffsetY})">${outline.content}</g>` : '',
    `<g class="export-main" transform="translate(${mainOffsetX} ${mainOffsetY})">`,
    exportGroupSvg(),
    exportEdgeSvg(),
    exportNodeSvg(),
    '</g>',
    legend ? `<g class="export-legend" transform="translate(${legendOffsetX} ${legendOffsetY})">${legend.content}</g>` : '',
    '</svg>',
  ].join('');
}

function buildExportLegend() {
  const boxItems = usedBoxLegendItems();
  const lineItems = usedLineLegendItems();
  if (!boxItems.length && !lineItems.length) return null;

  const width = Math.round(INCH * 2.5);
  const rowHeight = 24;
  let y = 0;
  const parts = [
    `<rect class="export-legend-bg" x="0" y="0" width="${width}" height="1"/>`,
    `<text class="export-legend-title" x="0" y="14">Legend</text>`,
  ];
  y += 32;

  if (boxItems.length) {
    parts.push(`<text class="export-legend-heading" x="0" y="${y}">Box colors</text>`);
    y += 18;
    boxItems.forEach((item) => {
      parts.push(`<rect class="export-legend-swatch" x="0" y="${y - 12}" width="18" height="14" fill="${item.color}"/>`);
      parts.push(`<text class="export-legend-text" x="26" y="${y}">${escapeXml(item.label)}</text>`);
      y += rowHeight;
    });
    y += 6;
  }

  if (lineItems.length) {
    parts.push(`<text class="export-legend-heading" x="0" y="${y}">Line meanings</text>`);
    y += 18;
    lineItems.forEach((item) => {
      parts.push(`<path class="export-connector ${item.type}" d="M 0 ${y - 5} H 40"/>`);
      parts.push(`<text class="export-legend-text" x="50" y="${y}">${escapeXml(item.label)}</text>`);
      y += rowHeight;
    });
  }

  const height = Math.max(40, y + 4);
  parts[0] = `<rect class="export-legend-bg" x="-10" y="-10" width="${width}" height="${height + 14}"/>`;
  return { width, height, content: parts.join('') };
}

function usedBoxLegendItems() {
  const used = new Set();
  Object.values(diagram.nodes).forEach((node) => {
    const key = legendColorKeyForNode(node);
    if (key) used.add(key);
  });
  const items = [];
  STYLE_COLOR_TARGETS.forEach((target) => {
    if (!used.has(target.id)) return;
    items.push({ label: target.label, color: styleColorForKey(target.id, { dark: darkTheme }) });
  });
  customBoxStyles().forEach((style) => {
    if (!used.has(style.id)) return;
    items.push({ label: style.label, color: darkTheme ? darkenHex(style.color, 0.58) : style.color });
  });
  return items;
}

function legendColorKeyForNode(node) {
  if (!node) return null;
  if (node.type === 'plot') return node.variant && node.variant !== 'normal' ? node.variant : 'plot';
  if (node.type === 'location') return 'location';
  if (node.type === 'character') return 'character';
  if (node.type === 'note') return 'note';
  if (node.type === 'metaLabel') return 'metaLabel';
  if (node.type === 'metaSpan') return 'metaSpan';
  if (node.type === 'scene' || node.type === 'sceneSpan') return 'scene';
  if (node.type === 'time') return 'time';
  if (node.type === 'timePassage' || node.type === 'timejump') return 'timePassage';
  return null;
}

function usedLineLegendItems() {
  const used = new Set();
  diagram.edges.forEach((edge) => used.add(displayEdgeType(edge) || 'solid'));
  Object.values(diagram.nodes).forEach((node) => {
    if (node.borderType) used.add(node.borderType);
  });
  (diagram.groups || []).forEach((group) => {
    if (group.borderType) used.add(group.borderType);
  });
  return LINE_TYPES
    .filter((lineType) => used.has(lineType.id) && diagram.styles?.lineLabels?.[lineType.id])
    .map((lineType) => ({ type: lineType.id, label: `${lineType.label}: ${diagram.styles.lineLabels[lineType.id]}` }));
}

function contentBounds() {
  const rects = Array.from(nodeRects.values());
  const groupRects = (diagram.groups || []).map((group) => ({ x: group.x, y: group.y, width: group.width, height: group.height }));
  const allRects = rects.concat(groupRects);
  if (!allRects.length) return { x: 0, y: 0, width: 1, height: 1 };
  const minX = Math.min(...allRects.map((rect) => rect.x));
  const minY = Math.min(...allRects.map((rect) => rect.y));
  const maxX = Math.max(...allRects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...allRects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function exportEdgeSvg() {
  const edgeSvg = diagram.edges.map((edge) => {
    if (isSharedPlotAttachmentEdge(edge)) return '';
    const from = nodeRects.get(edge.from);
    const to = nodeRects.get(edge.to);
    if (!from || !to) return '';
    return `<path class="export-connector ${displayEdgeType(edge)}" d="${escapeAttr(edgePath(from, to, edge.relation, edge))}"${exportMarkerAttrs(edge)}/>`;
  }).join('');
  const attachmentSvg = Object.values(diagram.nodes)
    .filter((node) => node.type === 'plot')
    .map((plot) => {
      const parentRect = nodeRects.get(plot.id);
      const rects = plotAttachmentNodes(plot.id).map((node) => nodeRects.get(node.id)).filter(Boolean);
      const path = parentRect ? sharedPlotAttachmentPath(parentRect, rects) : '';
      return path ? `<path class="export-connector solid" d="${escapeAttr(path)}"/>` : '';
    })
    .join('');
  return edgeSvg + attachmentSvg;
}

function exportGroupSvg() {
  return (diagram.groups || []).map((group) => {
    const note = groupNoteRect(group);
    return `<g>
      <rect class="export-group ${group.borderType || 'level3'}" x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}"/>
      ${svgBox({
        x: note.x,
        y: note.y,
        width: note.width,
        height: note.height,
        className: 'export-node note',
        text: group.note || 'Note',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.12,
      })}
    </g>`;
  }).join('');
}

function exportMarkerAttrs(edge) {
  const arrows = edge.arrows || 'none';
  const start = arrows === 'start' || arrows === 'both' ? ' marker-start="url(#exportArrowHead)"' : '';
  const end = arrows === 'end' || arrows === 'both' ? ' marker-end="url(#exportArrowHead)"' : '';
  return `${start}${end}`;
}

function exportNodeSvg() {
  return Object.entries(diagram.nodes).map(([nodeId, node]) => {
    const rect = nodeRects.get(nodeId);
    if (!rect) return '';
    const exportY = node.type === 'metaSpan' || node.type === 'sceneSpan' ? rect.y - BOX_BORDER : rect.y;
    return svgBox({
      x: rect.x,
      y: exportY,
      width: rect.width,
      height: rect.height,
      className: exportNodeClass(node),
      text: node.text,
      fontSize: exportFontSize(node),
      fontWeight: exportFontWeight(node),
      lineHeight: exportLineHeight(node),
    });
  }).join('');
}

function buildLocationOutlineExport() {
  const parts = [];
  let maxRight = 1;
  let maxBottom = 1;
  let minY = Number.POSITIVE_INFINITY;
  const outlineLocationRects = new Map();
  const outlineGroupRects = new Map();
  const markerGroups = markerRailGroups();
  const childLocationIds = childLocationIdSet();

  const ensureGroupRect = (groupId, childY) => {
    const group = diagram.locationGroups?.[groupId];
    if (!group) return null;
    const existing = outlineGroupRects.get(groupId);
    if (existing) return existing;
    const parentRect = group.parentGroupId ? ensureGroupRect(group.parentGroupId, childY) : null;
    const trunkX = parentRect ? parentRect.childTrunkX : 0;
    const groupSize = nodeSize({ type: 'location', text: group.text || 'Group' });
    const groupX = parentRect ? trunkX + SNAP_GAP : 0;
    const groupY = childY;
    const childTrunkX = groupX + groupSize.width + SNAP_GAP;
    minY = Math.min(minY, groupY);
    parts.push(svgBox({
      x: groupX,
      y: groupY,
      width: groupSize.width,
      height: groupSize.height,
      className: 'export-node location',
      text: group.text || 'Group',
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.12,
    }));
    const rect = { x: groupX, y: groupY, width: groupSize.width, height: groupSize.height, childTrunkX };
    outlineGroupRects.set(groupId, rect);
    if (parentRect) {
      parts.push(`<path class="export-connector" d="M ${parentRect.x + parentRect.width} ${parentRect.y + parentRect.height / 2} H ${trunkX} V ${groupY + groupSize.height / 2} H ${groupX}"/>`);
    }
    maxRight = Math.max(maxRight, groupX + groupSize.width);
    maxBottom = Math.max(maxBottom, groupY + groupSize.height);
    return rect;
  };

  const childGroupItems = (parentGroupId) => Object.values(diagram.locationGroups || {})
    .filter((group) => (group.parentGroupId || null) === (parentGroupId || null))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.text || '').localeCompare(b.text || ''));

  const groupSubtreeBottom = (groupId) => {
    const rect = outlineGroupRects.get(groupId);
    let bottom = rect ? rect.y + rect.height : 0;
    Object.values(diagram.nodes || {}).forEach((node) => {
      if (node.type !== 'location' || !locationBelongsToGroupSubtree(node, groupId)) return;
      const rect = outlineLocationRects.get(node.id);
      if (rect) bottom = Math.max(bottom, rect.y + rect.height);
    });
    childGroupItems(groupId).forEach((childGroup) => {
      bottom = Math.max(bottom, groupSubtreeBottom(childGroup.id));
    });
    return bottom;
  };

  const nextGroupChildY = (parentGroupId) => {
    if (!parentGroupId) return maxBottom + GAP;
    const parentRect = outlineGroupRects.get(parentGroupId);
    const childBottom = groupSubtreeBottom(parentGroupId);
    return Math.max(
      parentRect ? parentRect.y + parentRect.height + GAP : maxBottom + GAP,
      childBottom ? childBottom + GAP : 0,
    );
  };

  const ensureEmptyGroupRect = (groupId) => {
    if (outlineGroupRects.has(groupId)) return outlineGroupRects.get(groupId);
    const group = diagram.locationGroups?.[groupId];
    if (!group) return null;
    if (group.parentGroupId && !outlineGroupRects.has(group.parentGroupId)) {
      ensureEmptyGroupRect(group.parentGroupId);
    }
    return ensureGroupRect(groupId, nextGroupChildY(group.parentGroupId || null));
  };

  markerGroups.forEach((group) => {
    const markerNodes = group.nodes;
    const markerRects = markerNodes.map((node) => nodeRects.get(node.id)).filter(Boolean);
    const markerY = Math.min(...markerRects.map((rect) => rect.y));
    const label = markerRailLabel(group.kind);
    const markerLocation = { type: 'location', text: label };
    const markerLocationSize = nodeSize(markerLocation);
    const markerLocationY = markerY + 5;
    const plotX = markerLocationSize.width + LOCATION_GAP;
    const segmentWidth = OUTLINE_MARKER_SEGMENT_WIDTH;
    const stripWidth = markerNodes.length * segmentWidth - Math.max(0, markerNodes.length - 1) * BOX_BORDER;
    minY = Math.min(minY, markerY, markerLocationY);
    parts.push(svgBox({
      x: 0,
      y: markerLocationY,
      width: markerLocationSize.width,
      height: markerLocationSize.height,
      className: 'export-node location',
      text: label,
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.12,
    }));
    markerNodes.forEach((markerNode, index) => {
      parts.push(svgBox({
        x: plotX + index * (segmentWidth - BOX_BORDER),
        y: markerY,
        width: segmentWidth,
        height: PLOT_HEIGHT,
        className: `export-node ${exportOutlineMarkerClass(markerNode)}`,
        text: '',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.08,
      }));
    });
    parts.push(`<path class="export-connector" d="M ${markerLocationSize.width} ${markerLocationY + markerLocationSize.height / 2} H ${plotX} V ${markerY + PLOT_HEIGHT / 2}"/>`);
    maxRight = Math.max(maxRight, plotX + stripWidth);
    maxBottom = Math.max(maxBottom, markerY + PLOT_HEIGHT, markerLocationY + markerLocationSize.height);
  });

  diagram.railOrder.forEach((railId) => {
    const rail = diagram.rails[railId];
    if (!rail) return;
    const location = diagram.nodes[rail.locationId];
    const locationRect = nodeRects.get(rail.locationId);
    const firstPlotRect = nodeRects.get(rail.plotIds[0]);
    if (!location || !locationRect || !firstPlotRect) return;

    const parentRect = location.parentLocationId
      ? outlineLocationRects.get(location.parentLocationId)
      : location.groupId ? ensureGroupRect(location.groupId, locationRect.y) : null;
    const trunkX = parentRect ? parentRect.childTrunkX : 0;
    const locationX = parentRect ? trunkX + SNAP_GAP : 0;
    const locationY = locationRect.y;
    const childTrunkX = locationX + locationRect.width + SNAP_GAP;
    minY = Math.min(minY, locationY);
    parts.push(svgBox({
      x: locationX,
      y: locationY,
      width: locationRect.width,
      height: locationRect.height,
      className: 'export-node location',
      text: location.text,
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.12,
    }));
    outlineLocationRects.set(rail.locationId, { x: locationX, y: locationY, width: locationRect.width, height: locationRect.height, childTrunkX });
    if (parentRect) {
      parts.push(`<path class="export-connector" d="M ${parentRect.x + parentRect.width} ${parentRect.y + parentRect.height / 2} H ${trunkX} V ${locationY + locationRect.height / 2} H ${locationX}"/>`);
    }
    maxRight = Math.max(maxRight, locationX + locationRect.width);
    maxBottom = Math.max(maxBottom, locationY + locationRect.height);

    const plotWidth = OUTLINE_COMPACT_PLOT_WIDTH;
    const maxCharacters = maxRailCharacterCount(rail);
    const maxPlotNotes = maxRailPlotNoteCount(rail);
    const visiblePlotNotes = Math.min(maxPlotNotes, CHARACTER_COLUMN_LIMIT);
    const visibleCharacters = Math.min(maxCharacters, Math.max(0, CHARACTER_COLUMN_LIMIT - visiblePlotNotes));
    const characterOverhang = Math.max(0, (OUTLINE_COMPACT_CHARACTER_WIDTH - plotWidth) / 2);
    const clearChildTrunkPlotX = childLocationIds.has(rail.locationId) && Math.max(maxCharacters, maxPlotNotes) > 0
      ? childTrunkX + GAP + characterOverhang
      : 0;
    const plotX = Math.max(locationX + locationRect.width + LOCATION_GAP, clearChildTrunkPlotX);
    const plotY = firstPlotRect.y;
    const meta = firstRailMeta(rail);
    if (meta) {
      const metaY = plotY - META_SPAN_HEIGHT - 2 - BOX_BORDER;
      parts.push(svgBox({
        x: plotX,
        y: metaY,
        width: plotWidth,
        height: META_SPAN_HEIGHT,
        className: 'export-node metaSpan',
        text: '',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.08,
      }));
      maxBottom = Math.max(maxBottom, metaY + META_SPAN_HEIGHT);
    }

    parts.push(svgBox({
      x: plotX,
      y: plotY,
      width: plotWidth,
      height: firstPlotRect.height,
      className: `export-node ${exportOutlinePlotClass(diagram.nodes[rail.plotIds[0]], diagram.nodes[rail.plotIds.at(-1)])}`,
      text: '',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.08,
    }));
    parts.push(`<path class="export-outline-split" d="M ${plotX + plotWidth / 2} ${plotY} V ${plotY + firstPlotRect.height}"/>`);
    parts.push(`<path class="export-connector" d="M ${locationX + locationRect.width} ${locationY + locationRect.height / 2} H ${plotX} V ${plotY + firstPlotRect.height / 2}"/>`);
    maxRight = Math.max(maxRight, plotX + plotWidth);
    maxBottom = Math.max(maxBottom, plotY + firstPlotRect.height);

    let stackY = plotY + firstPlotRect.height + GAP;
    let previousStackBottom = plotY + firstPlotRect.height;
    for (let index = 0; index < visiblePlotNotes; index += 1) {
      const noteX = plotX + plotWidth / 2 - OUTLINE_COMPACT_CHARACTER_WIDTH / 2;
      parts.push(svgBox({
        x: noteX,
        y: stackY,
        width: OUTLINE_COMPACT_CHARACTER_WIDTH,
        height: NOTE_HEIGHT,
        className: 'export-node note',
        text: '',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.12,
      }));
      parts.push(`<path class="export-connector" d="M ${plotX + plotWidth / 2} ${previousStackBottom} V ${stackY}"/>`);
      maxRight = Math.max(maxRight, noteX + OUTLINE_COMPACT_CHARACTER_WIDTH);
      maxBottom = Math.max(maxBottom, stackY + NOTE_HEIGHT);
      previousStackBottom = stackY + NOTE_HEIGHT;
      stackY += NOTE_HEIGHT + STACK_GAP;
    }
    if (visibleCharacters > 0) {
      const characterX = plotX + plotWidth / 2 - OUTLINE_COMPACT_CHARACTER_WIDTH / 2;
      for (let index = 0; index < visibleCharacters; index += 1) {
        parts.push(svgBox({
          x: characterX,
          y: stackY,
          width: OUTLINE_COMPACT_CHARACTER_WIDTH,
          height: NOTE_HEIGHT,
          className: 'export-node character',
          text: '',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.12,
        }));
        parts.push(`<path class="export-connector" d="M ${plotX + plotWidth / 2} ${previousStackBottom} V ${stackY}"/>`);
        maxRight = Math.max(maxRight, characterX + OUTLINE_COMPACT_CHARACTER_WIDTH);
        maxBottom = Math.max(maxBottom, stackY + NOTE_HEIGHT);
        previousStackBottom = stackY + NOTE_HEIGHT;
        stackY += NOTE_HEIGHT + STACK_GAP;
      }
    }
  });

  childGroupItems(null).forEach(function renderMissingGroups(group) {
    ensureEmptyGroupRect(group.id);
    childGroupItems(group.id).forEach(renderMissingGroups);
  });

  if (!Number.isFinite(minY)) minY = 0;
  return {
    content: parts.join(''),
    bounds: { x: 0, y: minY, width: maxRight, height: maxBottom - minY },
    width: Math.ceil(maxRight),
    height: Math.ceil(maxBottom - minY),
  };
}

function svgBox({ x, y, width, height, className, text, fontSize, fontWeight, lineHeight }) {
  const lines = wrapTextForSvg(text, width, fontWeight >= 700, fontSize);
  const lineStep = fontSize * lineHeight;
  const totalTextHeight = Math.max(lineStep, lines.length * lineStep);
  const firstY = y + height / 2 - totalTextHeight / 2 + fontSize * 0.82;
  const classes = className.split(' ');
  const fontStyle = classes.includes('metaSpan') || classes.includes('sceneSpan') ? 'italic' : 'normal';
  const textSvg = lines.map((line, index) => (
    `<text x="${x + width / 2}" y="${firstY + index * lineStep}" class="export-text" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}">${escapeXml(line)}</text>`
  )).join('');
  return `<g><rect class="${className}" x="${x}" y="${y}" width="${width}" height="${height}"/>${textSvg}</g>`;
}

function wrapTextForSvg(text, width, bold, fontSize) {
  const content = (text || '').replace(/\s+/g, ' ').trim();
  if (!content) return [];
  const availableWidth = Math.max(1, width - TEXT_PADDING_X - BOX_BORDER_X);
  const lines = [];
  let current = '';
  content.split(' ').forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (measureText(next, bold, fontSize) <= availableWidth || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
}

function exportNodeClass(node) {
  return ['export-node', node.type, node.type === 'plot' ? (node.variant || 'normal') : '', node.borderType || ''].filter(Boolean).join(' ');
}

function exportOutlinePlotClass(firstNode, lastNode) {
  return `outlinePlot-${outlineFillKey(firstNode)}__${outlineFillKey(lastNode || firstNode)}`;
}

function exportOutlineMarkerClass(node) {
  const key = outlineFillKey(node);
  if (key === 'metaLabel') return 'metaLabel';
  if (key === 'scene') return 'scene';
  if (key === 'time') return 'time';
  return key;
}

function outlineFillKey(node) {
  if (!node) return 'plot';
  if (node.type === 'metaLabel') return 'metaLabel';
  if (node.type === 'metaSpan') return 'metaSpan';
  if (node.type === 'scene' || node.type === 'sceneSpan') return 'scene';
  if (node.type === 'time') return 'time';
  if (node.type === 'timePassage') return 'timePassage';
  if (node.type !== 'plot') return node.type;
  return node.variant && node.variant !== 'normal' ? node.variant : 'plot';
}

function exportOutlinePlotGradients() {
  const pairs = new Set();
  markerRailGroups().forEach((group) => {
    if (group.nodes.length) {
      pairs.add(`${outlineFillKey(group.nodes[0])}__${outlineFillKey(group.nodes.at(-1))}`);
    }
  });
  diagram.railOrder.forEach((railId) => {
    const rail = diagram.rails[railId];
    if (!rail?.plotIds.length) return;
    pairs.add(`${outlineFillKey(diagram.nodes[rail.plotIds[0]])}__${outlineFillKey(diagram.nodes[rail.plotIds.at(-1)])}`);
  });
  const gradients = Array.from(pairs).map((pair) => {
    const [left, right] = pair.split('__');
    return `<linearGradient id="outlinePlot-${pair}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${exportFillForKey(left)}"/>
      <stop offset="50%" stop-color="${exportFillForKey(left)}"/>
      <stop offset="50%" stop-color="${exportFillForKey(right)}"/>
      <stop offset="100%" stop-color="${exportFillForKey(right)}"/>
    </linearGradient>`;
  }).join('');
  const rules = Array.from(pairs).map((pair) => `.export-node.outlinePlot-${pair}{fill:url(#outlinePlot-${pair})}`).join('');
  return `${gradients}<style>${rules}</style>`;
}

function exportFillForKey(key) {
  const custom = customBoxStyleForVariant(key);
  if (custom) return darkTheme ? darkenHex(custom.color, 0.58) : custom.color;
  return styleColorForKey(key === 'normal' ? 'plot' : key, { dark: darkTheme });
}

function exportPlotVariantFill(variant) {
  return plotVariantColor(variant, { dark: darkTheme });
}

function exportFontSize(node) {
  if (node.type === 'metaSpan' || node.type === 'sceneSpan') return 11;
  if (['plot', 'note', 'time', 'metaLabel', 'scene'].includes(node.type)) return 12;
  if (node.type === 'timePassage') return 13;
  return 14;
}

function exportFontWeight(node) {
  if (['location', 'character', 'scene', 'sceneSpan', 'metaLabel', 'metaSpan', 'timePassage'].includes(node.type)) return 700;
  return 400;
}

function exportLineHeight(node) {
  if (node.type === 'plot' || node.type === 'metaLabel' || node.type === 'metaSpan' || node.type === 'scene' || node.type === 'sceneSpan') return 1.08;
  if (node.type === 'timePassage') return 1.25;
  return 1.12;
}

function exportSvgStyles() {
  const customRules = customBoxStyles()
    .map((style) => `.export-node.${style.id}{fill:${darkTheme ? darkenHex(style.color, 0.58) : style.color}}`)
    .join('');
  return `<style>
    .export-node{fill:${exportFillForKey('plot')};stroke:#111;stroke-width:2}
    .export-group{fill:none;stroke:#111;stroke-width:2}
    .export-node.location{fill:${exportFillForKey('location')}}
    .export-node.scene,.export-node.sceneSpan{fill:${exportFillForKey('scene')}}
    .export-node.metaSpan{fill:${exportFillForKey('metaSpan')}}
    .export-node.beginning{fill:${exportFillForKey('beginning')}}
    .export-node.end{fill:${exportFillForKey('end')}}
    .export-node.metaLabel{fill:${exportFillForKey('metaLabel')}}
    .export-node.dialogue{fill:${exportFillForKey('dialogue')}}
    .export-node.death{fill:${exportFillForKey('death')}}
    .export-node.speculation{fill:${exportFillForKey('speculation')}}
    .export-node.character{fill:${exportFillForKey('character')}}
    .export-node.time{fill:${exportFillForKey('time')}}
    .export-node.note{fill:${exportFillForKey('note')}}
    .export-node.timePassage{fill:${exportFillForKey('timePassage')}}
    ${customRules}
    .export-text{font-family:Arial, Helvetica, sans-serif;text-anchor:middle;fill:#111}
    .export-legend-title{font-family:Arial, Helvetica, sans-serif;font-size:15px;font-weight:700;fill:#111}
    .export-legend-heading{font-family:Arial, Helvetica, sans-serif;font-size:12px;font-weight:700;fill:#111}
    .export-legend-text{font-family:Arial, Helvetica, sans-serif;font-size:12px;fill:#111}
    .export-legend-bg{fill:#fff;stroke:#aaa;stroke-width:1}
    .export-legend-swatch{stroke:#111;stroke-width:1}
    .export-connector{fill:none;stroke:#111;stroke-width:2}
    .export-outline-split{fill:none;stroke:#777;stroke-width:1}
    .export-connector.level1{stroke-dasharray:1 7;stroke-linecap:round}
    .export-connector.level2{stroke-dasharray:2 6}
    .export-connector.level3{stroke-dasharray:10 6}
    .export-connector.level4{stroke-dasharray:10 5 2 5}
    .export-connector.level5{stroke-dasharray:18 6 2 6}
    .export-connector.level6{stroke-dasharray:18 5 2 5 2 5}
    .export-connector.level7{stroke-dasharray:20 8}
    .export-node.level1,.export-group.level1{stroke-dasharray:1 7;stroke-linecap:round}
    .export-node.level2,.export-group.level2{stroke-dasharray:2 6}
    .export-node.level3,.export-group.level3{stroke-dasharray:10 6}
    .export-node.level4,.export-group.level4{stroke-dasharray:10 5 2 5}
    .export-node.level5,.export-group.level5{stroke-dasharray:18 6 2 6}
    .export-node.level6,.export-group.level6{stroke-dasharray:18 5 2 5 2 5}
    .export-node.level7,.export-group.level7{stroke-dasharray:20 8}
  </style>`;
}

function exportArrowMarkers() {
  return `<marker id="exportArrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#111"/>
  </marker>`;
}

function svgGridPattern() {
  return `<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M 24 0 H 0 V 24" fill="none" stroke="#dedede" stroke-width="1"/>
  </pattern>`;
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileBaseName() {
  return diagram.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'diagram';
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[char]);
}

function escapeAttr(value) {
  return escapeXml(value);
}

function saveFile() {
  const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFileBaseName()}.diagrmr.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      diagram = normalizeDiagram(JSON.parse(reader.result));
      clearNodeSelection();
      selectedEdgeId = null;
      lastCreatedNodeId = null;
      needsInitialViewportFrame = true;
      resetHistory();
      render();
    } catch {
      alert('That file is not valid DIAGRMR JSON.');
    }
  };
  reader.readAsText(file);
}

titleInput?.addEventListener('input', () => {
  diagram.title = titleInput.value.trim() || 'Untitled Diagram';
  updateHeaderDiagramTitle();
  recordHistory();
  autosave();
});

diagramNotesInput?.addEventListener('input', () => {
  diagram.notes = diagramNotesInput.value;
  recordHistory();
  autosave();
});

[
  [diagramAuthorInput, 'author'],
  [diagramDateInput, 'date'],
  [diagramStatusInput, 'status'],
  [diagramSourceInput, 'source'],
  [diagramLoglineInput, 'logline'],
].forEach(([input, key]) => {
  input?.addEventListener('input', () => {
    diagram.info = normalizeDiagramInfo(diagram.info);
    diagram.info[key] = input.value;
    recordHistory();
    autosave();
  });
});

function applySelectedLineStyle(value) {
  syncLineStyleControls(value);
  if (!selectedEdgeId) return;
  const edge = diagram.edges.find((item) => item.id === selectedEdgeId);
  if (!edge) return;
  edge.type = value;
  render();
}

lineStyleSelect?.addEventListener('change', () => applySelectedLineStyle(lineStyleSelect.value));
toolbarLineStyleSelect?.addEventListener('change', () => applySelectedLineStyle(toolbarLineStyleSelect.value));

document.getElementById('newDiagram').addEventListener('click', () => {
  if (!confirm('Start a new diagram? The current autosave will be replaced.')) return;
  diagram = defaultDiagram();
  clearNodeSelection();
  selectedEdgeId = null;
  lastCreatedNodeId = null;
  transform = { x: 0, y: 0, scale: 1 };
  resetHistory();
  render();
});

document.getElementById('saveDiagram').addEventListener('click', saveFile);
exportButton?.addEventListener('click', exportDiagramFile);
exportMarginInput?.addEventListener('input', updateExportSummary);
exportLocationOutline?.addEventListener('change', updateExportSummary);
exportLegend?.addEventListener('change', updateExportSummary);
exportBackground?.addEventListener('change', updateExportSummary);
addCustomBoxStyleButton?.addEventListener('click', addCustomBoxStyle);
customBoxStyleLabel?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addCustomBoxStyle();
  }
});
undoButton?.addEventListener('click', undoDiagram);
redoButton?.addEventListener('click', redoDiagram);
resumeButton?.addEventListener('click', resumeToLastCreated);
topmostButton?.addEventListener('click', moveToTopmostBox);
leftmostButton?.addEventListener('click', moveToLeftmostTopBox);
rightmostButton?.addEventListener('click', moveToRightmostBox);
bottommostButton?.addEventListener('click', moveToBottommostBox);
helpButton?.addEventListener('click', openHelp);
inspectorButton?.addEventListener('click', openDiagramInspector);
storyDrawerToggle?.addEventListener('click', toggleStoryDrawer);
storyDrawerClose?.addEventListener('click', closeStoryDrawer);
storyTagsInput?.addEventListener('input', updateCurrentStoryDetails);
storyNotesInput?.addEventListener('input', updateCurrentStoryDetails);
storySearchToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleStorySearch();
});
storySearchPopover?.addEventListener('pointerdown', (event) => event.stopPropagation());
storySearchPopover?.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('pointerdown', (event) => {
  if (!presetColorPalette || presetColorPalette.hidden) return;
  const target = event.target;
  if (presetColorPalette.contains(target) || target.closest?.('.style-swatch')) return;
  closeStylePalette();
});
storyFilterInput?.addEventListener('input', () => {
  storyFilter = storyFilterInput.value || '';
  refreshStorySearchResults(false);
  updateStoryFilterVisuals();
});
storyFilterInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    jumpStorySearch(event.shiftKey ? -1 : 1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeStorySearch();
  }
});
storySearchPrev?.addEventListener('click', () => jumpStorySearch(-1));
storySearchNext?.addEventListener('click', () => jumpStorySearch(1));
storySearchClear?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  clearStorySearch();
});
storySearchClear?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  clearStorySearch();
});
storySearchClose?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeStorySearch();
});
storySearchScopeInputs.forEach((input) => input.addEventListener('change', updateStorySearchScopes));
helpClose?.addEventListener('click', closeHelp);
helpModal?.addEventListener('pointerdown', (event) => {
  if (event.target === helpModal) closeHelp();
});
diagramInspectorClose?.addEventListener('click', closeDiagramInspector);
diagramInspectorSearch?.addEventListener('input', renderDiagramInspector);
diagramInspectorModal?.addEventListener('pointerdown', (event) => {
  if (event.target === diagramInspectorModal) closeDiagramInspector();
});
locationColumnToggle?.addEventListener('click', () => setLocationColumnOpen(Boolean(locationColumn?.hidden)));
locationPanelTab?.addEventListener('click', () => setLocationColumnOpen(Boolean(locationColumn?.hidden)));
miniMapClose?.addEventListener('click', toggleMiniMap);
miniMapTab?.addEventListener('click', toggleMiniMap);
document.getElementById('loadDiagram').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) loadFile(file);
  event.target.value = '';
});
document.getElementById('zoomOut').addEventListener('click', () => zoomAt(-0.1));
document.getElementById('zoomIn').addEventListener('click', () => zoomAt(0.1));
document.getElementById('zoomReset').addEventListener('click', () => {
  setZoomAt(1);
});
fitHeightButton?.addEventListener('click', fitDiagramHeight);

lineModeToggle.addEventListener('click', () => {
  toggleLineMode();
});
boxModeToggle?.addEventListener('click', toggleBoxMode);
autoShiftToggle?.addEventListener('click', toggleAutoShift);
gridToggle?.addEventListener('click', toggleGrid);
themeToggle?.addEventListener('click', toggleTheme);
window.addEventListener('resize', () => {
  positionStorySearchPopover();
  const anchor = stylePaletteAnchorForTarget(activeStyleColorTarget);
  if (anchor && presetColorPalette && !presetColorPalette.hidden) positionStylePalette(anchor);
  updateLocationColumnWidth();
});

miniMap?.addEventListener('pointerdown', (event) => {
  if (!miniMapSvg || !nodeRects.size) return;
  event.preventDefault();
  event.stopPropagation();
  miniMapDrag = { pointerId: event.pointerId };
  miniMap.setPointerCapture(event.pointerId);
  panMiniMapToEvent(event);
});

miniMap?.addEventListener('pointermove', (event) => {
  if (!miniMapDrag || miniMapDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  panMiniMapToEvent(event);
});

miniMap?.addEventListener('pointerup', (event) => {
  if (!miniMapDrag || miniMapDrag.pointerId !== event.pointerId) return;
  miniMap.releasePointerCapture(event.pointerId);
  miniMapDrag = null;
});

miniMap?.addEventListener('pointercancel', (event) => {
  if (!miniMapDrag || miniMapDrag.pointerId !== event.pointerId) return;
  miniMap.releasePointerCapture(event.pointerId);
  miniMapDrag = null;
});

miniMap?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  const bounds = diagramBounds();
  panToWorldPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
});

function panMiniMapToEvent(event) {
  if (!miniMapSvg) return;
  const ctm = miniMapSvg.getScreenCTM();
  if (!ctm) return;
  const point = miniMapSvg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());
  panToWorldPoint(svgPoint.x, svgPoint.y);
}

viewport.addEventListener('pointerdown', (event) => {
  if (autoPan && event.button !== 1) {
    event.preventDefault();
    event.stopPropagation();
    stopAutoPan();
    return;
  }
  if (event.button !== 1) return;
  event.preventDefault();
  event.stopPropagation();
  startAutoPan(event);
}, { capture: true });

viewport.addEventListener('auxclick', (event) => {
  if (event.button === 1) event.preventDefault();
});

viewport.addEventListener('contextmenu', (event) => {
  if (!isCanvasBackgroundEvent(event)) return;
  event.preventDefault();
  event.stopPropagation();
  showCanvasMenu(event);
});

viewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  hideMenu();
  if (boxMode) {
    if (!isCanvasBackgroundEvent(event)) {
      selectedGroupId = null;
      updateSelectionVisuals();
      updateSelectionDetails();
      return;
    }
    const point = worldPointFromEvent(event);
    const id = nextId('group');
    const group = {
      id,
      x: snapToGrid(point.x),
      y: snapToGrid(point.y),
      width: SNAP_GAP,
      height: SNAP_GAP,
      note: 'Note',
      noteCorner: 'bottom-left',
      noteWidth: 104,
      noteHeight: META_SPAN_HEIGHT,
      borderType: 'level3',
      isDrawing: true,
    };
    diagram.groups.push(group);
    selectedGroupId = id;
    clearNodeSelection();
    selectedGroupId = id;
    groupDrag = {
      mode: 'draw',
      groupId: id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      start: { x: group.x, y: group.y, width: group.width, height: group.height },
    };
    viewport.setPointerCapture(event.pointerId);
    render();
    return;
  }
  clearNodeSelection();
  selectedEdgeId = null;
  startViewportPan(event);
  updateSelectionVisuals();
  updateSelectionDetails();
});

viewport.addEventListener('pointermove', (event) => {
  updateAutoPanPointer(event);
  if (groupDrag) {
    updateGroupDrag(event);
    return;
  }
  if (!isPanning) return;
  transform.x = panStart.tx + event.clientX - panStart.x;
  transform.y = panStart.ty + event.clientY - panStart.y;
  updateTransform();
});

window.addEventListener('pointermove', updateAutoPanPointer);
window.addEventListener('pointermove', updateConnectorEndpointDragHover);
window.addEventListener('pointerup', finishConnectorEndpointDrag, { capture: true });
window.addEventListener('pointercancel', cancelConnectorEndpointDrag, { capture: true });
window.addEventListener('blur', stopAutoPan);
window.addEventListener('blur', () => cancelConnectorEndpointDrag());
window.addEventListener('pointermove', updateLocationAutoPanPointer);
window.addEventListener('pointerup', (event) => {
  if (locationAutoPan && event.pointerId === locationAutoPan.pointerId) stopLocationAutoPan();
});
window.addEventListener('blur', stopLocationAutoPan);

viewport.addEventListener('pointerup', (event) => {
  if (autoPan && event.pointerId === autoPan.pointerId) {
    stopAutoPan();
    return;
  }
  if (groupDrag) {
    finishGroupDrag(event);
    return;
  }
  if (!isPanning) return;
  isPanning = false;
  viewport.releasePointerCapture(event.pointerId);
  viewport.classList.remove('dragging');
});

viewport.addEventListener('pointercancel', (event) => {
  if (autoPan && event.pointerId === autoPan.pointerId) {
    stopAutoPan();
    return;
  }
  if (groupDrag) {
    finishGroupDrag(event);
    return;
  }
  if (!isPanning) return;
  isPanning = false;
  try {
    viewport.releasePointerCapture(event.pointerId);
  } catch {}
  viewport.classList.remove('dragging');
});

viewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  const box = viewport.getBoundingClientRect();
  zoomAt(event.deltaY > 0 ? -0.08 : 0.08, event.clientX - box.left, event.clientY - box.top);
}, { passive: false });

locationColumn?.addEventListener('pointerdown', (event) => {
  if (event.button === 1) {
    event.preventDefault();
    event.stopPropagation();
    startLocationAutoPan(event);
    return;
  }
  if (event.button !== 0) return;
  if (event.target.closest?.('.outline-box')) return;
  hideMenu();
  isLocationPanning = true;
  locationPanStart = { y: event.clientY, ty: transform.y };
  locationColumn.setPointerCapture(event.pointerId);
  locationColumn.classList.add('dragging');
});

locationColumn?.addEventListener('pointermove', (event) => {
  updateLocationAutoPanPointer(event);
  if (!isLocationPanning || !locationPanStart) return;
  transform.y = locationPanStart.ty + event.clientY - locationPanStart.y;
  updateTransform();
});

locationColumn?.addEventListener('pointerup', (event) => {
  if (locationAutoPan && event.pointerId === locationAutoPan.pointerId) {
    event.preventDefault();
    stopLocationAutoPan();
    return;
  }
  if (!isLocationPanning) return;
  isLocationPanning = false;
  locationPanStart = null;
  locationColumn.releasePointerCapture(event.pointerId);
  locationColumn.classList.remove('dragging');
});

locationColumn?.addEventListener('pointercancel', (event) => {
  if (locationAutoPan && event.pointerId === locationAutoPan.pointerId) {
    stopLocationAutoPan();
    return;
  }
  if (!isLocationPanning) return;
  isLocationPanning = false;
  locationPanStart = null;
  locationColumn.releasePointerCapture(event.pointerId);
  locationColumn.classList.remove('dragging');
});

locationColumn?.addEventListener('wheel', (event) => {
  if (event.target.closest?.('.outline-box')) return;
  event.preventDefault();
  const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX;
  if (Math.abs(horizontalDelta) > Math.abs(event.deltaY) || event.shiftKey) {
    locationColumn.scrollLeft += horizontalDelta;
    return;
  }
  transform.y -= event.deltaY;
  updateTransform();
}, { passive: false });

locationColumn?.addEventListener('auxclick', (event) => {
  if (event.button === 1) event.preventDefault();
});

updateAppearance();

document.addEventListener('click', () => {
  hideMenu();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'f' && !isEditingTarget(event.target)) {
    event.preventDefault();
    openStorySearch();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    const nodeId = selectedOrActiveNodeId(event.target);
    const node = diagram.nodes[nodeId];
    if (node?.type === 'plot' || node?.type === 'location') {
      event.preventDefault();
      commitNodeTextFromElement(event.target);
      addPlotAfter(nodeId);
      return;
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
    const nodeId = selectedOrActiveNodeId(event.target);
    const node = diagram.nodes[nodeId];
    if (node?.type === 'plot' || node?.type === 'character') {
      event.preventDefault();
      commitNodeTextFromElement(event.target);
      if (node.type === 'character') {
        addCharacterAfterCharacter(nodeId);
      } else {
        addAttachment(nodeId, 'character');
      }
      return;
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'b') {
    const nodeId = selectedOrActiveNodeId(event.target);
    const node = diagram.nodes[nodeId];
    if (node?.type === 'plot') {
      event.preventDefault();
      commitNodeTextFromElement(event.target);
      addBranch(nodeId, 'below');
      return;
    }
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'l' && !isEditingTarget(event.target)) {
    event.preventDefault();
    toggleLineMode();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'b' && !isEditingTarget(event.target)) {
    event.preventDefault();
    toggleBoxMode();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redoDiagram();
    } else {
      undoDiagram();
    }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redoDiagram();
    return;
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeId) {
    event.preventDefault();
    deleteEdge(selectedEdgeId);
    return;
  }
  if (event.key === 'Escape') {
    if (endpointDrag) {
      event.preventDefault();
      cancelConnectorEndpointDrag();
      return;
    }
    if (storySearchPopover && !storySearchPopover.hidden) {
      closeStorySearch();
      return;
    }
    if (diagramInspectorModal && !diagramInspectorModal.hidden) {
      closeDiagramInspector();
      return;
    }
    if (helpModal && !helpModal.hidden) {
      closeHelp();
      return;
    }
    if (storyDrawer && !storyDrawer.hidden) {
      closeStoryDrawer();
      return;
    }
    hideMenu();
    stopAutoPan();
    pendingConnector = null;
    lineMode = false;
    boxMode = false;
    clearNodeSelection();
    selectedEdgeId = null;
    updateSelectionVisuals();
    updateSelectionDetails();
    updateTransform();
  }
});

render();

