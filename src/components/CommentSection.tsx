import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Heart, Reply, Trash2, Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  liked_by_me?: boolean;
  replies?: Comment[];
};

export default function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data: allComments, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set((allComments || []).map(c => c.user_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", { _user_ids: userIds });

      // Check which comments user has liked
      let myLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id);
        myLikes = (likes || []).map(l => l.comment_id);
      }

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Build tree
      const topLevel: Comment[] = [];
      const replyMap = new Map<string, Comment[]>();

      for (const c of allComments || []) {
        const comment: Comment = {
          ...c,
          profile: profileMap.get(c.user_id) || null,
          liked_by_me: myLikes.includes(c.id),
          replies: [],
        };
        if (c.parent_id) {
          if (!replyMap.has(c.parent_id)) replyMap.set(c.parent_id, []);
          replyMap.get(c.parent_id)!.push(comment);
        } else {
          topLevel.push(comment);
        }
      }

      for (const c of topLevel) {
        c.replies = replyMap.get(c.id) || [];
      }

      return topLevel;
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error("লগইন করুন");
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        parent_id: parentId || null,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      setNewComment("");
      setReplyTo(null);
      setReplyText("");
      toast.success("কমেন্ট যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("কমেন্ট মুছে ফেলা হয়েছে");
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user) throw new Error("লগইন করুন");
      if (liked) {
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", postId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleReplies = (id: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    const days = Math.floor(hrs / 24);
    return `${days} দিন আগে`;
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? "ml-6 md:ml-10 border-l-2 border-border pl-4" : ""}`}>
      <div className="flex gap-3 py-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {comment.profile?.display_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{comment.profile?.display_name || "অজানা"}</span>
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => toggleLike.mutate({ commentId: comment.id, liked: !!comment.liked_by_me })}
              className={`flex items-center gap-1 text-xs transition-colors ${comment.liked_by_me ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${comment.liked_by_me ? "fill-current" : ""}`} />
              {comment.likes_count > 0 && comment.likes_count}
            </button>
            {!isReply && (
              <button
                onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="h-3.5 w-3.5" /> রিপ্লাই
              </button>
            )}
            {user && (user.id === comment.user_id) && (
              <button
                onClick={() => { if (confirm("কমেন্ট মুছে ফেলবেন?")) deleteComment.mutate(comment.id); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <div className="flex gap-2 mt-3">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="রিপ্লাই লিখুন..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) addComment.mutate({ content: replyText.trim(), parentId: comment.id }); }}
              />
              <button
                onClick={() => { if (replyText.trim()) addComment.mutate({ content: replyText.trim(), parentId: comment.id }); }}
                disabled={!replyText.trim() || addComment.isPending}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Replies toggle */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => toggleReplies(comment.id)}
              className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
            >
              {expandedReplies.has(comment.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {comment.replies.length}টি রিপ্লাই
            </button>
          )}
        </div>
      </div>

      {/* Render replies */}
      {!isReply && expandedReplies.has(comment.id) && comment.replies?.map(r => (
        <CommentItem key={r.id} comment={r} isReply />
      ))}
    </div>
  );

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 md:p-6 mt-4 shadow-sm animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-heading font-bold text-lg">মন্তব্য ({totalComments})</h2>
      </div>

      {/* New comment input */}
      {user ? (
        <div className="flex gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
            {user.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="আপনার মন্তব্য লিখুন..."
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) addComment.mutate({ content: newComment.trim() }); }}
            />
            <button
              onClick={() => { if (newComment.trim()) addComment.mutate({ content: newComment.trim() }); }}
              disabled={!newComment.trim() || addComment.isPending}
              className="p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4 bg-muted/50 rounded-lg p-3">
          মন্তব্য করতে <a href="/auth" className="text-primary hover:underline font-medium">লগইন করুন</a>
        </p>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যকারী হোন!</p>
      ) : (
        <div className="divide-y divide-border">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
        </div>
      )}
    </div>
  );
}
