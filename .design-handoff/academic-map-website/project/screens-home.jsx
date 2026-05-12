/* screens-home.jsx — Three homepage variants for the academic template.
   All share the same data + design system; differ in composition.        */

const HOME_DATA = {
  name: 'Your Name',
  role: 'PhD Student',
  affiliation: 'MIT CSAIL',
  advisor: 'Prof. A. Mentor',
  bio: 'I work on the theory and mechanistic analysis of large language models — what they compute, why it generalizes, and how chain-of-thought reasoning relates to information flow inside the network. Previously at Cambridge (Part III Maths) and a research intern at Anthropic.',
  blurb_short: 'Theory and mechanistic interpretability of language models.',
  links: [
    { label: 'CV',       href: '/cv.pdf' },
    { label: 'Email',    href: 'mailto:you@mit.edu' },
    { label: 'Scholar',  href: '#' },
    { label: 'GitHub',   href: '#' },
    { label: 'arXiv',    href: '#' },
    { label: 'Twitter',  href: '#' },
  ],
  news: [
    { date: 'May 2026',  text: <>“Chain-of-Thought Information” accepted at <i>ICML 2026</i>.</> },
    { date: 'Apr 2026',  text: <>Co-organizing the workshop on Mechanistic Interpretability at NeurIPS 2026 — <a>CFP</a>.</> },
    { date: 'Feb 2026',  text: <>Started a summer research internship at Anthropic.</> },
    { date: 'Dec 2025',  text: <>Talk at MILA: “Circuit-level analysis of CoT reasoning.”</> },
    { date: 'Sep 2025',  text: <>Passed the thesis proposal. Committee: A. Mentor, B. Reader, C. External.</> },
  ],
  selectedPubs: [
    { authors: <><b>Your Name</b>, A. Mentor</>, title: 'Chain-of-Thought Information', venue: 'ICML 2026', year: 2026,
      tags: ['arXiv', 'code', 'blog'], abbr: 'ICML' },
    { authors: <><b>Your Name</b>, C. Coauthor, A. Mentor</>, title: 'Circuits for arithmetic in Pythia-70M', venue: 'NeurIPS 2025', year: 2025,
      tags: ['arXiv', 'code', 'poster'], abbr: 'NeurIPS' },
    { authors: <>D. Coauthor, <b>Your Name</b></>, title: 'On the information geometry of stochastic gradient descent', venue: 'JMLR', year: 2025,
      tags: ['arXiv'], abbr: 'JMLR' },
    { authors: <><b>Your Name</b>, A. Mentor</>, title: 'Sparse coding objectives for mechanistic interpretability', venue: 'ICLR 2024', year: 2024,
      tags: ['arXiv', 'code'], abbr: 'ICLR' },
  ],
  recentWriting: [
    { type: 'paper', title: 'Chain-of-Thought Information',
      summary: 'A learning-theoretic account of why CoT improves accuracy on compositional tasks.',
      date: '2026-05-12', slug: 'cot-info' },
    { type: 'note',  title: 'What is a feature?',
      summary: 'Reading notes on the SAE literature and what “feature” has meant historically.',
      date: '2026-04-30', slug: 'what-is-feature' },
    { type: 'post',  title: 'Attribution graphs: a primer',
      summary: 'A short tour of attribution-graph methods, from input × gradient to ACDC.',
      date: '2026-03-18', slug: 'attribution-graphs' },
  ],
};

// ── Shared atoms ─────────────────────────────────────────────────────────────

function Nav({ active = 'Home' }) {
  const items = ['Home','Writing','Publications','Research','Teaching','CV'];
  return (
    <nav className="nav">
      {items.map(label => (
        <a key={label} className={'nav-link ' + (label === active ? 'nav-link--active' : '')}>
          {label}
        </a>
      ))}
    </nav>
  );
}

