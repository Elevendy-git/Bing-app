import { useState } from "react";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import { TabsMenu } from "./TabsMenu";
import { HistoryMenu } from "./HistoryMenu";
import { BookmarkMenu } from "./BookmarkMenu";
import { BrowserMenu } from "../BrowserMenu";
import { PREVIEW_DEVICE } from "../PreviewWorkbench/previewDevice";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";

/** One passive menu preview; variants are selected from the workbench controls. */
export function MenuListOverview() {
  const [variant, setVariant] = useState("tabs");
  return <PreviewConfigurator label="Menu controls" controls={
    <label className={controls.field}>
      <span className={controls.fieldLabel}>Type</span>
      <span className={controls.selectControl}>
        <select className={controls.typeSelect} value={variant} onChange={event => setVariant(event.target.value)}>
          <option value="tabs">Tabs</option>
          <option value="history">History</option>
          <option value="history-item">History item</option>
          <option value="bookmark">Bookmark</option>
          <option value="bookmark-item">Bookmark item</option>
          <option value="browser-serp">Search results</option>
          <option value="browser-webpage">Webpage</option>
        </select>
        <svg className={controls.selectChevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
      </span>
    </label>
  }>
    <div className={controls.nativePreview} style={variant.startsWith("browser") ? { width: PREVIEW_DEVICE.screenWidth - 12 } : undefined}>
      {variant.startsWith("browser") ? <BrowserMenu variant={variant === "browser-serp" ? "serp" : "webpage"} />
        : variant === "tabs" ? <TabsMenu /> : variant.startsWith("bookmark")
        ? <BookmarkMenu variant={variant === "bookmark" ? "page" : "item"} />
        : <HistoryMenu variant={variant === "history" ? "page" : "item"} />}
    </div>
  </PreviewConfigurator>;
}
