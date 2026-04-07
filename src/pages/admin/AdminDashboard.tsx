import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, CreditCard, Eye } from "lucide-react";

export default function AdminDashboard() {
  const { data: postCount } = useQuery({
    queryKey: ["admin-post-count"],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: cardCount } = useQuery({
    queryKey: ["admin-card-count"],
    queryFn: async () => {
      const { count } = await supabase.from("business_cards").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: categoryCount } = useQuery({
    queryKey: ["admin-category-count"],
    queryFn: async () => {
      const { count } = await supabase.from("categories").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const stats = [
    { label: "মোট পোস্ট", value: postCount ?? 0, icon: FileText, color: "bg-primary" },
    { label: "ক্যাটাগরি", value: categoryCount ?? 0, icon: Users, color: "bg-secondary" },
    { label: "বিজনেস কার্ড", value: cardCount ?? 0, icon: CreditCard, color: "bg-accent" },
    { label: "ভিজিটর", value: "—", icon: Eye, color: "bg-muted" },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📊 ড্যাশবোর্ড</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className={`inline-flex p-2 rounded-lg ${s.color} text-primary-foreground mb-2`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-heading font-semibold">সর্বশেষ অ্যাক্টিভিটি</h2>
        </div>
        <div className="divide-y divide-border">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map(a => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{a.action}</span>
                {a.entity_type && (
                  <span className="text-muted-foreground"> — {a.entity_type}</span>
                )}
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {new Date(a.created_at).toLocaleString("bn-BD")}
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">এখনো কোনো অ্যাক্টিভিটি নেই</p>
          )}
        </div>
      </div>
    </div>
  );
}
