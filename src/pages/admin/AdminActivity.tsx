import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminActivity() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">📋 অ্যাক্টিভিটি লগ</h1>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : logs && logs.length > 0 ? (
          <div className="divide-y divide-border">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    {log.entity_type && (
                      <p className="text-xs text-muted-foreground">
                        {log.entity_type} {log.entity_id && `#${log.entity_id.slice(0, 8)}`}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("bn-BD")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">এখনো কোনো অ্যাক্টিভিটি নেই</p>
        )}
      </div>
    </div>
  );
}
