// ── Reward Engine — Tipos completos ──────────────────────────────────────────

export type RewardType =
  | "percentage_discount" | "fixed_discount" | "free_shipping"
  | "free_product"        | "specific_product"| "category_discount"
  | "cashback"            | "loyalty_points"  | "vip_access"
  | "gift"                | "surprise";

export type MechanicType =
  | "infinite_prize_ribbon" | "wheel" | "scratch_card" | "mystery_box" | "quiz";

export type RewardStatus   = "active" | "used" | "expired" | "cancelled";
export type CampaignStatus = "draft"  | "active" | "paused" | "ended";

export interface Reward {
  id:           string;
  campaignId:   string;
  tenantId:     string;
  type:         RewardType;
  label:        string;
  emoji?:       string;
  color?:       string;
  value?:       number;
  productId?:   string;
  categoryId?:  string;
  startsAt:     string;
  expiresAt:    string;
  stock:        number | null;
  stockUsed:    number;
  probability:  number;   // 0-100
  maxPerUser:   number | null;
  minCartAmount?:number;
  metadata?:    Record<string, unknown>;
  createdAt:    string;
  updatedAt:    string;
}

export interface RewardCampaign {
  id:           string;
  tenantId:     string;
  name:         string;
  slug:         string;
  mechanic:     MechanicType;
  status:       CampaignStatus;
  branding?:    { primaryColor?: string; logoUrl?: string; backgroundUrl?: string };
  startsAt:     string;
  endsAt:       string;
  rewards:      Reward[];
  rules:        RewardRule[];
  participation:ParticipationConfig;
  game:         GameConfig;
  createdAt:    string;
  updatedAt:    string;
}

export interface RewardAssignment {
  id:          string;
  rewardId:    string;
  campaignId:  string;
  tenantId:    string;
  userId:      string;
  status:      RewardStatus;
  assignedAt:  string;
  expiresAt:   string;
  usedAt?:     string;
  cartId?:     string;
  orderId?:    string;
  metadata?:   Record<string, unknown>;
}

export interface RewardRule {
  id:          string;
  campaignId:  string;
  type:        "min_cart_amount" | "category" | "product" | "stackable" | "eligibility";
  value:       unknown;
  description?:string;
}

export interface RewardUsage {
  id:            string;
  assignmentId:  string;
  userId:        string;
  orderId:       string;
  appliedValue:  number;
  appliedAt:     string;
}

export interface RewardAudit {
  id:        string;
  entity:    "reward" | "campaign" | "assignment" | "rule";
  entityId:  string;
  action:    string;
  before?:   unknown;
  after?:    unknown;
  userId:    string;
  tenantId:  string;
  timestamp: string;
}

export interface RewardInventory {
  rewardId:   string;
  campaignId: string;
  tenantId:   string;
  total:      number | null;
  used:       number;
  reserved:   number;
  available:  number | null;
  updatedAt:  string;
}

export interface RewardAnalytics {
  campaignId:    string;
  tenantId:      string;
  period:        string;
  totalPlays:    number;
  uniquePlayers: number;
  registrations: number;
  conversions:   number;
  revenue:       number;
  rewardsClaimed:number;
  rewardsUsed:   number;
  roi:           number;
  cacAvoided:    number;
}

export interface ParticipationConfig {
  requiresAuth:       boolean;
  maxPlaysPerUser:    number | null;
  maxPlaysPerPeriod:  number | null;
  periodHours?:       number;
  eligibleCountries?: string[];
  eligibleSegments?:  string[];
}

export interface GameConfig {
  spinDurationMs:  number;
  accelerationMs:  number;
  decelerationMs:  number;
  vibration:       boolean;
  sound:           boolean;
  confetti:        boolean;
  animations:      boolean;
}

export interface CartRewardPayload {
  reward_id:         string;
  reward_status:     "active";
  reward_expires_at: string;
  reward_metadata: {
    campaignId:   string;
    assignmentId: string;
    rewardType:   RewardType;
    value?:       number;
    productId?:   string;
    categoryId?:  string;
  };
}
