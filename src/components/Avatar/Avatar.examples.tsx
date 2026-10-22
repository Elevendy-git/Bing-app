import { Avatar, type AvatarSize, type AvatarVariant } from "./Avatar";
import styles from "./Avatar.examples.module.css";

const variants = [
  { variant: "not-signed-in", title: "Not signed in" },
  { variant: "initials", title: "Initials" },
  { variant: "image", title: "Image" },
  { variant: "private", title: "Private mode" },
] as const satisfies readonly { variant: AvatarVariant; title: string }[];

/** Compact comparisons preserve native avatar dimensions and shared Library labels. */
export function AvatarVariants({ size = "default" }: { size?: AvatarSize }) {
  return (
    <div className={styles.comparison}>
      <div className={styles.variants} data-size={size} role="group" aria-label={`${size === "large" ? "64" : "40"} px avatars`}>
        {variants.filter(({ variant }) => size === "default" || variant !== "private").map(({ variant, title }) => (
          <div className={styles.variant} key={variant}>
            <span className={styles.label}>{title}</span>
            {variant === "private" ? <Avatar variant="private" /> : <Avatar variant={variant} size={size} />}
          </div>
        ))}
      </div>
    </div>
  );
}
