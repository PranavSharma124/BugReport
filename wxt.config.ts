import { defineConfig } from "wxt";

// See https://wxt.dev/api/config
// @wxt-dev/module-react enables JSX transforms for WXT — listed in devDependencies.
export default defineConfig({
  srcDir: "src",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "BugLens",
    description: "Create structured bug reports from any webpage.",
    version: "0.1.0",
    permissions: [
      // Required to query and identify the active tab's URL and title.
      // "tabs" gives access to tab.url and tab.title without needing <all_urls>.
      "tabs",
      // Required to execute a content script on-demand (to retrieve selected text).
      // We use scripting + activeTab together so we never need broad host permissions.
      "scripting",
      // Grants temporary access to the CURRENT active tab only — no persistent
      // host permission is needed. Combined with "scripting" this is the narrowest
      // possible permission set for reading selected text.
      "activeTab",
      // Required for Person B's "Copy Markdown" export action.
      "clipboardWrite"
    ]
  }
});
