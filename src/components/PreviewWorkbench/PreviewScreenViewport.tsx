import type { ReactNode } from "react";
import type { PreviewTheme } from "./PhonePreview";
import { PhoneFrame } from "./PhoneFrame";
import type { PreviewScreen } from "./previewTypes";

/** Gallery and enlarged view render the same logical mobile screen. */
export function PreviewScreenViewport({ screen, theme, scale, interactive = true, children }: {
  screen: PreviewScreen;
  theme: PreviewTheme;
  scale: number;
  interactive?: boolean;
  children?: ReactNode;
}) {
  return (
    <PhoneFrame theme={theme} scale={scale} label={`${screen.title} preview`}
      interactive={interactive} overlay={children}>
      {screen.content}
    </PhoneFrame>
  );
}
