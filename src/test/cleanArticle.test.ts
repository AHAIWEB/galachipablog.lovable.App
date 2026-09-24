import { describe, expect, it } from "vitest";
import { cleanArticleHtml, cleanArticleText } from "@/lib/cleanArticleHtml";

const sample = `<!DOCTYPE html><html><head><title>x</title></head><body>
<nav class="main-menu"><ul><li><a href="/">হোম</a></li><li><a href="/khela">খেলা</a></li></ul></nav>
<div class="share">শেয়ার করুন</div>
<article class="post-content">
<p>গলাচিপা উপজেলায় আজ সকালে একটি নতুন সেতুর উদ্বোধন করা হয়েছে। স্থানীয় বাসিন্দারা দীর্ঘদিন ধরে এই সেতুর দাবি জানিয়ে আসছিলেন বলে জানা গেছে। উদ্বোধনী অনুষ্ঠানে উপজেলা প্রশাসনের কর্মকর্তারা উপস্থিত ছিলেন।</p>
<p>সেতুটি চালু হওয়ায় চার গ্রামের কয়েক হাজার মানুষের যাতায়াত সহজ হবে বলে আশা করা হচ্ছে। প্রকল্পটির ব্যয় ধরা হয়েছে প্রায় দুই কোটি টাকা এবং কাজ শেষ হতে সময় লেগেছে দেড় বছর।</p>
<img src="//example.com/pic.jpg" alt="সেতু">
</article>
<div class="related"><p>আরও পড়ুন</p></div>
<footer id="site-footer">সর্বস্বত্ব সংরক্ষিত</footer>
</body></html>`;

describe("cleanArticleHtml", () => {
  const out = cleanArticleHtml(sample, "https://news.example.com/post/1");
  it("keeps article paragraphs", () => {
    expect(out).toContain("নতুন সেতুর উদ্বোধন");
    expect(out).toContain("দুই কোটি টাকা");
  });
  it("drops menu, share, related and footer noise", () => {
    for (const bad of ["হোম", "খেলা", "শেয়ার করুন", "আরও পড়ুন", "সর্বস্বত্ব সংরক্ষিত"]) {
      expect(out).not.toContain(bad);
    }
  });
  it("fixes protocol-relative images and strips scripts/styles", () => {
    expect(out).toContain('src="https://example.com/pic.jpg"');
    expect(out).not.toMatch(/<script|<style|class=/i);
  });
  it("cleans plain text too", () => {
    expect(cleanArticleText("বিজ্ঞাপন\nমূল খবর এখানে\nশেয়ার করুন")).toBe("মূল খবর এখানে");
  });
});
