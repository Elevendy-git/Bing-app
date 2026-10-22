import { useState } from "react";
import { Switcher } from "./Switcher";

export const SWITCHER_STATES = [
  { value: "rest", label: "Rest" },
  { value: "pressed", label: "Pressed" },
  { value: "disabled", label: "Disabled" },
] as const;

export const SWITCHER_VARIANTS = SWITCHER_STATES.flatMap(({ value: state, label }) =>
  [false, true].map((selected) => ({
    id: `${state}-${selected ? "on" : "off"}`,
    title: `${label} · ${selected ? "On" : "Off"}`,
    state,
    selected,
  })),
);

export function SwitcherOverview() {
  const [selected, setSelected] = useState(false);
  return (
    <div role="group" aria-label="Switcher preview">
      <Switcher selected={selected} onSelectedChange={setSelected} />
    </div>
  );
}
