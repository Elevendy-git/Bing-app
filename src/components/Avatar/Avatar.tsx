import { Incognito24Filled, Person24Filled, Person28Filled } from "@fluentui/react-icons";
import { useState, type HTMLAttributes } from "react";
import styles from "./Avatar.module.css";

const defaultImage = new URL("./assets/avatar.jpeg", import.meta.url).href;

export type AvatarSize = "default" | "large";
export type AvatarVariant = "not-signed-in" | "initials" | "image" | "private";

interface AvatarContentProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The letters to display; the source uses “D”. */
  initials?: string;
  /** Image variants default to the original Figma artwork. */
  imageSrc?: string;
  /** Account hosts can fall back to their name/email initial if a photo fails. */
  fallbackInitials?: string;
  /** Accessible description, such as the person's name. */
  label?: string;
}

export type AvatarProps = AvatarContentProps & (
  | { variant?: Exclude<AvatarVariant, "private">; size?: AvatarSize }
  | { variant: "private"; size?: "default" }
);

/** C2 Avatar 3312:51594. A visual identity; the host supplies any button or link. */
export function Avatar({
  variant = "not-signed-in",
  size = "default",
  initials = "D",
  imageSrc = defaultImage,
  fallbackInitials,
  label,
  className,
  ...props
}: AvatarProps) {
  const [failedImage, setFailedImage] = useState<string>();
  if (variant === "image" && fallbackInitials && failedImage === imageSrc) {
    variant = "initials";
    initials = fallbackInitials;
  }
  // Controls or JavaScript callers can bypass the union; the source's private avatar is 40 px only.
  const avatarSize = variant === "private" ? "default" : size;
  const accessibleLabel = label ?? {
    "not-signed-in": "Not signed in",
    initials: `Avatar ${initials}`,
    image: "Profile avatar",
    private: "Private mode",
  }[variant];

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      {...props}
      data-variant={variant}
      data-size={avatarSize}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      {variant === "image" ? (
        <img className={styles.image} src={imageSrc} alt="" draggable={false} onError={() => setFailedImage(imageSrc)} />
      ) : variant === "initials" ? (
        <span className={styles.initials} aria-hidden="true">{initials}</span>
      ) : variant === "private" ? (
        <Incognito24Filled className={styles.icon} aria-hidden="true" />
      ) : avatarSize === "large" ? (
        <Person28Filled className={styles.icon} aria-hidden="true" />
      ) : (
        <Person24Filled className={styles.icon} aria-hidden="true" />
      )}
    </span>
  );
}
