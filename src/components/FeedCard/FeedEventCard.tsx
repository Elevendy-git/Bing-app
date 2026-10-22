import { Calendar16Regular, Location16Regular } from "@fluentui/react-icons";
import cardStyles from "./FeedCard.module.css";
import styles from "./FeedEventCard.module.css";

export interface FeedEventCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  date: string;
  location: string;
}

/** The 160 × 276 event card used in Homepage's horizontal event row. */
export function FeedEventCard({ imageSrc, imageAlt, title, date, location }: FeedEventCardProps) {
  return (
    <article className={`${cardStyles.root} ${styles.root}`} aria-label={title}>
      <img className={styles.image} src={imageSrc} alt={imageAlt} loading="lazy" />
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.details}>
          <p><Calendar16Regular aria-hidden="true" /><span>{date}</span></p>
          <p><Location16Regular aria-hidden="true" /><span>{location}</span></p>
        </div>
      </div>
    </article>
  );
}
