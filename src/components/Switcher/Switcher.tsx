import { motion, useReducedMotion } from "motion/react";
import { iosMotion } from "../../motion/iosMotion";
import styles from "./Switcher.module.css";

export type SwitcherState = "rest" | "pressed" | "disabled";

export interface SwitcherProps {
  selected?: boolean;
  /** Static visual state; an interactive switch also shows Pressed while held. */
  state?: SwitcherState;
  label?: string;
  className?: string;
  /** Opt into a controlled, accessible switch. Omit for passive artwork. */
  onSelectedChange?: (selected: boolean) => void;
}

/** C2 3326:52693. Static variants plus an opt-in interactive switch. */
export function Switcher({ selected = false, state = "rest", label, className, onSelectedChange }: SwitcherProps) {
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? iosMotion.instant : iosMotion.control;
  const rootClass = [styles.root, className].filter(Boolean).join(" ");

  if (onSelectedChange) return (
    <motion.button type="button" className={`${rootClass} ${styles.interactive}`}
      role="switch" aria-checked={selected} aria-label={label ?? "Switcher"}
      disabled={state === "disabled"} data-selected={selected} data-state={state}
      onClick={() => onSelectedChange(!selected)}
      initial={false} animate={state} whileTap={state === "rest" ? "pressed" : undefined}>
      <motion.span className={styles.thumb} aria-hidden="true" transition={transition}
        variants={{
          rest: { x: selected ? 16 : 0, width: 20 },
          pressed: { x: selected ? 12 : 0, width: 24 },
          disabled: { x: selected ? 16 : 0, width: 20 },
        }} />
    </motion.button>
  );

  return (
    <span className={rootClass}
      role="img" aria-label={label ?? `Switcher ${selected ? "on" : "off"}, ${state}`}
      data-selected={selected} data-state={state}>
      <span className={styles.thumb} aria-hidden="true" />
    </span>
  );
}
