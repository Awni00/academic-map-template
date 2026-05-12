type Heading = {
  depth: number;
  slug: string;
  text: string;
};

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const items = headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3);
  if (items.length === 0) return <p className="muted">No headings yet.</p>;
  return (
    <ol>
      {items.map((heading) => (
        <li key={heading.slug} style={{ paddingLeft: `${Math.max(0, heading.depth - 2) * 0.75}rem` }}>
          <a href={`#${heading.slug}`}>{heading.text}</a>
        </li>
      ))}
    </ol>
  );
}
