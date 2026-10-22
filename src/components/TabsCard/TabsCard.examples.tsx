import { useState } from "react";
import { TabsCard } from "./TabsCard";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";

/** One native-size preview with the same side controls as List Card. */
export function TabsCardOverview() {
  const [selected, setSelected] = useState(false);
  return (
    <PreviewConfigurator label="Tabs card controls" controls={
      <div className={controls.field}>
        <span className={controls.fieldLabel}>State</span>
        <div className={controls.modeSwitch} role="group" aria-label="Tab state">
          {([false, true] as const).map((value) => (
            <button key={String(value)} className={controls.modeButton} type="button"
              aria-pressed={selected === value} onClick={() => setSelected(value)}>
              {value ? "Selected" : "Rest"}
            </button>
          ))}
        </div>
      </div>
    }>
      <div className={controls.nativePreview} role="group" aria-label="Tabs card preview">
        <TabsCard selected={selected} />
      </div>
    </PreviewConfigurator>
  );
}
