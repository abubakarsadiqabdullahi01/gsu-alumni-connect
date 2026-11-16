import type { MetadataRoute } from "next";

/**
 * Lets a graduate keep the platform on their home screen.
 *
 * It matters most on iPhone, where there is no native build and "Add to Home
 * Screen" is the only app-like route available. Without this the shortcut
 * carries the page title and a screenshot of the tab instead of the crest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GSU Alumni Connect",
    short_name: "GSU Alumni",
    description:
      "The official alumni network for Gombe State University graduates.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#047857",
    icons: [
      {
        src: "/images/gsu-alumni-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
