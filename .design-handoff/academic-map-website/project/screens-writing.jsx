/* screens-writing.jsx — /writing graph browser (3-pane) + writing entry page. */

const BROWSER_DATA = {
  search: '',
  // Topic tree shown in left pane.
  topics: [
    { id: 'ml-theory',     label: 'Machine Learning Theory', count: 7, children: [
      { id: 'generalization', label: 'Generalization', count: 4 },
      { id: 'info-theory',    label: 'Information Theory', count: 5 },
      { id: 'optimization',   label: 'Optimization', count: 3 },
    ]},
    { id: 'mech-interp',   label: 'Mechanistic Interpretability', count: 6 },
    { id: 'cot',           label: 'Chain-of-Thought', count: 4 },
  ],
  // Static selected node for the preview panel.
  selected: {
    id: 'cot-info',
    title: 'Chain-of-Thought Information',
    type: 'paper',
    date: '2026-05-12',
    summary: 'A learning-theoretic account of why chain-of-thought reasoning improves accuracy on compositional tasks. We frame the intermediate tokens as a noisy channel and bound the excess risk in terms of the information that CoT recovers about a latent reasoning state.',
    tags: ['chain-of-thought', 'learning-theory', 'information-theory'],
    external: { arxiv: '2605.01234', code: 'github.com/you/cot-info' },
    backlinks: [
      { title: 'Chain-of-Thought', type: 'hub' },
      { title: 'Information Theory', type: 'hub' },
      { title: 'What is a feature?', type: 'note' },
      { title: 'Circuits for arithmetic in Pythia-70M', type: 'paper' },
    ],
    outgoing: [
      { title: 'Chain-of-Thought', type: 'hub' },
      { title: 'Information Theory', type: 'hub' },
    ],
  },
};

const TYPE_COLOR_SWATCH = {
  hub: 'var(--graph-hub)',
  paper: 'var(--graph-paper)',
  post: 'var(--graph-post)',
  note: 'var(--graph-note)',
  teaching: 'var(--graph-teaching)',
  project: 'var(--graph-project)',
};

function TypePill({ type, count }) {
  return (
    <label className="type-pill">
      <input type="checkbox" defaultChecked />
      <span className="type-pill-swatch" style={{ background: TYPE_COLOR_SWATCH[type] }} />
      <span className="type-pill-label">{type}</span>
      <span className="type-pill-count">{count}</span>
    </label>
  );
}

