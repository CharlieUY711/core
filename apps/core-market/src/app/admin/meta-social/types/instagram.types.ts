// src/app/admin/meta-social/types/instagram.types.ts

export interface InstagramProfile {
  id:                  string
  username:            string
  name?:               string
  biography?:          string
  website?:            string
  followers_count?:    number
  follows_count?:      number
  media_count?:        number
  profile_picture_url?: string
  account_type?:       string
}

export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'

export interface InstagramMedia {
  id:            string
  media_type:    InstagramMediaType
  media_url?:    string
  thumbnail_url?: string
  permalink:     string
  timestamp:     string
  caption?:      string
  like_count?:   number
  comments_count?: number
}

export interface InstagramMediaPage {
  data:   InstagramMedia[]
  paging?: {
    cursors?: { before: string; after: string }
    next?:    string
  }
}

// Para crear un post (Etapa 2)
export interface InstagramCreatePostParams {
  imageUrl:    string
  caption?:    string
  isCarousel?: boolean
  children?:   string[]   // container IDs para carousel
}
