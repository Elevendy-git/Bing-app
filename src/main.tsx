import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { canonicalMicrosoftOrigin } from "./auth/microsoftConfig";
import "./styles";

const canonicalUrl = canonicalMicrosoftOrigin(window.location.href);
if (canonicalUrl) window.location.replace(canonicalUrl);
else createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

