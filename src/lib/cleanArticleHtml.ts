import DOMPurify from "dompurify";

/**
 * স্ক্র্যাপ করা পোস্ট থেকে শুধু মূল লেখা (+ ছবি) রাখে।
 * মেনু, শেয়ার বার, "আরও পড়ুন", বিজ্ঞাপন, ফুটার, ট্যাগ ইত্যাদি বাদ দেয়।
 */

const NOISE_SELECTOR = [
  "nav", "header", "footer", "aside", "form", "script", "style", "noscript",
  "iframe", "button", "input", "select", "textarea", "svg", "video", "audio",
  "[role=navigation]", "[role=banner]", "[role=complementary]", "[role=search]",
  "[hidden]", "[aria-hidden=true]",
].join(",");

const NOISE_WORDS = [
  "menu", "nav", "sidebar", "side-bar", "footer", "header", "share", "social",
  "related", "recommend", "comment", "breadcrumb", "widget", "toolbar", "advert",
  "ads", "adsbygoogle", "banner", "subscribe", "newsletter", "popup", "modal",
  "cookie", "tags", "tag-list", "author-box", "meta", "pagination", "trending",
  "most-read", "popular", "newsbox", "topbar", "search", "login", "print",
  "navbox", "metadata", "ambox", "reflist", "mw-editsection", "hatnote",
  "sistersitebox", "noprint", "catlinks", "mw-references",
];

const NOISE_TEXT = [
  "শেয়ার করুন", "শেয়ার", "আরও পড়ুন", "আরো পড়ুন", "আরও দেখুন", "সম্পর্কিত খবর",
  "সর্বশেষ খবর", "জনপ্রিয়", "মন্তব্য করুন", "মতামত দিন", "বিজ্ঞাপন",
  "ফেসবুকে আমরা", "ফলো করুন", "সাবস্ক্রাইব", "ট্যাগ:", "সব খবর",
  "প্রিন্ট করুন", "কপি করুন", "হোম", "প্রচ্ছদ", "লগইন", "নিবন্ধন",
  "advertisement", "read more", "share this", "follow us", "subscribe",
  "related articles", "leave a comment", "sign in", "log in", "tags:",
];

function isNoisyAttr(el: Element) {
  const hay = `${el.getAttribute("class") ?? ""} ${el.getAttribute("id") ?? ""}`.toLowerCase();
  if (!hay.trim()) return false;
  return NOISE_WORDS.some((w) => hay.includes(w));
}

function isNoisyText(text: string) {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 120) return false;
  return NOISE_TEXT.some((w) => t.includes(w.toLowerCase()));
}

function linkDensity(el: Element) {
  const total = (el.textContent ?? "").replace(/\s+/g, " ").trim().length;
  if (!total) return 1;
  let linked = 0;
  el.querySelectorAll("a").forEach((a) => {
    linked += (a.textContent ?? "").trim().length;
  });
  return linked / total;
}

function pickMainContainer(root: Element): Element {
  const candidates = Array.from(
    root.querySelectorAll("article, main, [role=main], .post-content, .entry-content, .article-body, .mw-parser-output, div, section")
  );
  let best: Element | null = null;
  let bestScore = 0;
  for (const el of candidates) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 300) continue;
    const paragraphs = el.querySelectorAll("p").length;
    const score = text.length * (1 + paragraphs * 0.05) * (1 - Math.min(0.9, linkDensity(el)));
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  const rootText = (root.textContent ?? "").trim().length;
  if (best && (best.textContent ?? "").trim().length > rootText * 0.35) return best;
  return root;
}

function resolveImages(scope: Element, base: string | null) {
  scope.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (!src) {
      img.remove();
      return;
    }
    let final = src;
    if (final.startsWith("//")) final = `https:${final}`;
    else if (final.startsWith("/") && base) final = `${base}${final}`;
    img.setAttribute("src", final);
    img.setAttribute("loading", "lazy");
    img.removeAttribute("srcset");
    if (!img.getAttribute("alt")) img.setAttribute("alt", "");
  });
}

export function cleanArticleHtml(raw: string, sourceUrl?: string | null): string {
  if (!raw) return "";

  let base: string | null = null;
  try {
    if (sourceUrl) base = new URL(sourceUrl).origin;
  } catch {
    /* ignore */
  }

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const body = doc.body;
  if (!body) return "";

  // 1) স্পষ্ট noise ট্যাগ বাদ
  body.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());

  // 2) class/id অনুযায়ী noise ব্লক বাদ
  Array.from(body.querySelectorAll("*")).forEach((el) => {
    if (el.isConnected && isNoisyAttr(el)) el.remove();
  });

  // 3) মূল কন্টেন্ট কনটেইনার বেছে নেওয়া
  const main = pickMainContainer(body);

  // 4) লিংক-ঘন তালিকা (মেনু/রিলেটেড) ও noise লেখা বাদ
  Array.from(main.querySelectorAll("ul, ol, div, p, span, table, h1, h2, h3, h4, h5, h6")).forEach((el) => {
    if (!el.isConnected) return;
    const text = (el.textContent ?? "").trim();
    if (isNoisyText(text) && el.querySelectorAll("p, img").length === 0) {
      el.remove();
      return;
    }
    if ((el.tagName === "UL" || el.tagName === "OL") && text.length > 0 && linkDensity(el) > 0.7) {
      el.remove();
    }
  });

  // 5) খালি নোড পরিষ্কার
  Array.from(main.querySelectorAll("p, div, span, li, section")).forEach((el) => {
    if (!el.isConnected) return;
    if (!(el.textContent ?? "").trim() && el.querySelectorAll("img").length === 0) el.remove();
  });

  resolveImages(main, base);

  // 6) অবশিষ্ট অ্যাট্রিবিউট হালকা করা
  main.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    el.removeAttribute("class");
    el.removeAttribute("id");
  });

  const html = main.innerHTML.replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br /><br />").trim();

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button", "object", "embed", "svg"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover", "srcset"],
  });
}

/** প্লেইন টেক্সট কন্টেন্ট থেকেও noise লাইন বাদ দেয় */
export function cleanArticleText(raw: string): string {
  return raw
    .split(/\n+/)
    .filter((line) => line.trim() && !isNoisyText(line))
    .join("\n\n")
    .trim();
}
