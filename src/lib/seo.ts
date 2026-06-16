// Shared per-route head() metadata builder.
const SITE_URL = "https://clinic-for-life.lovable.app";
const SITE_NAME = "Núcleo For Life";

export function pageHead(opts: {
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article";
}) {
  const url = `${SITE_URL}${opts.path}`;
  const ogType = opts.ogType ?? "website";
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: ogType },
      { property: "og:site_name", content: SITE_NAME },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
