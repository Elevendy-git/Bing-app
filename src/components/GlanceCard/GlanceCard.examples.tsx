import { GlanceCard, type GlanceSportsState } from "./GlanceCard";
import styles from "./GlanceCard.examples.module.css";

export const SPORTS_GLANCE_STATES = [
  { state: "cold-start", title: "Cold start" },
  { state: "upcoming", title: "Upcoming" },
  { state: "live", title: "Live" },
  { state: "final", title: "Final" },
] as const satisfies readonly { state: GlanceSportsState; title: string }[];

/** Library comparison keeps all lifecycle states visible at their native dimensions. */
export function SportsGlanceStates() {
  return (
    <div className={styles.comparison}>
      <div className={styles.states} role="group" aria-label="Sports states">
        {SPORTS_GLANCE_STATES.map(({ state, title }) => (
          <div className={styles.state} key={state}>
            <span className={styles.label}>{title}</span>
            <GlanceCard variant="sports" sportsState={state} />
          </div>
        ))}
      </div>
    </div>
  );
}