function ProfilePlaceholder({ size = 140 }) {
  // Subtly-striped placeholder, monospace caption — per system rules.
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'repeating-linear-gradient(135deg, var(--placeholder-a) 0 6px, var(--placeholder-b) 6px 12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: '0.04em', border: '0.5px solid var(--border)',
    }}>
      profile.jpg
    </div>
  );
}

function SocialBar({ inline = false }) {
  return (
    <div className="sociallinks" style={inline ? { fontSize: 13 } : null}>
      {HOME_DATA.links.map((l, i) => (
        <React.Fragment key={l.label}>
          {i > 0 && <span className="sociallinks-sep">·</span>}
          <a className="sociallinks-link">{l.label}</a>
        </React.Fragment>
      ))}
    </div>
  );
}

function NewsList({ items = HOME_DATA.news }) {
  return (
    <dl className="news">
      {items.map((n, i) => (
        <React.Fragment key={i}>
          <dt>{n.date}</dt>
          <dd>{n.text}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function PubItem({ p, idx }) {
  return (
    <li className="pub">
      <div className="pub-thumb" aria-hidden>
        <div className="pub-thumb-stripes" />
        <span className="pub-thumb-tag">{p.abbr}</span>
      </div>
      <div className="pub-body">
        <div className="pub-title">{p.title}</div>
        <div className="pub-authors">{p.authors}</div>
        <div className="pub-meta">
          <span className="pub-venue"><i>{p.venue}</i>, {p.year}</span>
          <span className="pub-tags">
            {p.tags.map(t => <span key={t} className="pub-tag">{t}</span>)}
          </span>
        </div>
      </div>
    </li>
  );
}

function SelectedPubs({ items = HOME_DATA.selectedPubs }) {
  return <ul className="publist">{items.map((p,i) => <PubItem key={i} idx={i} p={p} />)}</ul>;
}

function RecentWriting({ items = HOME_DATA.recentWriting }) {
  return (
    <ul className="recent">
      {items.map((e,i) => (
        <li key={i} className="recent-card">
          <div className="recent-meta">
            <span className={`pill pill--${e.type}`}>{e.type}</span>
            <span className="recent-date">{e.date}</span>
          </div>
          <div className="recent-title">{e.title}</div>
          <div className="recent-summary">{e.summary}</div>
        </li>
      ))}
    </ul>
  );
}

function GraphPreviewBlock({ title = 'Explore the writing',
                             desc = 'Research notes, paper explainers, and teaching materials, organized as a linked map.',
                             height = 280, layout = 'wide' }) {
  return (
    <section className={`gpreview gpreview--${layout}`}>
      <div className="gpreview-head">
        <h2 className="h2">{title}</h2>
        <p className="lede">{desc}</p>
        <a className="cta">Open the writing map →</a>
      </div>
      <div className="gpreview-canvas" style={{ height }}>
        <Graph width={800} height={280} positions={PREVIEW_POS} />
      </div>
    </section>
  );
}

// ── Variant A — Classic two-column ───────────────────────────────────────────

function HomeA() {
  return (
    <div className="page">
      <header className="topbar">
        <a className="brand">{HOME_DATA.name}</a>
        <Nav active="Home" />
      </header>
      <main className="container">
        <section className="heroA">
          <div className="heroA-left">
            <h1 className="h1">{HOME_DATA.name}</h1>
            <div className="role">{HOME_DATA.role}, {HOME_DATA.affiliation}<br/>advised by {HOME_DATA.advisor}</div>
            <p className="bio">{HOME_DATA.bio}</p>
            <SocialBar />
          </div>
          <div className="heroA-right">
            <ProfilePlaceholder size={160} />
          </div>
        </section>

        <GraphPreviewBlock />

        <div className="cols2">
          <section>
            <h2 className="h2">Selected publications</h2>
            <SelectedPubs />
            <a className="cta">All publications →</a>
          </section>
          <aside>
            <h2 className="h2">News</h2>
            <NewsList />
          </aside>
        </div>

        <section>
          <h2 className="h2">Recent writing</h2>
          <RecentWriting />
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Variant B — Editorial single-column ──────────────────────────────────────

function HomeB() {
  return (
    <div className="page page--editorial">
      <header className="topbar topbar--editorial">
        <a className="brand brand--small">your-name.edu</a>
        <Nav active="Home" />
      </header>
      <main className="container container--narrow">
        <section className="heroB">
          <div className="heroB-eyebrow">{HOME_DATA.role} · {HOME_DATA.affiliation}</div>
          <h1 className="h1 h1--display">{HOME_DATA.name}</h1>
          <p className="lede lede--lg">{HOME_DATA.bio}</p>
          <div className="heroB-meta">
            <SocialBar inline />
          </div>
        </section>

        <hr className="rule" />

        <section className="strip">
          <div className="strip-head">
            <span className="kicker">Writing map</span>
            <a className="cta cta--small">Open browser →</a>
          </div>
          <div className="strip-graph">
            <Graph width={800} height={260} positions={PREVIEW_POS} />
          </div>
        </section>

        <hr className="rule" />

        <section>
          <div className="sect-head">
            <h2 className="h2">Selected publications</h2>
            <a className="cta cta--small">All →</a>
          </div>
          <SelectedPubs />
        </section>

        <hr className="rule" />

        <div className="cols2 cols2--editorial">
          <section>
            <h2 className="h2">Recent writing</h2>
            <RecentWriting />
          </section>
          <aside>
            <h2 className="h2">News</h2>
            <NewsList />
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Variant C — Sidebar nav (al-folio-ish) ───────────────────────────────────

function HomeC() {
  return (
    <div className="page page--sidebar">
      <aside className="sidenav">
        <div className="sidenav-photo">
          <ProfilePlaceholder size={120} />
        </div>
        <div className="sidenav-name">{HOME_DATA.name}</div>
        <div className="sidenav-role">{HOME_DATA.role}, {HOME_DATA.affiliation}</div>
        <div className="sidenav-bio">{HOME_DATA.blurb_short}</div>
        <nav className="sidenav-nav">
          {['Home','Writing','Publications','Research','Teaching','CV'].map(l => (
            <a key={l} className={'sidenav-link ' + (l === 'Home' ? 'sidenav-link--active' : '')}>{l}</a>
          ))}
        </nav>
        <div className="sidenav-social">
          <SocialBar inline />
        </div>
      </aside>
      <main className="sidemain">
        <section className="heroC">
          <p className="lede">{HOME_DATA.bio}</p>
        </section>

        <section>
          <h2 className="h2">News</h2>
          <NewsList items={HOME_DATA.news.slice(0,4)} />
        </section>

        <section>
          <div className="sect-head">
            <h2 className="h2">Selected publications</h2>
            <a className="cta cta--small">All →</a>
          </div>
          <SelectedPubs items={HOME_DATA.selectedPubs.slice(0,3)} />
        </section>

        <section className="gpreview gpreview--inset">
          <div className="gpreview-head">
            <h2 className="h2">Writing</h2>
            <p className="lede">A linked map of notes, paper explainers, and teaching material.</p>
            <a className="cta cta--small">Open →</a>
          </div>
          <div className="gpreview-canvas" style={{ height: 240 }}>
            <Graph width={800} height={280} positions={PREVIEW_POS} />
          </div>
        </section>

        <section>
          <h2 className="h2">Recent writing</h2>
          <RecentWriting items={HOME_DATA.recentWriting} />
        </section>
      </main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-left">© 2026 · {HOME_DATA.name}</div>
      <div className="footer-right">
        Built with the <a>academic-graph</a> template · <a>source</a> · <a>RSS</a>
      </div>
    </footer>
  );
}

Object.assign(window, { HomeA, HomeB, HomeC, HOME_DATA, GraphPreviewBlock, NewsList, SelectedPubs, RecentWriting, Nav, Footer, SocialBar });
