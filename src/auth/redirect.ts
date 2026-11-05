import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

// Dedicated bridge only: no React, workbench, router, MSAL instance or authentication logs here.
void broadcastResponseToMainFrame().catch(() => {
  const status = document.getElementById("status");
  if (status) status.textContent = "Return to Bing App and try signing in again. You can close this window.";
});
