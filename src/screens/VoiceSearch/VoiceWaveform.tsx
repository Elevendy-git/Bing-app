import { useLayoutEffect } from "react";
import { motion, useReducedMotion, useSpring, type MotionValue } from "motion/react";
import { iosMotion, iosVoiceWaveform } from "../../motion/iosMotion";
import styles from "./VoiceSearch.module.css";

const inputBars = [8, 12, 16, 10, 16, 8, 10, 16, 16, 12, 8, 10];
const barHeight = (level: number) => iosVoiceWaveform.restHeight
  + (iosVoiceWaveform.maxHeight - iosVoiceWaveform.restHeight) * (Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0);

/** Signal-driven visual feedback. Specimens retain their two supplied static states. */
export function VoiceWaveform({ levels, active = false, input = false }: {
  levels?: MotionValue<readonly number[]>;
  active?: boolean;
  input?: boolean;
}) {
  return <div className={styles.waveform} aria-hidden="true" data-voice-waveform>
    {inputBars.map((height, index) => <VoiceBar key={index} index={index} levels={levels} active={active}
      specimenHeight={input ? height : iosVoiceWaveform.restHeight} />)}
  </div>;
}

function VoiceBar({ levels, index, active, specimenHeight }: {
  levels?: MotionValue<readonly number[]>; index: number; active: boolean; specimenHeight: number;
}) {
  const reducedMotion = useReducedMotion();
  const height = useSpring(levels ? barHeight(levels.get()[index] ?? 0) : specimenHeight, iosMotion.voiceWaveform);
  useLayoutEffect(() => {
    if (!levels) { height.jump(specimenHeight); return; }
    if (reducedMotion) { height.jump(iosVoiceWaveform.restHeight); return; }
    // Keep the drawn pose through a modal cover/exit; a retarget resumes here.
    if (!active) { height.jump(height.get()); return; }
    const update = (values: readonly number[]) => height.set(barHeight(values[index] ?? 0));
    update(levels.get());
    return levels.on("change", update);
  }, [levels, active, reducedMotion, specimenHeight, height, index]);
  return <motion.span style={{ height }} />;
}
