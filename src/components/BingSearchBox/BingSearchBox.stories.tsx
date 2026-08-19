import type { Meta, StoryObj } from "@storybook/react";
import { BingSearchBox } from "./BingSearchBox";

/**
 * Bing App homepage search box from Figma 775:47824 (Light) and 775:44984 (Dark).
 * Both appearances cover only the default/rest state and define no interaction effects.
 */
const meta = {
  title: "Consumer/Bing Search Box",
  component: BingSearchBox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Figma nodes 775:47824 (Light) and 775:44984 (Dark) · 358 × 64 px. Only the default/rest state is implemented.",
      },
    },
  },
  args: {
    placeholder: "Ask anything",
    ariaLabel: "Search Bing",
  },
  argTypes: {
    ariaLabel: { control: false },
  },
} satisfies Meta<typeof BingSearchBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default/rest state. Use the toolbar to switch between Light and Dark. */
export const Default: Story = {};
