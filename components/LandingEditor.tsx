'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SiteConfig, SiteHeroSlide, DEFAULT_CONFIG } from '@/lib/site-config'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { SiteReview, normalizeReviews } from '@/lib/reviews-config'

type Section = 'announce' | 'hero' | 'banner' | 'trust' | 'reviews' | 'newsletter'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--gray)', borderRadius: 10, padding: '10px 14px',
  fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 5, display: 'block',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 16, padding: 24,
  boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 20,
}

export default function LandingEditor({ initialConfig }: { initialConfig: SiteConfig }) {
  const [config, setConfig] = useState<SiteConfig>(() => ({ ...initialConfig, reviews: normalizeReviews(initialConfig.reviews) }))
  const [section, setSection] = useState<Section>('announce')
  const [saving, setSaving] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  async function save(key: string, value: unknown) {
    setSaving(key)
    setSavedMsg('')
    setSaveError('')
    try {
      const { data: { session } } = await getBrowserSupabase().auth.getSession()
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save changes. Please try again.')
      }
      setSavedMsg(`✓ ${key.replace('_', ' ')} saved!`)
      setTimeout(() => setSavedMsg(''), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save changes. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  function updateReview<K extends keyof SiteReview>(i: number, field: K, value: SiteReview[K]) {
    setConfig(c => ({ ...c, reviews: c.reviews.map((review, index) => index === i ? { ...review, [field]: value } : review) }))
  }

  function updateAnnounce(field: string, val: unknown) {
    setConfig(c => ({ ...c, announce_bar: { ...c.announce_bar, [field]: val } }))
  }

  function updateBanner(field: string, val: unknown) {
    setConfig(c => ({ ...c, banner: { ...c.banner, [field]: val } }))
  }

  function updateNewsletter(field: string, val: string) {
    setConfig(c => ({ ...c, newsletter: { ...c.newsletter, [field]: val } }))
  }

  function updateSlide(i: number, field: keyof SiteHeroSlide, val: string) {
    setConfig(c => {
      const slides = [...c.hero_slides]
      slides[i] = { ...slides[i], [field]: val }
      return { ...c, hero_slides: slides }
    })
  }

  function addSlide() {
    setConfig(c => ({
      ...c,
      hero_slides: [...c.hero_slides, {
        img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80',
        eyebrow: 'New Slide', title: 'Slide Title', sub: 'Slide subtitle text here.',
        cta: 'Shop Now', ctaLink: '#products', outline: 'Learn More', outlineLink: '#about',
      }],
    }))
  }

  function removeSlide(i: number) {
    if (config.hero_slides.length <= 1) return
    setConfig(c => ({ ...c, hero_slides: c.hero_slides.filter((_, idx) => idx !== i) }))
  }

  function updateTrustItem(i: number, field: string, val: string) {
    setConfig(c => {
      const items = [...c.trust_bar]
      items[i] = { ...items[i], [field]: val }
      return { ...c, trust_bar: items }
    })
  }

  function updateStat(i: number, field: string, val: string) {
    setConfig(c => {
      const stats = [...c.banner.stats]
      stats[i] = { ...stats[i], [field]: val }
      return { ...c, banner: { ...c.banner, stats } }
    })
  }

  const SECTIONS: { id: Section; label: string; icon: string }[] = [
    { id: 'announce', label: 'Announce Bar', icon: 'fa-megaphone' },
    { id: 'hero',     label: 'Hero Slides',  icon: 'fa-images' },
    { id: 'banner',   label: 'Banner',       icon: 'fa-rectangle-ad' },
    { id: 'trust',    label: 'Trust Bar',    icon: 'fa-shield' },
    { id: 'reviews',  label: 'Reviews',      icon: 'fa-star' },
    { id: 'newsletter', label: 'Newsletter', icon: 'fa-envelope' },
  ]

  const SaveBtn = ({ k, value }: { k: string; value: unknown }) => (
    <motion.button
      onClick={() => save(k, value)}
      disabled={saving === k}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving === k ? 0.7 : 1, marginTop: 16 }}>
      {saving === k ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Saving…</> : <><i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }} />Save Changes</>}
    </motion.button>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)' }}>Landing Page Editor</h2>
        <a href="/" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--teal)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-up-right-from-square" /> Preview Site
        </a>
      </div>

      {savedMsg && (
        <motion.div role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: 12, marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
          {savedMsg}
        </motion.div>
      )}

      {saveError && (
        <div role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 20px', borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {saveError}
        </div>
      )}

      {/* section tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ background: section === s.id ? 'var(--navy)' : 'var(--white)', color: section === s.id ? 'white' : 'var(--text-mid)', border: section === s.id ? 'none' : '1.5px solid var(--gray)', borderRadius: 50, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.2s' }}>
            <i className={`fa-solid ${s.icon}`} /> {s.label}
          </button>
        ))}
      </div>

      {/* ── Announce Bar ──────────────────────────────── */}
      {section === 'announce' && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 16, fontSize: 15 }}>Announce Bar</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Main Text</label>
              <input style={inputStyle} value={config.announce_bar.text} onChange={e => updateAnnounce('text', e.target.value)} placeholder="Free shipping on orders over $75" />
            </div>
            <div>
              <label style={labelStyle}>Highlight Text (teal)</label>
              <input style={inputStyle} value={config.announce_bar.highlight} onChange={e => updateAnnounce('highlight', e.target.value)} placeholder="Use code THEMAGA10 for 10% off" />
            </div>
            <div>
              <label style={labelStyle}>Suffix Text</label>
              <input style={inputStyle} value={config.announce_bar.suffix} onChange={e => updateAnnounce('suffix', e.target.value)} placeholder="Limited time only" />
            </div>
            <div>
              <label style={labelStyle}>Background Color</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={config.announce_bar.bg_color} onChange={e => updateAnnounce('bg_color', e.target.value)}>
                <option value="navy">Navy (default)</option>
                <option value="teal">Teal</option>
                <option value="red">Red (urgent)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input type="checkbox" id="bar-visible" checked={config.announce_bar.visible} onChange={e => updateAnnounce('visible', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--teal)' }} />
            <label htmlFor="bar-visible" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>Show announce bar on homepage</label>
          </div>

          <SaveBtn k="announce_bar" value={config.announce_bar} />
        </div>
      )}

      {/* ── Hero Slides ───────────────────────────────── */}
      {section === 'hero' && (
        <div>
          {config.hero_slides.map((slide, i) => (
            <div key={i} style={{ ...cardStyle, border: '1.5px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: 'var(--heading)', fontSize: 14 }}>Slide {i + 1}</p>
                {config.hero_slides.length > 1 && (
                  <button onClick={() => removeSlide(i)}
                    style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <i className="fa-solid fa-trash" /> Remove
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Background Image URL</label>
                  <input style={inputStyle} value={slide.img} onChange={e => updateSlide(i, 'img', e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label style={labelStyle}>Eyebrow (small top text)</label>
                  <input style={inputStyle} value={slide.eyebrow} onChange={e => updateSlide(i, 'eyebrow', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Headline</label>
                  <input style={inputStyle} value={slide.title} onChange={e => updateSlide(i, 'title', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Sub-headline</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={slide.sub} onChange={e => updateSlide(i, 'sub', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Primary CTA Text</label>
                  <input style={inputStyle} value={slide.cta} onChange={e => updateSlide(i, 'cta', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Primary CTA Link</label>
                  <input style={inputStyle} value={slide.ctaLink} onChange={e => updateSlide(i, 'ctaLink', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Secondary CTA Text</label>
                  <input style={inputStyle} value={slide.outline} onChange={e => updateSlide(i, 'outline', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Secondary CTA Link</label>
                  <input style={inputStyle} value={slide.outlineLink} onChange={e => updateSlide(i, 'outlineLink', e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <button onClick={addSlide}
              style={{ background: 'var(--gray)', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--heading)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="fa-solid fa-plus" /> Add Slide
            </button>
            <SaveBtn k="hero_slides" value={config.hero_slides} />
          </div>
        </div>
      )}

      {/* ── Banner ────────────────────────────────────── */}
      {section === 'banner' && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 16, fontSize: 15 }}>About / Banner Section</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Section Title</label>
              <input style={inputStyle} value={config.banner.title} onChange={e => updateBanner('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={config.banner.description} onChange={e => updateBanner('description', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Statistics (3 items)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {config.banner.stats.map((s, i) => (
                  <div key={i} style={{ background: 'var(--off-white)', borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 6, textTransform: 'uppercase' }}>Stat {i + 1}</p>
                    <input style={{ ...inputStyle, marginBottom: 8 }} value={s.num} onChange={e => updateStat(i, 'num', e.target.value)} placeholder="2400" />
                    <input style={inputStyle} value={s.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="Orders Shipped" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SaveBtn k="banner" value={config.banner} />
        </div>
      )}

      {/* ── Trust Bar ─────────────────────────────────── */}
      {section === 'trust' && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 16, fontSize: 15 }}>Trust Bar (4 items below hero)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
            {config.trust_bar.map((item, i) => (
              <div key={i} style={{ background: 'var(--off-white)', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 10, textTransform: 'uppercase' }}>Item {i + 1}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Font Awesome Icon Class</label>
                    <input style={inputStyle} value={item.icon} onChange={e => updateTrustItem(i, 'icon', e.target.value)} placeholder="fa-truck-fast" />
                  </div>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input style={inputStyle} value={item.title} onChange={e => updateTrustItem(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subtitle</label>
                    <input style={inputStyle} value={item.sub} onChange={e => updateTrustItem(i, 'sub', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>Find icon classes at <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>fontawesome.com/icons</a></p>
          <SaveBtn k="trust_bar" value={config.trust_bar} />
        </div>
      )}

      {/* ── Reviews ───────────────────────────────────── */}
      {section === 'reviews' && (
        <form onSubmit={e => { e.preventDefault(); void save('reviews', config.reviews) }}>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16 }}>Edit or remove the customer reviews shown on the homepage, then save your changes. Removals take effect when you save.</p>
          <fieldset disabled={saving !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {config.reviews.length === 0 && (
              <p style={cardStyle}>No reviews remain. Save Reviews to hide the reviews section on the homepage.</p>
            )}
            {config.reviews.map((review, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, color: 'var(--heading)', fontSize: 15 }}>Review {i + 1}</h3>
                  <button type="button" aria-label={`Remove review ${i + 1}`}
                    onClick={() => {
                      setConfig(c => ({ ...c, reviews: c.reviews.filter((_, index) => index !== i) }))
                      setSavedMsg('')
                    }}
                    style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <i className="fa-solid fa-trash" aria-hidden="true" /> Remove
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
                  <div>
                    <label htmlFor={`review-name-${i}`} style={labelStyle}>Reviewer name</label>
                    <input id={`review-name-${i}`} style={inputStyle} required maxLength={120} value={review.name} onChange={e => updateReview(i, 'name', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`review-role-${i}`} style={labelStyle}>Role / subtitle</label>
                    <input id={`review-role-${i}`} style={inputStyle} maxLength={120} value={review.role} onChange={e => updateReview(i, 'role', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`review-stars-${i}`} style={labelStyle}>Star rating</label>
                    <select id={`review-stars-${i}`} style={inputStyle} value={review.stars} onChange={e => updateReview(i, 'stars', Number(e.target.value))}>
                      {[1, 2, 3, 4, 5].map(stars => <option key={stars} value={stars}>{stars} {stars === 1 ? 'star' : 'stars'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`review-avatar-${i}`} style={labelStyle}>Photo URL (HTTPS or local path)</label>
                    <input id={`review-avatar-${i}`} style={inputStyle} required maxLength={2048} value={review.avatar} onChange={e => updateReview(i, 'avatar', e.target.value)} placeholder="https://..." />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor={`review-text-${i}`} style={labelStyle}>Review text</label>
                    <textarea id={`review-text-${i}`} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} required maxLength={2000} value={review.text} onChange={e => updateReview(i, 'text', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button type="submit" style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving === 'reviews' ? 'Saving…' : 'Save Reviews'}
            </button>
          </fieldset>
        </form>
      )}

      {/* ── Newsletter ────────────────────────────────── */}
      {section === 'newsletter' && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 16, fontSize: 15 }}>Newsletter Section</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Heading</label>
              <input style={inputStyle} value={config.newsletter.heading} onChange={e => updateNewsletter('heading', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Subheading</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={config.newsletter.subheading} onChange={e => updateNewsletter('subheading', e.target.value)} />
            </div>
          </div>
          <SaveBtn k="newsletter" value={config.newsletter} />
        </div>
      )}
    </div>
  )
}
