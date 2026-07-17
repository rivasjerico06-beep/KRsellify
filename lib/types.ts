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
  bundle_qty?: number
}

export interface Order {
  id?: string
  order_number?: number | null
  user_id?: string | null
  guest_email?: string | null
  items: CartItem[]
  total: number
  status?: string
  referral_code?: string | null
  coupon_code?: string | null
  discount_amount?: number | null
  created_at?: string
  // enriched by /api/admin/orders
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  customer_city?: string | null
  shipping_address?: {
    country?: string
    firstName?: string
    lastName?: string
    address?: string
    apartment?: string
    postalCode?: string
    city?: string
    region?: string
    phone?: string
  } | null
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
  // enriched by /api/admin/users
  email?: string | null
  order_count?: number
  total_spent?: number
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface AgentProfile {
  id: string
  user_id: string
  display_name: string
  phone: string
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  referral_code?: string | null
  agent_code?: string | null   // 5-digit public ID used in generate-link attribution
  max_leads?: number
  created_at?: string
  updated_at?: string
  profiles?: Profile
  // enriched by /api/admin/agents
  email?: string | null
  lead_count?: number
  converted_count?: number
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
  claimed_by?: string | null
  claimed_at?: string | null
  created_at?: string
  updated_at?: string
  customer_email?: string | null
  lineitem_price?: number | null
  billing_address?: string | null
  billing_city?: string | null
  billing_zip?: string | null
  billing_province?: string | null
  billing_country?: string | null
  tagging?: string | null
  assigned_agent_name?: string | null
  disposition?: string | null
  call_count?: number
  last_called_at?: string | null
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
  total_leads?: number
  converted_leads?: number
  lead_conversion_rate?: number
  calls_made?: number
  last_active?: string | null
  attributed_orders?: number
  attributed_revenue?: number
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
