import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ShieldCheck } from "lucide-react";

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ userId, is_verified }: { userId: string; is_verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_verified }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("আপডেট হয়েছে");
    },
  });

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">👥 ইউজার ম্যানেজমেন্ট</h1>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">নাম</th>
                <th className="text-left px-4 py-2 font-medium">ভেরিফাইড</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles?.map(p => (
                <tr key={p.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {p.display_name || "—"}
                      {p.is_verified && <ShieldCheck className="h-4 w-4 text-secondary" />}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.is_verified ? "✅" : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleVerified.mutate({ userId: p.user_id, is_verified: !p.is_verified })}
                      className="p-1.5 hover:bg-muted rounded"
                      title={p.is_verified ? "ভেরিফিকেশন বাতিল" : "ভেরিফাই করুন"}
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
