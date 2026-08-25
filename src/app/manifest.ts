import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations";

  return {
    name: `${appName} — Church Operations Management System`,
    short_name: appName,
    description: "Attendance, service outcomes, and offerings — recorded, verified, reported.",
    start_url: "/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f1419",
    icons: [
      {
        src: "/brand/church-oms-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/church-oms-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
