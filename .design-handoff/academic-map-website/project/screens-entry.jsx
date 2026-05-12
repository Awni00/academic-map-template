/* screens-entry.jsx — Distill-style writing entry page (/writing/cot-info). */

const ENTRY_DATA = {
  type: 'paper',
  title: 'Chain-of-Thought Information',
  subtitle: 'A learning-theoretic account of why chain-of-thought reasoning improves accuracy on compositional tasks.',
  authors: ['Your Name', 'A. Mentor'],
  affiliations: ['MIT CSAIL', 'MIT CSAIL'],
  date: 'May 12, 2026',
  updated: 'May 12, 2026',
  tags: ['chain-of-thought', 'learning-theory', 'information-theory'],
  external: [
    { label: 'arXiv', href: '#' },
    { label: 'PDF',   href: '#' },
    { label: 'code',  href: '#' },
    { label: 'cite',  href: '#' },
  ],
  toc: [
    { id: 'intro',      label: '1 · Introduction' },
    { id: 'setup',      label: '2 · Setup' },
    { id: 'main',       label: '3 · The CoT information bound' },
    { id: 'proof',      label: '4 · Proof sketch' },
    { id: 'empirics',   label: '5 · Empirics' },
    { id: 'limits',     label: '6 · Limitations' },
    { id: 'related',    label: '7 · Related work' },
    { id: 'refs',       label: 'References' },
  ],
};

