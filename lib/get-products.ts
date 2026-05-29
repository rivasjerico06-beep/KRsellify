import { createClient } from '@supabase/supabase-js'
import { Product } from './types'
import { FALLBACK_PRODUCTS } from './fallback-products'

export async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('your-project-id')) return FALLBACK_PRODUCTS
  try {
    const sb = createClient(url, key)
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false })
    if (error || !data?.length) return FALLBACK_PRODUCTS
    return data
  } catch {
    return FALLBACK_PRODUCTS
  }
}
