import { useState } from "react";
import { IOSStatusBar } from "../IOSStatusBar";
import { IOS_STATUS_BAR_EXAMPLES } from "../IOSStatusBar/IOSStatusBar.examples";
import { IOSKeyboard, type IOSKeyboardLayout, type IOSKeyboardReturnKey } from "../IOSKeyboard/IOSKeyboard";
import { IOSHomeIndicator } from "../IOSHomeIndicator";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import { PREVIEW_DEVICE } from "../PreviewWorkbench/previewDevice";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";
import styles from "./IOSNative.examples.module.css";

type Option = readonly [string, string];
function SelectControl({ label, value, options, onChange }: {
  label: string; value: string; options: readonly Option[]; onChange: (value: string) => void;
}) {
  return <label className={controls.field}>
    <span className={controls.fieldLabel}>{label}</span>
    <span className={controls.selectControl}>
      <select className={controls.typeSelect} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <svg className={controls.selectChevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
    </span>
  </label>;
}

export function IOSStatusBarOverview() {
  const [variant, setVariant] = useState("phone");
  const example = IOS_STATUS_BAR_EXAMPLES.find(({ id }) => id === variant)!;
  return <PreviewConfigurator label="iOS Status Bar controls" controls={<>
    <SelectControl label="State" value={variant} onChange={setVariant} options={[
      ["phone", "Default"], ["compact", "Compact Live Activity"], ["expanded", "Expanded Live Activity"],
    ]} />
  </>}>
    <div className={`${styles.preview} ${styles.status}`} style={{ width: PREVIEW_DEVICE.screenWidth }} data-activity={variant !== "phone"}>
      <IOSStatusBar {...example.props} showDynamicIsland />
    </div>
  </PreviewConfigurator>;
}

export function IOSKeyboardOverview() {
  const [layout, setLayout] = useState<IOSKeyboardLayout>("uppercase");
  const [returnKey, setReturnKey] = useState<IOSKeyboardReturnKey>("return");
  const [suggestions, setSuggestions] = useState(true);
  const [indicator, setIndicator] = useState(true);
  return <PreviewConfigurator label="iOS Keyboard controls" controls={<>
    <SelectControl label="Keyboard type" value={layout} onChange={(next) => setLayout(next as IOSKeyboardLayout)}
      options={[["uppercase", "Uppercase"], ["lowercase", "Lowercase"], ["numeric", "Numbers"], ["symbols", "Symbols"], ["emoji", "Emoji"]]} />
    <SelectControl label="Return key" value={returnKey} onChange={(next) => setReturnKey(next as IOSKeyboardReturnKey)}
      options={[["return", "Return"], ["search", "Search"], ["done", "Done"]]} />
    <SelectControl label="Suggestions" value={String(suggestions)} onChange={(next) => setSuggestions(next === "true")}
      options={[["true", "Visible"], ["false", "Hidden"]]} />
    <SelectControl label="Home indicator" value={String(indicator)} onChange={(next) => setIndicator(next === "true")}
      options={[["true", "Visible"], ["false", "Hidden"]]} />
  </>}>
    <div className={`${styles.preview} ${styles.keyboard}`} style={{ width: PREVIEW_DEVICE.screenWidth }}>
      <IOSKeyboard layout={layout} returnKey={returnKey} showSuggestions={suggestions} showHomeIndicator={indicator} />
    </div>
  </PreviewConfigurator>;
}

export function IOSHomeIndicatorOverview() {
  const [visible, setVisible] = useState(true);
  return <PreviewConfigurator label="iOS Home Indicator controls" controls={<>
    <SelectControl label="Indicator" value={String(visible)} onChange={(next) => setVisible(next === "true")}
      options={[["true", "Visible"], ["false", "Hidden"]]} />
  </>}>
    <div className={`${styles.preview} ${styles.home}`} style={{ width: PREVIEW_DEVICE.screenWidth }}>
      <IOSHomeIndicator visible={visible} />
    </div>
  </PreviewConfigurator>;
}