function WritingEntry() {
  return (
    <div className="page page--entry">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>

      <main className="entry">
        {/* Title block — full width, centered */}
        <header className="entry-head">
          <div className="entry-kicker">
            <span className={`pill pill--paper`}>paper</span>
            <span className="entry-date">{ENTRY_DATA.date}</span>
          </div>
          <h1 className="entry-title">{ENTRY_DATA.title}</h1>
          <p className="entry-subtitle">{ENTRY_DATA.subtitle}</p>
          <div className="entry-authors">
            {ENTRY_DATA.authors.map((a,i) => (
              <span key={i} className="entry-author">
                <span className="ea-name">{a}</span>
                <span className="ea-aff">{ENTRY_DATA.affiliations[i]}</span>
              </span>
            ))}
          </div>
          <div className="entry-ext">
            {ENTRY_DATA.external.map((e,i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="entry-ext-sep">·</span>}
                <a className="entry-ext-link">{e.label}</a>
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* Body — Distill: narrow column + margin notes */}
        <div className="entry-body">
          <article className="entry-prose">
            <h2 id="intro">1 · Introduction</h2>
            <p>
              Large language models reason more accurately when they are asked to “think
              step by step.” Why? A natural hypothesis is that the intermediate tokens
              act as a <i>scratchpad</i>: they carry information about a latent reasoning
              state that the network would otherwise have to recompute at every layer.
              This article makes that intuition precise. We treat the chain-of-thought
              tokens as a noisy channel and bound the excess risk of compositional tasks
              in terms of the <a className="wikilink">[[mutual&nbsp;information]]</a> the
              CoT recovers about the latent state.
            </p>

            <div className="callout callout--intuition">
              <div className="callout-head">Main idea</div>
              <div className="callout-body">
                Chain-of-thought is helpful exactly when it discloses information about
                a hidden reasoning variable that a single forward pass cannot recover.
                The benefit is upper-bounded by the mutual information
                <span className="math">$\,I(Z; T \mid X)\,$</span> between the latent
                <span className="math">$Z$</span> and the generated trace
                <span className="math">$T$</span> given the prompt.
              </div>
            </div>

            <h2 id="setup">2 · Setup</h2>
            <p>
              Fix an input distribution <span className="math">$X \sim P_X$</span> and a
              latent reasoning variable <span className="math">$Z$</span>. A model
              produces a chain-of-thought trace <span className="math">$T$</span> and an
              answer <span className="math">$\hat{'{Y}'} = f_\theta(X, T)$</span>. Let
              <span className="math">$\ell(\hat{'{Y}'}, Y)$</span> be a bounded loss.
              Throughout we assume <span className="math">$T$</span> is sampled
              autoregressively from the same model.
            </p>

            <div className="theorem theorem--def">
              <div className="theorem-head">
                <span className="theorem-name">Definition</span>
                <span className="theorem-title">— Excess risk</span>
              </div>
              <div className="theorem-body">
                <div className="display-math">
                  R(<i>f</i>) − R<sup>★</sup> = E<sub>(X,Y)</sub>[ℓ(<i>f</i>(X), Y)]
                  &nbsp;−&nbsp;
                  inf<sub><i>g</i></sub> E<sub>(X,Y)</sub>[ℓ(<i>g</i>(X), Y)].
                </div>
              </div>
            </div>

            <h2 id="main">3 · The CoT information bound</h2>

            <div className="theorem">
              <div className="theorem-head">
                <span className="theorem-name">Theorem 1</span>
                <span className="theorem-title">— CoT information bound</span>
              </div>
              <div className="theorem-body">
                Under the channel assumptions of §2, for any compositional task with
                latent depth <span className="math">$d$</span>,
                <div className="display-math">
                  R(f<sub>CoT</sub>) − R<sup>★</sup> &nbsp;≤&nbsp; C · √(d · (H(Z|X) − I(Z; T | X))).
                </div>
                The CoT trace closes the excess-risk gap to zero exactly when
                <span className="math">$I(Z; T \mid X) = H(Z \mid X)$</span>.
              </div>
            </div>

            <div className="proof">
              <div className="proof-head">Proof sketch.</div>
              <p>
                Apply Fano’s inequality to the channel
                <span className="math">$Z \to T \to \hat{'{Y}'}$</span> and chain the
                per-step error using a coupling argument. The depth dependence comes
                from the multiplicativity of the per-step error in a compositional
                generative model. <span className="qed">□</span>
              </p>
            </div>

            <h2 id="empirics">5 · Empirics</h2>
            <p>
              We measure <span className="math">$I(Z; T \mid X)$</span> with a learned
              probe on synthetic compositional tasks of varying depth. The bound is
              non-vacuous up to <span className="math">$d = 6$</span> and tightens
              monotonically with model scale.
            </p>

            <figure className="figure">
              <div className="figure-canvas figure-canvas--chart">
                <svg viewBox="0 0 560 240" width="100%" height="100%">
                  <g stroke="var(--border)" strokeWidth="0.6">
                    <line x1="50" y1="20"  x2="50"  y2="210" />
                    <line x1="50" y1="210" x2="540" y2="210" />
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={210 - i*45} x2="540" y2={210 - i*45}
                            stroke="var(--border)" strokeDasharray="2 4" strokeWidth="0.5" />
                    ))}
                  </g>
                  {/* x ticks */}
                  <g style={{fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--muted)'}}>
                    {[1,2,3,4,5,6].map((d,i) => (
                      <text key={d} x={50 + (i+0.5)*80} y={224} textAnchor="middle">d={d}</text>
                    ))}
                    <text x={296} y={236} textAnchor="middle" fill="var(--fg)">compositional depth</text>
                  </g>
                  {/* y label */}
                  <text x="14" y="110" transform="rotate(-90 14 110)" textAnchor="middle"
                        style={{fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--muted)'}}>
                    excess risk
                  </text>

                  {/* CoT curve */}
                  <path d="M 90 195 L 170 188 L 250 175 L 330 158 L 410 138 L 490 115"
                        fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                  {[195,188,175,158,138,115].map((y,i) => (
                    <circle key={i} cx={90 + i*80} cy={y} r="2.5" fill="var(--accent)" />
                  ))}

                  {/* Direct curve */}
                  <path d="M 90 190 L 170 170 L 250 140 L 330 105 L 410 65 L 490 30"
                        fill="none" stroke="var(--graph-post)" strokeWidth="1.6"
                        strokeDasharray="4 3" />
                  {[190,170,140,105,65,30].map((y,i) => (
                    <circle key={i} cx={90 + i*80} cy={y} r="2.5" fill="var(--graph-post)" />
                  ))}

                  {/* legend */}
                  <g transform="translate(345, 38)" style={{fontFamily:'var(--font-ui)', fontSize:10}}>
                    <line x1="0" y1="6" x2="18" y2="6" stroke="var(--accent)" strokeWidth="1.6"/>
                    <text x="24" y="9" fill="var(--fg)">with CoT</text>
                    <line x1="0" y1="22" x2="18" y2="22" stroke="var(--graph-post)" strokeWidth="1.6" strokeDasharray="4 3"/>
                    <text x="24" y="25" fill="var(--fg)">direct</text>
                  </g>
                </svg>
              </div>
              <figcaption>
                <b>Figure 2.</b> Excess risk vs. compositional depth on the synthetic
                multi-hop benchmark. CoT keeps risk near the floor as depth grows;
                direct prompting degrades super-linearly.
              </figcaption>
            </figure>

            <h2 id="limits">6 · Limitations</h2>
            <p>
              The bound is tight only when the trace is faithful, in the sense of
              <a className="wikilink">[[faithful chain-of-thought]]</a>. For unfaithful
              traces the probe-based estimate of
              <span className="math">$I(Z; T \mid X)$</span> overestimates the true
              recoverable information; we discuss this in Appendix B.
            </p>

            <h2 id="refs">References</h2>
            <ol className="refs">
              <li><span className="ref-key">[1]</span> Wei et al. <i>Chain-of-thought prompting elicits reasoning in large language models.</i> NeurIPS 2022.</li>
              <li><span className="ref-key">[2]</span> Tishby & Zaslavsky. <i>Deep learning and the information bottleneck principle.</i> ITW 2015.</li>
              <li><span className="ref-key">[3]</span> Elhage et al. <i>Toy models of superposition.</i> Anthropic, 2022.</li>
              <li><span className="ref-key">[4]</span> Lanham et al. <i>Measuring faithfulness in chain-of-thought reasoning.</i> 2023.</li>
            </ol>
          </article>

          {/* Sidebar */}
          <aside className="entry-side">
            <div className="side-sticky">
              <div className="side-block">
                <div className="side-label">On this page</div>
                <ul className="toc">
                  {ENTRY_DATA.toc.map(t => (
                    <li key={t.id} className={t.id === 'main' ? 'toc-active' : ''}>
                      <a>{t.label}</a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="side-block">
                <div className="side-label">Local graph</div>
                <div className="local-graph">
                  <Graph width={240} height={220} positions={LOCAL_POS}
                         nodes={ALL_NODES.filter(n => LOCAL_NODES.includes(n.id))}
                         edges={LOCAL_EDGES}
                         selected="cot-info"
                         showLabels="all" />
                </div>
              </div>

              <div className="side-block">
                <div className="side-label">Backlinks</div>
                <ul className="side-list">
                  <li><span className="dot" style={{background:'var(--graph-hub)', borderRadius:1}}/>Chain-of-Thought</li>
                  <li><span className="dot" style={{background:'var(--graph-hub)', borderRadius:1}}/>Information Theory</li>
                  <li><span className="dot" style={{background:'var(--graph-paper)'}}/>Circuits in Pythia-70M</li>
                  <li><span className="dot" style={{background:'var(--graph-note)'}}/>What is a feature?</li>
                </ul>
              </div>

              <div className="side-block">
                <div className="side-label">Related</div>
                <ul className="side-list side-list--related">
                  <li><a>Sparse Coding for Interpretability</a></li>
                  <li><a>On the Information Geometry of SGD</a></li>
                </ul>
              </div>

              {/* Margin note */}
              <div className="aside-note">
                <div className="aside-note-mark">▸ margin note</div>
                The mutual-information quantity here is closely related to the
                <i> information bottleneck</i> of Tishby & Zaslavsky [2], applied
                to the autoregressive trace rather than internal activations.
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Variant 2 — True Distill (margin notes in right gutter) ─────────────────

function WritingEntryDistill() {
  return (
    <div className="page page--entry">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>
      <main className="entry entry--distill">
        <header className="entry-head">
          <div className="entry-kicker">
            <span className={`pill pill--paper`}>paper</span>
            <span className="entry-date">{ENTRY_DATA.date}</span>
          </div>
          <h1 className="entry-title">{ENTRY_DATA.title}</h1>
          <p className="entry-subtitle">{ENTRY_DATA.subtitle}</p>
          <div className="entry-authors">
            {ENTRY_DATA.authors.map((a,i) => (
              <span key={i} className="entry-author">
                <span className="ea-name">{a}</span>
                <span className="ea-aff">{ENTRY_DATA.affiliations[i]}</span>
              </span>
            ))}
          </div>
          <div className="entry-ext">
            {ENTRY_DATA.external.map((e,i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="entry-ext-sep">·</span>}
                <a className="entry-ext-link">{e.label}</a>
              </React.Fragment>
            ))}
          </div>
        </header>

        <div className="entry-body">
          <article className="entry-prose">
            <h2 id="intro">1 · Introduction</h2>
            <p>
              Large language models reason more accurately when they are asked to
              “think step by step.”<sup className="refnum">[1]</sup> A natural
              hypothesis is that the intermediate tokens act as a <i>scratchpad</i>:
              they carry information about a latent reasoning state that the network
              would otherwise have to recompute at every layer. This article makes
              that intuition precise.
            </p>
            <p>
              We treat the chain-of-thought tokens as a noisy channel and bound the
              excess risk of compositional tasks in terms of the mutual information
              that CoT recovers about the latent state.<sup className="refnum">[2]</sup>
            </p>

            <h2 id="setup">2 · Setup</h2>
            <p>
              Fix an input distribution <span className="math">$X \sim P_X$</span>
              and a latent reasoning variable <span className="math">$Z$</span>.
              A model produces a chain-of-thought trace
              <span className="math">$T$</span> and an answer
              <span className="math">$\hat{'{Y}'} = f_\theta(X,T)$</span>.
            </p>

            <div className="theorem">
              <div className="theorem-head">
                <span className="theorem-name">Theorem 1</span>
                <span className="theorem-title">— CoT information bound</span>
              </div>
              <div className="theorem-body">
                For any compositional task with latent depth
                <span className="math">$\,d$</span>,
                <div className="display-math">
                  R(f<sub>CoT</sub>) − R<sup>★</sup> ≤ C · √( d · (H(Z|X) − I(Z;T|X)) ).
                </div>
              </div>
            </div>

            <h2 id="empirics">3 · Empirics</h2>
            <p>
              We measure <span className="math">$I(Z;T\mid X)$</span> with a learned
              probe on synthetic compositional tasks of varying depth.<sup className="refnum">[3]</sup>
              The bound is non-vacuous up to <span className="math">$d=6$</span>
              and tightens monotonically with model scale.
            </p>

            <figure className="figure">
              <div className="figure-canvas figure-canvas--chart" style={{height: 220}}>
                <svg viewBox="0 0 560 200" width="100%" height="100%">
                  <g stroke="var(--border)" strokeWidth="0.6">
                    <line x1="50" y1="20" x2="50" y2="170" />
                    <line x1="50" y1="170" x2="540" y2="170" />
                  </g>
                  <path d="M 90 158 L 170 150 L 250 138 L 330 121 L 410 101 L 490 78"
                        fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                  <path d="M 90 152 L 170 132 L 250 105 L 330 75 L 410 40 L 490 14"
                        fill="none" stroke="var(--graph-post)" strokeWidth="1.6" strokeDasharray="4 3" />
                </svg>
              </div>
              <figcaption>
                <b>Figure 2.</b> Excess risk vs. compositional depth on the
                synthetic multi-hop benchmark.
              </figcaption>
            </figure>

            <p>
              In all settings we observe that the empirical risk gap closes
              when <span className="math">$I(Z;T\mid X)$</span> approaches
              <span className="math">$H(Z\mid X)$</span>, in agreement with
              the theorem.<sup className="refnum">[4]</sup>
            </p>
          </article>

          <aside className="entry-distill-side">
            <div className="margin-note">
              <span className="margin-note-num">▸ Note 1</span>
              First demonstrated at scale by Wei et al. (2022). The effect is
              especially pronounced on arithmetic and multi-hop QA.
            </div>
            <div className="margin-note">
              <span className="margin-note-num">▸ Note 2</span>
              Closely related to the <i>information bottleneck</i> of
              Tishby &amp; Zaslavsky, applied to the autoregressive trace
              rather than internal activations.
            </div>
            <div className="margin-note">
              <span className="margin-note-num">▸ Note 3</span>
              We use a 2-layer MLP probe trained on frozen residual streams.
              See Appendix A for hyperparameter sweep.
            </div>
            <div className="margin-note">
              <span className="margin-note-num">▸ Note 4</span>
              The probe-based estimator is an upper bound on the true
              information; the gap is largest for unfaithful traces.
            </div>

            <div className="side-block" style={{marginTop: 40}}>
              <div className="side-label">Local graph</div>
              <div className="local-graph">
                <Graph width={240} height={220} positions={LOCAL_POS}
                       nodes={ALL_NODES.filter(n => LOCAL_NODES.includes(n.id))}
                       edges={LOCAL_EDGES} selected="cot-info" showLabels="all" />
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Variant 3 — Narrow / note style — single column, no sidebar ─────────────

function WritingEntryNarrow() {
  return (
    <div className="page page--entry">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Writing" />
      </header>
      <main className="entry entry--narrow">
        <header className="entry-head">
          <div className="entry-kicker">
            <span className={`pill pill--paper`}>paper</span>
            <span className="entry-date">{ENTRY_DATA.date}</span>
          </div>
          <h1 className="entry-title">{ENTRY_DATA.title}</h1>
          <p className="entry-subtitle">{ENTRY_DATA.subtitle}</p>
          <div className="entry-authors">
            {ENTRY_DATA.authors.map((a,i) => (
              <span key={i} className="entry-author">
                <span className="ea-name">{a}</span>
                <span className="ea-aff">{ENTRY_DATA.affiliations[i]}</span>
              </span>
            ))}
          </div>
          <div className="entry-ext">
            {ENTRY_DATA.external.map((e,i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="entry-ext-sep">·</span>}
                <a className="entry-ext-link">{e.label}</a>
              </React.Fragment>
            ))}
          </div>
        </header>

        <div className="entry-body">
          <article className="entry-prose">
            <p>
              Large language models reason more accurately when asked to
              <i> think step by step</i>. We treat the chain-of-thought tokens
              as a noisy channel and bound the excess risk of compositional
              tasks in terms of the information that CoT recovers about a
              latent reasoning state.
            </p>

            <div className="callout callout--intuition">
              <div className="callout-head">Main idea</div>
              <div className="callout-body">
                Chain-of-thought is helpful exactly when it discloses
                information about a hidden reasoning variable that a single
                forward pass cannot recover.
              </div>
            </div>

            <h2>Setup</h2>
            <p>
              Fix an input <span className="math">$X \sim P_X$</span> and a
              latent reasoning variable <span className="math">$Z$</span>.
              A model produces a trace <span className="math">$T$</span> and
              an answer <span className="math">$\hat{'{Y}'} = f_\theta(X,T)$</span>.
            </p>

            <div className="theorem">
              <div className="theorem-head">
                <span className="theorem-name">Theorem 1</span>
                <span className="theorem-title">— CoT information bound</span>
              </div>
              <div className="theorem-body">
                For any compositional task with latent depth
                <span className="math">$\,d$</span>,
                <div className="display-math">
                  R(f<sub>CoT</sub>) − R<sup>★</sup> ≤ C · √( d · (H(Z|X) − I(Z;T|X)) ).
                </div>
              </div>
            </div>

            <div className="proof">
              <div className="proof-head">Proof sketch.</div>
              <p>
                Apply Fano’s inequality to the channel
                <span className="math">$Z \to T \to \hat{'{Y}'}$</span> and
                chain the per-step error using a coupling argument.
                <span className="qed">□</span>
              </p>
            </div>

            <h2>Empirics</h2>
            <p>
              On synthetic compositional tasks of varying depth, the bound
              is non-vacuous up to <span className="math">$d=6$</span>
              and tightens monotonically with model scale.
            </p>
          </article>
        </div>

        {/* Footer matter — backlinks/related/local-graph as horizontal strip */}
        <div className="entry-foot">
          <div className="entry-foot-section">
            <div className="entry-foot-label">Backlinks</div>
            <div className="entry-foot-content">
              <ul>
                <li><span className="dot" style={{width:7,height:7,borderRadius:1,background:'var(--graph-hub)',display:'inline-block'}}/><a>Chain-of-Thought</a></li>
                <li><span className="dot" style={{width:7,height:7,borderRadius:1,background:'var(--graph-hub)',display:'inline-block'}}/><a>Information Theory</a></li>
                <li><span className="dot" style={{width:7,height:7,borderRadius:'50%',background:'var(--graph-paper)',display:'inline-block'}}/><a>Circuits in Pythia-70M</a></li>
              </ul>
            </div>
          </div>
          <div className="entry-foot-section">
            <div className="entry-foot-label">Related</div>
            <div className="entry-foot-content">
              <ul>
                <li><a>Sparse Coding for Interpretability</a></li>
                <li><a>On the Information Geometry of SGD</a></li>
              </ul>
            </div>
          </div>
          <div className="entry-foot-section">
            <div className="entry-foot-label">Local graph</div>
            <div className="entry-foot-graph">
              <Graph width={240} height={200} positions={LOCAL_POS}
                     nodes={ALL_NODES.filter(n => LOCAL_NODES.includes(n.id))}
                     edges={LOCAL_EDGES} selected="cot-info" showLabels="all" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

Object.assign(window, { WritingEntry, WritingEntryDistill, WritingEntryNarrow, ENTRY_DATA });
