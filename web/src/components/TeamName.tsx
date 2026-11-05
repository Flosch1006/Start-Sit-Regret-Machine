import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** "DaFlow Titans" -> "Titans" */
export const nickname = (name: string) => name.split(" ").at(-1) ?? name;

interface Group {
  /** the longest variant (0 = full name, 1 = nickname, 2 = short name) that fits every name of the group */
  level: number;
  report: (id: string, fit: number) => void;
  forget: (id: string) => void;
}

const GroupContext = createContext<Group | null>(null);

/**
 * Names inside a group always show the same variant: as soon as one of them
 * has to be shortened, all of them are.
 */
export function NameGroup({ children }: { children: ReactNode }) {
  const fits = useRef(new Map<string, number>());
  const [level, setLevel] = useState(0);

  const update = useCallback(() => setLevel(Math.max(0, ...fits.current.values())), []);
  const report = useCallback(
    (id: string, fit: number) => {
      if (fits.current.get(id) === fit) return;
      fits.current.set(id, fit);
      update();
    },
    [update],
  );
  const forget = useCallback(
    (id: string) => {
      fits.current.delete(id);
      update();
    },
    [update],
  );

  const value = useMemo(() => ({ level, report, forget }), [level, report, forget]);
  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

interface Props {
  name: string;
  shortName: string;
}

/**
 * A team name that never wraps. It shows the longest variant that fits on one
 * line: the full name, then the nickname, then the short name. It fills the
 * space its parent flex container leaves, so the parent decides what fits.
 */
export function TeamName({ name, shortName }: Props) {
  const group = useContext(GroupContext);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  const [own, setOwn] = useState(0);
  const variants = useMemo(() => [name, nickname(name), shortName], [name, shortName]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => {
      const widths = [...el.querySelectorAll<HTMLElement>("[data-variant]")].map((v) => v.offsetWidth);
      const fits = widths.findIndex((w) => w <= el.clientWidth);
      const fit = fits === -1 ? widths.length - 1 : fits;
      setOwn(fit);
      group?.report(id, fit);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      observer.disconnect();
      group?.forget(id);
    };
    // group.report and group.forget are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants]);

  const level = Math.max(own, group?.level ?? 0);
  return (
    <span ref={box} className="team-name" title={level > 0 ? name : undefined}>
      {/* invisible copies of every variant: their widths decide what fits */}
      {variants.map((v, i) => (
        <span key={i} data-variant className="team-name-full" aria-hidden="true">
          {v}
        </span>
      ))}
      {variants[level]}
    </span>
  );
}
