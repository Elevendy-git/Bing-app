import { FeedCard, FeedEventCard, type FeedCardItem, type FeedEventCardProps, type FeedMoreOptionsHandler } from "../../components/FeedCard";
import styles from "./Homepage.module.css";

const beach = new URL("./assets/feed-beach.png", import.meta.url).href;
const technology = new URL("./assets/feed-technology.png", import.meta.url).href;
const ad = new URL("./assets/feed-ad.png", import.meta.url).href;
const forgiveness = new URL("./assets/feed-forgiveness.png", import.meta.url).href;
const medium = new URL("./assets/medium.svg", import.meta.url).href;
const yahoo = new URL("./assets/yahoo.svg", import.meta.url).href;
const styleEvent = new URL("./assets/event-style.png", import.meta.url).href;
const designEvent = new URL("./assets/event-design.png", import.meta.url).href;
const innovationEvent = new URL("./assets/event-innovation.png", import.meta.url).href;

const technologyStory: FeedCardItem = {
  imageSrc: technology,
  imageAlt: "Colorful illustration of shoes stepping over a banana peel",
  publisher: "Medium",
  publisherLogoSrc: medium,
  elapsedTime: "31m",
  title: "How Emerging Technologies are Reshaping the Future of Work How Emerging Technologies are Reshaping the Future of Work",
};

// Figma supplies one article and five pagination positions; retain that fixture
// in each position until distinct carousel stories are supplied.
const technologySlides = Array.from({ length: 5 }, () => technologyStory);
const events: FeedEventCardProps[] = [
  { imageSrc: styleEvent, imageAlt: "Creative event artwork", title: "Celebrating Style: The Creative Voyage", date: "May 25, 7:00 PM", location: "Apollo Theater" },
  { imageSrc: designEvent, imageAlt: "Design event artwork", title: "Crafting the Future: The Design Journey", date: "Sept 19, 9:00 PM", location: "Central Library" },
  { imageSrc: innovationEvent, imageAlt: "Innovation event artwork", title: "Innovative Living: A Design Revolution", date: "Oct 03, 7:30 PM", location: "Innovation Center" },
  { imageSrc: designEvent, imageAlt: "Design event artwork", title: "Crafting the Future: The Design Journey", date: "June 12, 8:30 PM", location: "Riverfront Park" },
];

export function HomepageFeed({ onMoreOptions }: { onMoreOptions?: FeedMoreOptionsHandler }) {
  return (
    <section className={styles.feed} aria-label="Home feed">
      <FeedCard className={styles.feedCard} mediaAspectRatio={312 / 172} onMoreOptions={onMoreOptions}
        imageSrc={beach} imageAlt="Two blue chairs overlooking the beach"
        publisher="Medium" publisherLogoSrc={medium} elapsedTime="31m"
        title="Why UX Designers Are Shifting Away From Their Careers" />
      <FeedCard className={styles.feedCard} mediaAspectRatio={312 / 172} onMoreOptions={onMoreOptions}
        variant="multi" {...technologyStory} slides={technologySlides} />
      <FeedCard className={styles.feedCard} mediaAspectRatio={312 / 172}
        variant="ad" imageSrc={ad} imageAlt="Colorful collectible characters on a surreal landscape"
        publisher="Reddit" elapsedTime="2h" title="How Emerging Technologies are Reshaping the Future of Work" />
      <section className={styles.events} aria-label="Upcoming events" tabIndex={0}>
        {events.map((event) => <FeedEventCard key={event.location} {...event} />)}
      </section>
      <FeedCard className={styles.feedCard} mediaAspectRatio={312 / 172}
        imageSrc={forgiveness} imageAlt="Forest landscape accompanying an article about interface design"
        onMoreOptions={onMoreOptions}
        publisher="Yahoo!" publisherLogoSrc={yahoo} elapsedTime="31m"
        title="Designing for forgiveness- How to create 3herror-tolerant interfaces" />
    </section>
  );
}
