/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

const SITE_URL = "https://dot-matrix-animations.vercel.app/";
const SITE_TITLE = "dot/matrix, a library of 28 quiet loaders";
const SITE_DESCRIPTION =
  "28 hand-designed 5×5 dot-matrix loader animations. Standalone animated SVGs (~4 KB each) and a React component. No JS runtime, no GIFs, agent-themed patterns for AI loading states.";
const OG_IMAGE = `${SITE_URL}og-image.png`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "dot/matrix",
  description:
    "28 hand-designed 5×5 dot-matrix loader animations as standalone animated SVGs and a React component.",
  url: SITE_URL,
  codeRepository: "https://github.com/icantcodefyi/dot-matrix-animations",
  programmingLanguage: ["TypeScript", "Python", "SVG", "CSS"],
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Person",
    name: "icantcodefyi",
    url: "https://github.com/icantcodefyi",
  },
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "loaders, loading animations, dot matrix, SVG loaders, CSS loaders, AI agent loaders, React loaders, spinner, progress indicator",
      },
      { name: "author", content: "icantcodefyi" },
      { name: "theme-color", content: "#1c1b18" },
      { name: "color-scheme", content: "dark" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "dot/matrix, a small library of quiet loaders",
      },
      { property: "og:site_name", content: "dot/matrix" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      {
        name: "twitter:description",
        content:
          "28 hand-designed 5×5 dot-matrix loader animations. ~4 KB each, no JS runtime.",
      },
      { name: "twitter:image", content: OG_IMAGE },
      {
        name: "twitter:image:alt",
        content: "dot/matrix, a small library of quiet loaders",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Geist+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(JSON_LD),
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
