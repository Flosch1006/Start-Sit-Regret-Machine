import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  /** the name to show while it fits on one line */
  name: string;
  /** shown instead as soon as `name` would need a line break */
  shortName: string;
}

/**
 * A team name that never wraps: it shows the full name and switches to the
 * short name when the space is too small. It fills the space its parent flex
 * container leaves, so the parent decides when "too small" is.
 */
export function TeamName({ name, shortName }: Props) {
  const box = useRef<HTMLSpanElement>(null);
  const full = useRef<HTMLSpanElement>(null);
  const [short, setShort] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    const measure = full.current;
    if (!el || !measure) return;
    const check = () => setShort(measure.offsetWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [name]);

  return (
    <span ref={box} className="team-name" title={short ? name : undefined}>
      {/* invisible copy of the full name: its width is what the box has to offer room for */}
      <span ref={full} className="team-name-full" aria-hidden="true">
        {name}
      </span>
      {short ? shortName : name}
    </span>
  );
}
