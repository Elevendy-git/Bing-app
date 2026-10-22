import { useState } from "react";
import { AppSearchBox, type AppSearchBoxState, type AppSearchBoxVariant } from "./AppSearchBox";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";

export function AppSearchBoxExample({ variant }: { variant: AppSearchBoxVariant }) {
  const [state, setState] = useState<AppSearchBoxState>("zero-input");
  const label = variant === "recent" ? "Recent page" : "Search page";
  return (
    <PreviewConfigurator label={`${label} search box controls`} controls={
      <label className={controls.field}>
        <span className={controls.fieldLabel}>State</span>
        <span className={controls.selectControl}>
          <select className={controls.typeSelect} aria-label={`${label} search box state`}
            value={state} onChange={(event) => setState(event.target.value as AppSearchBoxState)}>
            <option value="zero-input">Zero Input</option>
            <option value="focus">Focus</option>
            <option value="input">Input</option>
          </select>
          <svg className={controls.selectChevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
        </span>
      </label>
    }>
      <div className={controls.nativePreview}>
        <AppSearchBox variant={variant} state={state} value="Weather" />
      </div>
    </PreviewConfigurator>
  );
}

/** Loading is a static specimen; the screen supplies actual navigation events. */
export function IABSearchBoxExample() {
  const [loading, setLoading] = useState(false);
  return <PreviewConfigurator label="Search results search box controls" controls={
    <label className={controls.field}>
      <span className={controls.fieldLabel}>State</span>
      <span className={controls.selectControl}>
        <select className={controls.typeSelect} aria-label="Search results search box state"
          value={loading ? "loading" : "loaded"} onChange={event => setLoading(event.target.value === "loading")}>
          <option value="loaded">Loaded</option>
          <option value="loading">Loading</option>
        </select>
        <svg className={controls.selectChevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
      </span>
    </label>
  }>
    <div className={controls.nativePreview}>
      <AppSearchBox variant="serp" state="input" value="Weather" loadState={loading ? "loading" : undefined} />
    </div>
  </PreviewConfigurator>;
}