function TopicTree({ active = 'mech-interp' }) {
  return (
    <ul className="topic-tree">
      {BROWSER_DATA.topics.map(t => (
        <li key={t.id}>
          <a className={'topic ' + (t.id === active ? 'topic--active' : '')}>
            <span className="topic-arrow">▾</span>
            <span className="topic-label">{t.label}</span>
            <span className="topic-count">{t.count}</span>
          </a>
          {t.children && (
            <ul className="topic-children">
              {t.children.map(c => (
                <li key={c.id}>
                  <a className="topic topic--child">
                    <span className="topic-label">{c.label}</span>
                    <span className="topic-count">{c.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function WritingBrowser() {
  const focusId = 'mech-interp';
  // 1-hop neighborhood of mech-interp
  const focusSet = new Set([
    'mech-interp', 'cot', 'ml-theory', 'circuits-pythia', 'sparse-coding',
    'what-is-feature', 'attribution-graphs', 'sae-zoo', 'circuit-lens',
  ]);
  return (
    <div className="page page--app">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>
      <div className="browser">
        <aside className="bpanel bpanel--left">
          <div className="bpanel-section">
            <label className="bpanel-label">Search</label>
            <div className="bsearch">
              <svg width="12" height="12" viewBox="0 0 16 16" style={{flex:'0 0 auto', opacity:0.5}}>
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input placeholder="search titles, tags, summaries…" />
              <kbd>⌘K</kbd>
            </div>
          </div>

          <div className="bpanel-section">
            <label className="bpanel-label">Topics</label>
            <TopicTree active={focusId} />
          </div>

          <div className="bpanel-section">
            <label className="bpanel-label">Type</label>
            <div className="type-pills">
              <TypePill type="hub"      count={3} />
              <TypePill type="paper"    count={4} />
              <TypePill type="post"     count={2} />
              <TypePill type="note"     count={2} />
              <TypePill type="teaching" count={2} />
              <TypePill type="project"  count={2} />
            </div>
          </div>

          <div className="bpanel-section">
            <label className="bpanel-label">Tags</label>
            <div className="tag-cloud">
              {['interpretability','learning-theory','chain-of-thought','generalization',
                'sgd','sparse-coding','transformers','attention','circuits','features'].map(t => (
                <span key={t} className={'tag ' + (t === 'interpretability' ? 'tag--active' : '')}>{t}</span>
              ))}
            </div>
          </div>

          <div className="bpanel-section">
            <label className="bpanel-label">Focus</label>
            <div className="seg">
              <button className="seg-btn seg-btn--on">dim</button>
              <button className="seg-btn">filter</button>
            </div>
            <div className="bpanel-row">
              <span className="bpanel-sub">Depth</span>
              <div className="seg seg--sm">
                <button className="seg-btn seg-btn--on">1</button>
                <button className="seg-btn">2</button>
              </div>
            </div>
          </div>
        </aside>

        <section className="bcanvas">
          <div className="bcanvas-bar">
            <div className="bcanvas-crumbs">
              <span className="crumb">Writing</span>
              <span className="crumb-sep">/</span>
              <span className="crumb crumb--active">
                <span className="type-pill-swatch" style={{ background: 'var(--graph-hub)' }} />
                Mechanistic Interpretability
              </span>
              <button className="crumb-x">×</button>
            </div>
            <div className="bcanvas-view">
              <div className="seg seg--sm">
                <button className="seg-btn seg-btn--on">map</button>
                <button className="seg-btn">topics</button>
                <button className="seg-btn">list</button>
              </div>
            </div>
          </div>
          <div className="bcanvas-graph">
            <Graph width={1100} height={620}
                   positions={BROWSER_POS}
                   showLabels="all"
                   focusedSet={focusSet}
                   dimNonFocus={true}
                   selected="cot-info" />
            <div className="bcanvas-legend">
              <span><span className="lg-dot" style={{background:'var(--graph-hub)', borderRadius:2}}/>Hub</span>
              <span><span className="lg-dot" style={{background:'var(--graph-paper)'}}/>Paper</span>
              <span><span className="lg-dot" style={{background:'var(--graph-post)'}}/>Post</span>
              <span><span className="lg-dot" style={{background:'var(--graph-note)'}}/>Note</span>
              <span><span className="lg-dot" style={{background:'var(--graph-project)', transform:'rotate(30deg)', borderRadius:1}}/>Project</span>
              <span><span className="lg-dot" style={{background:'var(--graph-teaching)', transform:'rotate(45deg)'}}/>Teaching</span>
            </div>
            <div className="bcanvas-zoom">
              <button>+</button><button>−</button><button title="fit">⌂</button>
            </div>
          </div>
        </section>

        <aside className="bpanel bpanel--right">
          <div className="preview-header">
            <span className={`pill pill--paper`}>paper</span>
            <span className="preview-date">{BROWSER_DATA.selected.date}</span>
          </div>
          <h2 className="preview-title">{BROWSER_DATA.selected.title}</h2>
          <div className="preview-authors">Your Name · A. Mentor</div>
          <p className="preview-summary">{BROWSER_DATA.selected.summary}</p>

          <div className="preview-tags">
            {BROWSER_DATA.selected.tags.map(t => <span key={t} className="tag tag--sm">{t}</span>)}
          </div>

          <div className="preview-external">
            <a className="ext-link">arXiv:{BROWSER_DATA.selected.external.arxiv}</a>
            <a className="ext-link">{BROWSER_DATA.selected.external.code}</a>
          </div>

          <div className="preview-section">
            <div className="preview-label">Backlinks</div>
            <ul className="preview-list">
              {BROWSER_DATA.selected.backlinks.map((b,i) => (
                <li key={i}>
                  <span className="type-pill-swatch" style={{ background: TYPE_COLOR_SWATCH[b.type] }} />
                  <a>{b.title}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="preview-section">
            <div className="preview-label">Outgoing links</div>
            <ul className="preview-list">
              {BROWSER_DATA.selected.outgoing.map((b,i) => (
                <li key={i}>
                  <span className="type-pill-swatch" style={{ background: TYPE_COLOR_SWATCH[b.type] }} />
                  <a>{b.title}</a>
                </li>
              ))}
            </ul>
          </div>

          <button className="open-btn">Open entry →</button>
        </aside>
      </div>
    </div>
  );
}

// ── Shared corpus for topics + list views ───────────────────────────────────
const ALL_WRITING = [
  { id: 'mech-interp', title: 'Mechanistic Interpretability', type: 'hub', date: '2026-04-02',
    summary: 'Hub: circuits, features, and how to read them out of trained networks.',
    tags: ['interpretability','circuits','features'], children: 6 },
  { id: 'ml-theory', title: 'Machine Learning Theory', type: 'hub', date: '2025-11-10',
    summary: 'Hub: generalization, optimization, and information-theoretic views.',
    tags: ['learning-theory','generalization'], children: 7 },
  { id: 'cot', title: 'Chain-of-Thought', type: 'hub', date: '2026-02-20',
    summary: 'Hub: prompting, intermediate tokens, and faithfulness.',
    tags: ['chain-of-thought','reasoning'], children: 4 },
  { id: 'cot-info', title: 'Chain-of-Thought Information', type: 'paper', date: '2026-05-12',
    summary: 'A learning-theoretic account of why CoT improves compositional accuracy.',
    tags: ['chain-of-thought','learning-theory','information-theory'], venue: 'ICML 2026' },
  { id: 'circuits-pythia', title: 'Circuits for arithmetic in Pythia-70M', type: 'paper', date: '2025-11-30',
    summary: 'Discovering and characterizing the addition circuit in a small transformer.',
    tags: ['interpretability','circuits'], venue: 'NeurIPS 2025' },
  { id: 'sgd-geometry', title: 'On the information geometry of SGD', type: 'paper', date: '2025-07-04',
    summary: 'Recasting SGD trajectories as a natural-gradient flow on the model manifold.',
    tags: ['optimization','sgd','information-theory'], venue: 'JMLR' },
  { id: 'sparse-coding', title: 'Sparse coding for interpretability', type: 'paper', date: '2024-05-08',
    summary: 'Connecting modern SAE objectives to classical sparse-coding theory.',
    tags: ['interpretability','sparse-coding'], venue: 'ICLR 2024' },
  { id: 'what-is-feature', title: 'What is a feature?', type: 'note', date: '2026-04-30',
    summary: 'Reading notes on what “feature” has meant historically, from PCA to SAEs.',
    tags: ['interpretability','features'] },
  { id: 'slt-reading', title: 'Reading group: Singular learning theory', type: 'note', date: '2026-03-04',
    summary: 'Notes from a 6-week SLT reading group. Watanabe Chapters 1–4.',
    tags: ['learning-theory','slt'] },
  { id: 'attribution-graphs', title: 'Attribution graphs: a primer', type: 'post', date: '2026-03-18',
    summary: 'A short tour of attribution methods, from gradient×input to ACDC.',
    tags: ['interpretability','attribution'] },
  { id: 'inductive-biases', title: 'Inductive biases of attention', type: 'post', date: '2026-01-22',
    summary: 'A survey-style post on what attention is biased toward, and what it isn’t.',
    tags: ['attention','generalization'] },
  { id: 'sae-zoo', title: 'Sparse-autoencoder zoo', type: 'project', date: '2026-02-14',
    summary: 'A growing menagerie of SAEs trained on Pythia-70M with reproducible recipes.',
    tags: ['interpretability','sae','reproducibility'] },
  { id: 'circuit-lens', title: 'circuit-lens (toolkit)', type: 'project', date: '2025-09-01',
    summary: 'An open-source toolkit for circuit-level analysis of small transformers.',
    tags: ['interpretability','tooling'] },
  { id: 'mit-6898', title: '6.S898 — Deep Learning', type: 'teaching', date: '2025-09-10',
    summary: 'TA notes, problem sets, and solutions for the MIT graduate deep learning class.',
    tags: ['teaching','deep-learning'] },
  { id: 'mit-9520-notes', title: 'Notes on 9.520 (Statistical Learning Theory)', type: 'teaching', date: '2025-02-04',
    summary: 'Lecture notes and worked examples from 9.520.',
    tags: ['teaching','learning-theory'] },
];

const TYPE_ORDER = ['hub','paper','post','note','project','teaching'];

// ── WritingBrowserTopics — hub-as-section index view ────────────────────────

function WritingBrowserTopics() {
  // Group entries by hub via tag overlap with hub label.
  const hubGroups = {
    'mech-interp': ['circuits-pythia','sparse-coding','what-is-feature','attribution-graphs','sae-zoo','circuit-lens'],
    'ml-theory':   ['sgd-geometry','slt-reading','inductive-biases','mit-9520-notes'],
    'cot':         ['cot-info'],
  };
  const byId = Object.fromEntries(ALL_WRITING.map(e => [e.id, e]));

  return (
    <div className="page page--app">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>
      <div className="topicspage">
        <div className="topicspage-bar">
          <div className="bcanvas-crumbs">
            <span className="crumb crumb--active">Writing</span>
            <span className="topicspage-count">15 entries · 3 hubs</span>
          </div>
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <div className="bsearch" style={{width: 280}}>
              <svg width="12" height="12" viewBox="0 0 16 16" style={{flex:'0 0 auto', opacity:0.5}}>
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input placeholder="search…" />
              <kbd>⌘K</kbd>
            </div>
            <div className="seg seg--sm">
              <button className="seg-btn">map</button>
              <button className="seg-btn seg-btn--on">topics</button>
              <button className="seg-btn">list</button>
            </div>
          </div>
        </div>

        <div className="topicspage-body">
          {Object.entries(hubGroups).map(([hubId, childIds]) => {
            const hub = byId[hubId];
            const children = childIds.map(id => byId[id]).sort((a,b) => b.date.localeCompare(a.date));
            // Group children by type
            const byType = {};
            children.forEach(c => { (byType[c.type] = byType[c.type] || []).push(c); });
            return (
              <section className="hubsec" key={hubId}>
                <div className="hubsec-head">
                  <div className="hubsec-icon" aria-hidden>
                    <span style={{ background: 'var(--graph-hub)' }} />
                  </div>
                  <div className="hubsec-titles">
                    <a className="hubsec-title">{hub.title}</a>
                    <div className="hubsec-summary">{hub.summary}</div>
                  </div>
                  <div className="hubsec-meta">
                    <span className="hubsec-count">{children.length} linked</span>
                    <a className="cta cta--small">Open hub →</a>
                  </div>
                </div>

                {TYPE_ORDER.filter(tp => byType[tp]).map(tp => (
                  <div className="hubsec-grouprow" key={tp}>
                    <div className="hubsec-grouplabel">
                      <span className="type-pill-swatch" style={{ background: TYPE_COLOR_SWATCH[tp] }} />
                      {tp}
                      <span className="hubsec-groupcount">{byType[tp].length}</span>
                    </div>
                    <ul className="hubsec-list">
                      {byType[tp].map(e => (
                        <li key={e.id} className="hubsec-item">
                          <a className="hubsec-itemtitle">{e.title}</a>
                          <div className="hubsec-itemmeta">
                            {e.venue && <span className="hubsec-venue"><i>{e.venue}</i></span>}
                            <span className="hubsec-date">{e.date}</span>
                          </div>
                          <div className="hubsec-itemsum">{e.summary}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── WritingBrowserList — dense table view ───────────────────────────────────

function WritingBrowserList() {
  const sorted = [...ALL_WRITING].sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div className="page page--app">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>
      <div className="listpage">
        <div className="topicspage-bar">
          <div className="bcanvas-crumbs">
            <span className="crumb crumb--active">Writing</span>
            <span className="topicspage-count">{sorted.length} entries</span>
          </div>
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <div className="seg seg--sm" style={{marginRight: 4}}>
              {['all','hub','paper','post','note','project','teaching'].map((t,i) => (
                <button key={t} className={'seg-btn ' + (i===0 ? 'seg-btn--on' : '')}>{t}</button>
              ))}
            </div>
            <div className="seg seg--sm">
              <button className="seg-btn">map</button>
              <button className="seg-btn">topics</button>
              <button className="seg-btn seg-btn--on">list</button>
            </div>
          </div>
        </div>

        <div className="listpage-table">
          <div className="listrow listrow--head">
            <span className="lc lc-type">Type</span>
            <span className="lc lc-title">Title</span>
            <span className="lc lc-tags">Tags</span>
            <span className="lc lc-date">Date ↓</span>
          </div>
          {sorted.map(e => (
            <a key={e.id} className="listrow">
              <span className="lc lc-type">
                <span className="type-pill-swatch" style={{ background: TYPE_COLOR_SWATCH[e.type] }} />
                <span className="lc-typelabel">{e.type}</span>
              </span>
              <span className="lc lc-title">
                <span className="lc-titletext">{e.title}</span>
                <span className="lc-summary">{e.summary}</span>
              </span>
              <span className="lc lc-tags">
                {e.tags.slice(0,3).map(t => <span key={t} className="tag tag--sm">{t}</span>)}
              </span>
              <span className="lc lc-date">{e.date}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WritingBrowser, WritingBrowserTopics, WritingBrowserList,
  BROWSER_DATA, TYPE_COLOR_SWATCH, ALL_WRITING,
});
