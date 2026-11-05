import { IOSHomeIndicator } from "../../components/IOSHomeIndicator";
import { IOSStatusBar } from "../../components/IOSStatusBar";
import { VoiceSearch } from "./VoiceSearch";
import { VoiceLanguageSheet } from "./VoiceLanguageSheet";
import styles from "./VoiceSearch.module.css";

/** Passive Key screen uses the same surfaces as the interactive flow. */
export function VoiceLanguagePreview() {
  return <div className={styles.root}>
    <VoiceSearch hideSystemChrome />
    <VoiceLanguageSheet />
    <div className={styles.systemChrome} aria-hidden="true"><IOSStatusBar /><IOSHomeIndicator placement="overlay" /></div>
  </div>;
}
