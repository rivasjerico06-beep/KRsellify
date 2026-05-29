export default function Stars({ rating, size = 10 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < rating ? 'fa-solid fa-star' : 'fa-regular fa-star'}
          style={{ color: 'var(--gold)', fontSize: size }} />
      ))}
    </span>
  )
}
