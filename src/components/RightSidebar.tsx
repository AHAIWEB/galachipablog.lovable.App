import { mockDirectoryEntries } from "@/data/categories";

export default function RightSidebar() {
  return (
    <div className="space-y-4">
      {/* Directory Index */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2.5 bg-accent text-accent-foreground border-b border-border">
          <h3 className="font-heading font-bold text-sm">📂 ইনডেক্স লিস্ট</h3>
        </div>
        <div className="divide-y divide-border">
          {mockDirectoryEntries.map(entry => (
            <a key={entry.id} href="#" className="block p-3 hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium font-heading">{entry.name}</p>
              <span className="tag-directory mt-1 inline-block">{entry.category}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Business Card slider placeholder */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2.5 bg-primary text-primary-foreground border-b border-border">
          <h3 className="font-heading font-bold text-sm">🗂 বিজনেস কার্ড</h3>
        </div>
        <div className="p-4 text-center">
          <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center mb-3">
            <p className="text-xs text-muted-foreground font-heading">কার্ড স্লাইডার</p>
          </div>
          <p className="text-xs text-muted-foreground">
            ডিরেক্টরিতে সাবমিট করা কার্ডগুলো এখানে দেখা যাবে
          </p>
        </div>
      </div>
    </div>
  );
}
