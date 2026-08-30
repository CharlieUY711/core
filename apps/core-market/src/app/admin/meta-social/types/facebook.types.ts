// src/app/admin/meta-social/types/facebook.types.ts

export interface FacebookPage {
  id:          string
  name:        string
  category?:   string
  fan_count?:  number
  picture?:    { data: { url: string } }
  link?:       string
  about?:      string
  website?:    string
  verification_status?: string
}

export interface FacebookPost {
  id:            string
  message?:      string
  story?:        string
  full_picture?: string
  created_time:  string
  permalink_url?: string
  likes?:        { summary: { total_count: number } }
  comments?:     { summary: { total_count: number } }
}

export interface FacebookPostsPage {
  data:    FacebookPost[]
  paging?: { cursors?: { before: string; after: string }; next?: string }
}

// Para crear un post (Etapa 2)
export interface FacebookCreatePostParams {
  message:      string
  link?:        string
  picture?:     string
  scheduledAt?: number   // UNIX timestamp para publicación programada
}
