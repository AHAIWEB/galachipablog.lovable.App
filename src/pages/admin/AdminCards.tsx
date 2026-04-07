import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export default function AdminCards() {
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_cards").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("business_cards").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cards"] });
      toast.success("আপডেট হয়েছে");
    },
  });

  const statusLabels = { pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত" };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">💳 বিজনেস কার্ড ম্যানেজমেন্ট</h1>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
      ) : cards && cards.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-heading font-bold">{card.name}</h3>
                  {card.title && <p className="text-xs text-muted-foreground">{card.title}</p>}
                  {card.organization && <p className="text-xs text-muted-foreground">{card.organization}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  card.status === "approved" ? "tag-blog" : card.status === "pending" ? "tag-news" : "tag-directory"
                }`}>
                  {statusLabels[card.status]}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                <p>📞 {card.phone}</p>
                {card.email && <p>✉ {card.email}</p>}
              </div>
              {card.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus.mutate({ id: card.id, status: "approved" })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium"
                  >
                    <Check className="h-3 w-3" /> অনুমোদন
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: card.id, status: "rejected" })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                  >
                    <X className="h-3 w-3" /> প্রত্যাখ্যান
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">এখনো কোনো কার্ড সাবমিশন নেই</p>
      )}
    </div>
  );
}
