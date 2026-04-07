import { mockPosts } from "@/data/categories";

const gridPosts = mockPosts.slice(2, 8);

const sizeClasses = [
  "row-span-2",
  "",
  "row-span-2",
  "",
  "",
  "row-span-2",
];

export default function PinterestGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[140px]">
      {gridPosts.map((post, i) => (
        <a
          key={post.id}
          href="#"
          className={`relative rounded-lg overflow-hidden group ${sizeClasses[i] || ""}`}
        >
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute top-2 left-2">
            <span className={post.type === "news" ? "tag-news" : "tag-blog"}>
              {post.category}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-xs md:text-sm font-heading font-semibold text-card leading-tight">
              {post.title}
            </h3>
          </div>
        </a>
      ))}
    </div>
  );
}
