export interface QuantityOption {
  label: string
  qty: number
  bundle_total: number
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  old_price?: number | null
  is_sale: boolean
  is_new: boolean
  rating: number
  reviews_count: number
  img: string
  images?: string[] | null
  cat_label: string
  in_stock: boolean
  description?: string | null
  quantity_options?: QuantityOption[] | null
  created_at?: string
}

export interface CartItem extends Product {
  qty: number
  via: 'heart' | 'btn'
  bundle_price?: number
  bundle_label?: string
}

export interface Order {
  id?: string
  user_id?: string | null
  items: CartItem[]
  total: number
  status?: string
  referral_code?: string | null
  coupon_code?: string | null
  discount_amount?: number | null
  created_at?: string
}

export interface NewsletterSubscriber {
  id?: string
  email: string
  subscribed_at?: string
}

export interface Profile {
  id: string
  full_name?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  role: 'customer' | 'admin' | 'agent'
  profile_photo_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface AgentProfile {
  id: string
  user_id: string
  display_name: string
  phone: string
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  referral_code?: string | null
  max_leads?: number
  created_at?: string
  updated_at?: string
  profiles?: Profile
}

export interface Lead {
  id: string
  customer_name: string
  customer_phone: string
  product_interest?: string | null
  agent_id?: string | null
  status: 'new' | 'assigned' | 'attempted' | 'interested' | 'follow_up' | 'converted' | 'not_interested' | 'do_not_contact'
  notes?: string | null
  follow_up_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface Coupon {
  id: string
  code: string
  discount_pct: number
  min_spend: number
  user_id?: string | null
  tier?: string | null
  is_used: boolean
  used_at?: string | null
  expires_at?: string | null
  created_at?: string
}

// Analytics types (used by /api/admin/analytics)
export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

export interface CategoryRevenue {
  name: string
  revenue: number
  count: number
}

export interface StatusCount {
  name: string
  value: number
  color: string
}

export interface AgentStat {
  user_id: string
  display_name: string
  referral_code: string
  orders: number
  revenue: number
}

export interface CustomerTierRow {
  id: string
  full_name: string
  total_spent: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  order_count: number
}

export interface AnalyticsData {
  dailyRevenue: DailyRevenue[]
  categoryRevenue: CategoryRevenue[]
  orderStatusCounts: StatusCount[]
  agentStats: AgentStat[]
  customerTiers: CustomerTierRow[]
  topProducts: { name: string; revenue: number; units: number }[]
  totalRevenue: number
  totalOrders: number
  revenueThisMonth: number
  ordersThisMonth: number
}
