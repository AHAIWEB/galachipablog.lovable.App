export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_type: string
          click_count: number
          content: string
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          link_url: string | null
          name: string
          placement: string
          start_date: string | null
          status: string
          updated_at: string
          view_count: number
        }
        Insert: {
          ad_type?: string
          click_count?: number
          content: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          name: string
          placement?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          ad_type?: string
          click_count?: number
          content?: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          name?: string
          placement?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      archive_schedules: {
        Row: {
          category: string | null
          created_at: string
          id: string
          interval_hours: number
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          scrape_type: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          interval_hours?: number
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          scrape_type?: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          interval_hours?: number
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          scrape_type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      archived_contents: {
        Row: {
          ai_summary: string | null
          ai_tags: string[] | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          images: Json | null
          schedule_id: string | null
          source_name: string | null
          source_url: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          ai_tags?: string[] | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          schedule_id?: string | null
          source_name?: string | null
          source_url: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          ai_tags?: string[] | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          schedule_id?: string | null
          source_name?: string | null
          source_url?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_contents_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "archive_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cards: {
        Row: {
          address: string | null
          card_image_url: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization: string | null
          phone: string
          status: Database["public"]["Enums"]["card_status"]
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          card_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization?: string | null
          phone: string
          status?: Database["public"]["Enums"]["card_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          card_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["card_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_locked: boolean
          letter: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean
          letter?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean
          letter?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_sources: {
        Row: {
          category_id: string | null
          created_at: string
          fetch_interval_minutes: number
          id: string
          is_active: boolean
          last_fetched_at: string | null
          name: string
          type: Database["public"]["Enums"]["feed_type"]
          updated_at: string
          url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          fetch_interval_minutes?: number
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          name: string
          type?: Database["public"]["Enums"]["feed_type"]
          updated_at?: string
          url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          fetch_interval_minutes?: number
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          name?: string
          type?: Database["public"]["Enums"]["feed_type"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fetched_articles: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          original_url: string | null
          published_to_post_id: string | null
          source_id: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          original_url?: string | null
          published_to_post_id?: string | null
          source_id: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          original_url?: string | null
          published_to_post_id?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fetched_articles_published_to_post_id_fkey"
            columns: ["published_to_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fetched_articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "feed_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_featured: boolean
          is_locked: boolean
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          is_locked?: boolean
          share_count?: number
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          is_locked?: boolean
          share_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_click: { Args: { ad_id: string }; Returns: undefined }
      increment_ad_view: { Args: { ad_id: string }; Returns: undefined }
      increment_share_count: { Args: { p_post_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      article_status: "fetched" | "processed" | "published" | "rejected"
      card_status: "pending" | "approved" | "rejected"
      category_type: "news" | "blog" | "directory"
      feed_type: "rss" | "scrape"
      post_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      article_status: ["fetched", "processed", "published", "rejected"],
      card_status: ["pending", "approved", "rejected"],
      category_type: ["news", "blog", "directory"],
      feed_type: ["rss", "scrape"],
      post_status: ["draft", "published", "archived"],
    },
  },
} as const
