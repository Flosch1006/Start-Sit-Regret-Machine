import { useState } from "react";
import type { Team } from "../lib/types";

interface Props {
  team: Team | undefined;
  /** pixel size of the square logo */
  size?: number;
}

/**
 * The Fantrax team logo, or the team emoji when there is no logo or it fails to
 * load. Decorative: the team name always stands next to it.
 */
export function TeamLogo({ team, size = 48 }: Props) {
  const [failed, setFailed] = useState(false);
  if (team?.logo && !failed) {
    return (
      <img
        className="logo"
        src={team.logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span aria-hidden="true">{team?.emoji ?? ""}</span>;
}
