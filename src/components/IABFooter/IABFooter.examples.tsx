import { useState } from "react";
import { PREVIEW_DEVICE } from "../PreviewWorkbench/previewDevice";
import { IABFooter } from "./IABFooter";

export function IABFooterOverview() {
  const [recentSelected, setRecentSelected] = useState(true);
  return <div style={{ width: PREVIEW_DEVICE.screenWidth }}>
    <IABFooter recentSelected={recentSelected} navigationLabel="IAB footer navigation" backLabel="Back"
      onBack={() => setRecentSelected(false)} onHome={() => setRecentSelected(false)}
      onRecent={() => setRecentSelected(true)} />
  </div>;
}
