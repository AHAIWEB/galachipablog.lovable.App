import { useState } from "react";
import { mockPosts } from "@/data/categories";

const tabs = [
  { id: "latest", label: "সর্বশেষ" },
  { id: "news", label: "খবর" },
  { id: "blog", label: "ব্লগ" },
] as const;

export default function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<string>("latest");

  const filtered = activeTab === "latest"
    ? mockPosts
    : mockPosts.filter(p => p.type === activeTab);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-heading font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="divide-y divide-border">
        {filtered.map(post => (
          <a key={post.id} href="#" className="block p-3 hover:bg-muted/50 transition-colors group">
            <h4 className="text-sm font-heading font-medium leading-snug group-hover:text-primary transition-colors">
              {post.title}
            </h4>
            <span className={post.type === "news" ? "tag-news mt-1.5 inline-block" : "tag-blog mt-1.5 inline-block"}>
              {post.category}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
