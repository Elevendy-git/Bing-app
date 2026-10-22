import { motion, type Transition } from "motion/react";
import styles from "./Search.module.css";

const incognito = new URL("./assets/incognito.svg", import.meta.url).href;

/** Shareout 1:20456 / 1:20434. Centered in the screen, then raised above the keyboard. */
export function PrivateSearchIntro({ keyboardVisible, transition }: { keyboardVisible: boolean; transition: Transition }) {
  return (
    <motion.section className={styles.privateIntro} aria-label="InPrivate Search"
      initial={false} animate={{ x: keyboardVisible ? -1 : 0, y: keyboardVisible ? 14 : -22 }} transition={transition}>
      <img src={incognito} className={styles.privateIcon} alt="" />
      <h1>InPrivate Search</h1>
      <div className={styles.privateExplanation}>
        <p>When you search in InPrivate mode, your searches aren’t saved to Bing history, location results are based only on your IP, and any data that could identify your account or device is removed.</p>
        <p>Closing private tabs, or restarting the app, will clear InPrivate searches from the app.</p>
      </div>
      <p className={styles.privacyStatement}>Microsoft privacy statement</p>
    </motion.section>
  );
}
