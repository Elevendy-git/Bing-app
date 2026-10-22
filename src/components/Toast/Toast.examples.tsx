import { useState } from "react";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import { PREVIEW_DEVICE } from "../PreviewWorkbench/previewDevice";
import { Toast } from "./Toast";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";

export function ToastOverview() {
  const [followed, setFollowed] = useState(true);
  return <PreviewConfigurator label="Toast controls" controls={
    <label className={controls.field}><span className={controls.fieldLabel}>State</span>
      <select className={controls.typeSelect} value={followed ? "followed" : "unfollowed"} onChange={event => setFollowed(event.target.value === "followed")}>
        <option value="followed">Followed</option><option value="unfollowed">Unfollowed</option>
      </select>
    </label>
  }>
    <div className={controls.nativePreview} style={{ width: PREVIEW_DEVICE.screenWidth, paddingInline: "var(--gnrc-layout-toast-inset)", boxSizing: "border-box" }}>
      <Toast message={`You've ${followed ? "followed" : "unfollowed"} this channel`} actionLabel="Undo" />
    </div>
  </PreviewConfigurator>;
}
