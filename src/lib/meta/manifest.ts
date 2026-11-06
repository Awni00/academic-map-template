import { manifestIconSizes } from "./icons";

/**
 * The web app manifest (`/site.webmanifest`).
 *
 * It gives "Add to home screen" on Android and desktop Chrome a proper name and
 * icon. `display: "browser"` keeps the site an ordinary website when opened
 * from the home screen, with the address bar and tabs, rather than posing as
 * an app.
 */
export function webManifest(options: {
  title: string;
  name: string;
  description: string;
  backgroundColor: string;
  themeColor: string;
}) {
  return {
    name: options.title,
    short_name: options.name,
    description: options.description,
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: options.backgroundColor,
    theme_color: options.themeColor,
    icons: manifestIconSizes.map((size) => ({
      src: `/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png"
    }))
  };
}
