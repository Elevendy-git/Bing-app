import type { Preview } from "@storybook/react";
import { createElement } from "react";
import "../src/styles";

const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: {
    theme: {
      description: "Bing App appearance",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) =>
      createElement(
        "div",
        {
          "data-product": "consumer",
          "data-theme": context.globals.theme,
        },
        createElement(Story),
      ),
  ],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ["Consumer"],
      },
    },
  },
};

export default preview;
