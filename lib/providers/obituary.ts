export type ObituarySignal = {
  fullName: string;
  city: string | null;
  publishedDate: string | null;
  sourceUrl: string;
  confidence: number;
};

type RssItem = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
};

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml))) {
    const block = match[1];
    const extract = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? stripTags(m[1]) : "";
    };

    const title = extract("title");
    const link = extract("link");
    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate: extract("pubDate") || undefined,
      description: extract("description") || undefined
    });
  }

  return items;
}

function extractCity(text: string): string | null {
  const southBay = ["San Jose", "Santa Clara", "Sunnyvale", "Campbell", "Cupertino"];
  const lower = text.toLowerCase();
  for (const city of southBay) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

function extractName(title: string): string {
  return title
    .replace(/\bobituary\b/gi, "")
    .replace(/\bremembering\b/gi, "")
    .replace(/[|\-–].*$/g, "")
    .trim();
}

export async function fetchObituarySignals(feedUrls: string[]): Promise<ObituarySignal[]> {
  const signals: ObituarySignal[] = [];

  await Promise.all(
    feedUrls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const xml = await res.text();
        const items = parseItems(xml).slice(0, 30);

        for (const item of items) {
          const mergedText = `${item.title} ${item.description ?? ""}`;
          signals.push({
            fullName: extractName(item.title),
            city: extractCity(mergedText),
            publishedDate: item.pubDate ?? null,
            sourceUrl: item.link,
            confidence: 0.45
          });
        }
      } catch {
        // Ignore one bad feed and continue processing others.
      }
    })
  );

  return signals;
}
