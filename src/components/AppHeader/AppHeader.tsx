import { Circle24Regular } from "@fluentui/react-icons";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";
import styles from "./AppHeader.module.css";

export interface AppHeaderAction extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label"> {
  /** Accessible name for the icon button. */
  label: string;
  /** Defaults to the Figma-connected Fluent Circle icon, in its 24 px size. */
  icon?: ReactNode;
}

export interface AppHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {
  title?: string;
  /** Set null to hide the leading control. */
  leftAction?: AppHeaderAction | null;
  /** Ordered trailing controls; the source has space for up to three. */
  rightActions?: readonly AppHeaderAction[];
  /** The source's optional bottom border is hidden by default. */
  showDivider?: boolean;
}

const DEFAULT_LEFT_ACTION: AppHeaderAction = { label: "Left action" };
const DEFAULT_RIGHT_ACTIONS: readonly AppHeaderAction[] = [{ label: "Right action" }];
const ACTION_WIDTH = 44;

function HeaderAction({ label, icon, className, ...buttonProps }: AppHeaderAction) {
  return (
    <button
      {...buttonProps}
      type="button"
      aria-label={label}
      className={[styles.action, className].filter(Boolean).join(" ")}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon ?? <Circle24Regular />}
      </span>
    </button>
  );
}

/** Transparent navigation title from Figma 4058:12091; the host owns its surface and width. */
export function AppHeader({
  title = "Title",
  leftAction = DEFAULT_LEFT_ACTION,
  rightActions = DEFAULT_RIGHT_ACTIONS,
  showDivider = false,
  className,
  style,
  ...headerProps
}: AppHeaderProps) {
  // Reserve equal space on both sides so asymmetric controls never shift the title.
  const controlsWidth = Math.max(leftAction ? 1 : 0, rightActions.length) * ACTION_WIDTH;
  const rootStyle = {
    "--gnrc-header-controls-width": `${controlsWidth}px`,
    ...style,
  } as CSSProperties;

  return (
    <header
      aria-label={`${title} header`}
      {...headerProps}
      className={[styles.root, showDivider && styles.divided, className].filter(Boolean).join(" ")}
      style={rootStyle}
    >
      <div className={styles.container}>
        <div className={styles.controls}>
          {leftAction && <HeaderAction {...leftAction} />}
        </div>
        <div className={styles.center}>
          {title && <h2 className={styles.title} title={title}>{title}</h2>}
        </div>
        <div className={styles.controls}>
          {rightActions.map((action, index) => <HeaderAction key={action.id ?? index} {...action} />)}
        </div>
      </div>
    </header>
  );
}
