import type { Meta, StoryObj } from "@storybook/react";
import { FeedCard } from "./FeedCard";

const meta = {
  title: "Consumer/Feed Card",
  component: FeedCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Figma nodes 3572:5631 (Light) and 3707:12385 (Dark) · 342 px wide · media is 318 × 178.875 px (16:9) with a 12 px top and side inset · five realistic variants: Single card, Watch, Multi-cards, Ads card, and Loading. Use the toolbar to switch themes. Multi-cards supports horizontal mouse/touch dragging, arrow keys, pagination controls, and a 12 px gap between slides.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["single", "watch", "multi", "ad", "loading"],
    },
    imageSrc: { control: false },
  },
} satisfies Meta<typeof FeedCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Type=Single card. */
export const Single: Story = {
  args: {
    variant: "single",
  },
};

/** Figma Type=Watch. */
export const Watch: Story = {
  args: {
    variant: "watch",
  },
};

/** Figma Type=Multi-cards. */
export const MultiCards: Story = {
  args: {
    variant: "multi",
  },
};

/** Figma Type=Ads card. */
export const AdsCard: Story = {
  args: {
    variant: "ad",
  },
};

/** Figma Type=Loading. */
export const Loading: Story = {
  args: {
    variant: "loading",
  },
};
