import { useState } from "react";
import { PreviewConfigurator } from "../PreviewWorkbench/PreviewConfigurator";
import { FeedMenu } from "./FeedMenu";
import controls from "../PreviewWorkbench/PreviewConfigurator.module.css";

export function FeedMenuOverview() {
  const [following, setFollowing] = useState(false);
  const [kind, setKind] = useState<"publisher" | "topic">("topic");
  return <PreviewConfigurator label="Feed menu controls" controls={<>
    <label className={controls.field}><span className={controls.fieldLabel}>Type</span>
      <select className={controls.typeSelect} value={kind} onChange={event => setKind(event.target.value as typeof kind)}>
        <option value="topic">Topic</option><option value="publisher">Publisher</option>
      </select>
    </label>
    <label className={controls.field}><span className={controls.fieldLabel}>State</span>
      <select className={controls.typeSelect} value={following ? "following" : "not-following"} onChange={event => setFollowing(event.target.value === "following")}>
        <option value="not-following">Not following</option><option value="following">Following</option>
      </select>
    </label>
  </>}>
    <div className={controls.nativePreview} style={{ width: 390 }}>
      <FeedMenu followed={following} target={{ kind, name: kind === "topic" ? "FIFA World Cup" : "Medium" }} />
    </div>
  </PreviewConfigurator>;
}
