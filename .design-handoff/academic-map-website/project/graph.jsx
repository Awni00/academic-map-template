/* graph.jsx — Static SVG graphs used in homepage preview, writing browser,
   and local-graph sidebar. Coordinates hand-placed to look organic. */

const NODE_FILL = {
  hub: 'var(--graph-hub)',
  paper: 'var(--graph-paper)',
  post: 'var(--graph-post)',
  note: 'var(--graph-note)',
  teaching: 'var(--graph-teaching)',
  project: 'var(--graph-project)',
};

// === Corpus shared across all graphs =========================================
// Hand-placed positions in an 800×320 (preview) and 1100×620 (browser) box.

const HUBS = [
  { id: 'ml-theory',  title: 'Machine Learning Theory',     type: 'hub' },
  { id: 'mech-interp', title: 'Mechanistic Interpretability', type: 'hub' },
  { id: 'cot',        title: 'Chain-of-Thought',            type: 'hub' },
  { id: 'info-theory', title: 'Information Theory',         type: 'hub' },
  { id: 'generalization', title: 'Generalization',          type: 'hub' },
  { id: 'optimization', title: 'Optimization',              type: 'hub' },
];

const ENTRIES = [
  { id: 'cot-info',          title: 'Chain-of-Thought Information',           type: 'paper' },
  { id: 'circuits-pythia',   title: 'Circuits for arithmetic in Pythia-70M',  type: 'paper' },
  { id: 'sgd-geometry',      title: 'On the Information Geometry of SGD',    type: 'paper' },
  { id: 'sparse-coding',     title: 'Sparse Coding for Interpretability',     type: 'paper' },
  { id: 'what-is-feature',   title: 'What is a feature?',                     type: 'note' },
  { id: 'slt-reading',       title: 'Reading group: Singular learning theory',type: 'note' },
  { id: 'attribution-graphs',title: 'Attribution graphs: a primer',           type: 'post' },
  { id: 'inductive-biases',  title: 'Inductive biases of attention',          type: 'post' },
  { id: 'sae-zoo',           title: 'Sparse-autoencoder zoo',                 type: 'project' },
  { id: 'circuit-lens',      title: 'circuit-lens (toolkit)',                 type: 'project' },
  { id: 'mit-6898',          title: '6.S898 — Deep Learning',                 type: 'teaching' },
  { id: 'mit-9520-notes',    title: 'Notes on 9.520',                         type: 'teaching' },
];

const ALL_NODES = [...HUBS, ...ENTRIES];

// (source → target) edges. Untyped. Used by every graph view.
const EDGES = [
  // hub–hub
  ['ml-theory', 'generalization'],
  ['ml-theory', 'info-theory'],
  ['ml-theory', 'optimization'],
  ['mech-interp', 'cot'],
  ['mech-interp', 'ml-theory'],
  ['cot', 'info-theory'],
  // papers
  ['cot-info', 'cot'],
  ['cot-info', 'info-theory'],
  ['circuits-pythia', 'mech-interp'],
  ['circuits-pythia', 'cot'],
  ['sgd-geometry', 'optimization'],
  ['sgd-geometry', 'info-theory'],
  ['sparse-coding', 'mech-interp'],
  // notes
  ['what-is-feature', 'mech-interp'],
  ['slt-reading', 'generalization'],
  ['slt-reading', 'ml-theory'],
  // posts
  ['attribution-graphs', 'mech-interp'],
  ['inductive-biases', 'ml-theory'],
  ['inductive-biases', 'generalization'],
  // projects
  ['sae-zoo', 'mech-interp'],
  ['sae-zoo', 'sparse-coding'],
  ['circuit-lens', 'mech-interp'],
  // teaching
  ['mit-6898', 'ml-theory'],
  ['mit-9520-notes', 'generalization'],
];

// ── PREVIEW LAYOUT (homepage, 800×280) ──
const PREVIEW_POS = {
  'mech-interp':     [205,  80],
  'cot':             [600,  95],
  'ml-theory':       [400, 150],
  'info-theory':     [105, 195],
  'generalization':  [310, 240],
  'optimization':    [555, 220],
  'cot-info':        [690,  50],
  'circuits-pythia': [490,  45],
  'sparse-coding':   [160, 130],
  'sgd-geometry':    [685, 175],
  'what-is-feature': [275, 130],
  'slt-reading':     [415, 270],
  'attribution-graphs':[100,  85],
  'inductive-biases':[365, 195],
  'sae-zoo':         [205, 250],
  'circuit-lens':    [55,  130],
  'mit-6898':        [490, 105],
  'mit-9520-notes':  [200, 215],
};

// ── BROWSER LAYOUT (writing browser, 1100×620) ──
const BROWSER_POS = {
  'mech-interp':       [310, 180],
  'cot':               [810, 230],
  'ml-theory':         [560, 360],
  'info-theory':       [180, 420],
  'generalization':    [380, 510],
  'optimization':      [840, 480],
  'cot-info':          [950, 130],
  'circuits-pythia':   [600, 140],
  'sparse-coding':     [185, 230],
  'sgd-geometry':      [990, 410],
  'what-is-feature':   [410, 130],
  'slt-reading':       [480, 555],
  'attribution-graphs':[105, 290],
  'inductive-biases':  [560, 470],
  'sae-zoo':           [120, 130],
  'circuit-lens':      [225, 90],
  'mit-6898':          [690, 270],
  'mit-9520-notes':    [285, 590],
};

