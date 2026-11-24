import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MV Staff Hub",
    short_name: "Staff Hub",
    description: "Action items, Monday's meeting, and requests for Mt Vernon Church staff.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#04354b",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
