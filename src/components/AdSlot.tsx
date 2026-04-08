import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AdSlotProps = {
  placement: string;
  limit?: number;
  className?: string;
};

async function trackView(adId: string) {
  await supabase.rpc("increment_ad_view", { ad_id: adId }).catch(() => {});
}

async function trackClick(adId: string) {
  await supabase.rpc("increment_ad_click", { ad_id: adId }).catch(() => {});
}

function AdItem({ ad }: { ad: any }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackView(ad.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ad.id]);

  const handleClick = useCallback(() => {
    trackClick(ad.id);
  }, [ad.id]);

  return (
    <a
      ref={ref}
      href={ad.link_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.name} className="w-full" />
      ) : (
        <div className="p-3 bg-muted/30 text-sm text-center" dangerouslySetInnerHTML={{ __html: ad.content }} />
      )}
    </a>
  );
}

export default function AdSlot({ placement, limit = 3, className }: AdSlotProps) {
  const { data: ads = [] } = useQuery({
    queryKey: ["ads", placement],
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .eq("placement", placement)
        .limit(limit);
      return data ?? [];
    },
    staleTime: 60000,
  });

  if (ads.length === 0) return null;

  return (
    <div className={className}>
      {ads.map((ad: any) => (
        <AdItem key={ad.id} ad={ad} />
      ))}
    </div>
  );
}