// ── ENTRY LAYOUT (local graph in sidebar, 240×220) ──
// Centered on cot-info with 1-hop neighborhood.
const LOCAL_POS = {
  'cot-info':       [120, 110],
  'cot':            [195,  55],
  'info-theory':    [45,  175],
  'mech-interp':    [40,   55],
  'circuits-pythia':[200, 165],
};
const LOCAL_NODES = ['cot-info', 'cot', 'info-theory', 'mech-interp', 'circuits-pythia'];
const LOCAL_EDGES = EDGES.filter(([s,t]) => LOCAL_NODES.includes(s) && LOCAL_NODES.includes(t));

// === Renderer ================================================================

function nodeShape(node, pos, opts={}) {
  const [x, y] = pos;
  const cfg = {
    hub:      { shape: 'square',  size: 11 },
    paper:    { shape: 'circle',  size: 5.5 },
    post:     { shape: 'circle',  size: 4.5 },
    note:     { shape: 'circle',  size: 4 },
    teaching: { shape: 'diamond', size: 5 },
    project:  { shape: 'hexagon', size: 5 },
  }[node.type];
  const fill = NODE_FILL[node.type];
  const sz = (opts.size ?? cfg.size) * (opts.scale ?? 1);

  if (cfg.shape === 'square') {
    return <rect x={x - sz} y={y - sz} width={sz*2} height={sz*2} fill={fill}
                 rx={1.5} stroke="var(--bg)" strokeWidth={opts.stroke ?? 1.5} />;
  }
  if (cfg.shape === 'diamond') {
    return <polygon points={`${x},${y-sz} ${x+sz},${y} ${x},${y+sz} ${x-sz},${y}`} fill={fill}
                    stroke="var(--bg)" strokeWidth={opts.stroke ?? 1.2} />;
  }
  if (cfg.shape === 'hexagon') {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI/3)*i - Math.PI/2;
      pts.push(`${x + sz*Math.cos(a)},${y + sz*Math.sin(a)}`);
    }
    return <polygon points={pts.join(' ')} fill={fill}
                    stroke="var(--bg)" strokeWidth={opts.stroke ?? 1.2} />;
  }
  return <circle cx={x} cy={y} r={sz} fill={fill}
                 stroke="var(--bg)" strokeWidth={opts.stroke ?? 1.2} />;
}

function Graph({
  width, height, positions, nodes = ALL_NODES, edges = EDGES,
  showLabels = 'hubs', focus = null, focusedSet = null, dimNonFocus = false,
  selected = null, interactive = false,
}) {
  const inFocus = (id) => !focusedSet || focusedSet.has(id);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%"
         style={{ display: 'block', overflow: 'visible' }}>
      {/* edges */}
      <g>
        {edges.filter(([s,t]) => positions[s] && positions[t]).map(([s,t], i) => {
          const [x1,y1] = positions[s];
          const [x2,y2] = positions[t];
          const dim = dimNonFocus && (!inFocus(s) || !inFocus(t));
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--graph-edge)"
                  strokeWidth={1}
                  opacity={dim ? 0.08 : 0.32} />
          );
        })}
      </g>
      {/* nodes */}
      <g>
        {nodes.filter(n => positions[n.id]).map((n) => {
          const dim = dimNonFocus && !inFocus(n.id);
          const isFocus = focus === n.id;
          const isSel = selected === n.id;
          return (
            <g key={n.id} opacity={dim ? 0.22 : 1}
               style={{ cursor: interactive ? 'pointer' : 'default' }}>
              {isSel && (
                <circle cx={positions[n.id][0]} cy={positions[n.id][1]}
                        r={18} fill="none" stroke="var(--accent)" strokeWidth={1.2}
                        opacity={0.6} />
              )}
              {nodeShape(n, positions[n.id], { scale: isFocus || isSel ? 1.15 : 1 })}
            </g>
          );
        })}
      </g>
      {/* labels */}
      <g style={{
        fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 500,
        fill: 'var(--fg)', pointerEvents: 'none',
      }}>
        {nodes.filter(n => positions[n.id]).map((n) => {
          if (showLabels === 'hubs' && n.type !== 'hub') return null;
          if (showLabels === 'none') return null;
          const [x,y] = positions[n.id];
          const dim = dimNonFocus && !inFocus(n.id);
          const yOff = n.type === 'hub' ? 22 : 14;
          return (
            <text key={n.id} x={x} y={y + yOff} textAnchor="middle"
                  opacity={dim ? 0.22 : 0.85}
                  style={{ fontSize: n.type === 'hub' ? 11 : 9.5,
                           letterSpacing: n.type === 'hub' ? '0.005em' : '0.01em' }}>
              {n.title}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

Object.assign(window, {
  Graph, ALL_NODES, EDGES, HUBS, ENTRIES,
  PREVIEW_POS, BROWSER_POS, LOCAL_POS, LOCAL_NODES, LOCAL_EDGES, NODE_FILL,
});
