import { resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface CardItem {
  title: string
  slug: string
  imageUrl: string
}

interface CardFeedOptions {
  cards: CardItem[]
}

export default ((opts?: CardFeedOptions) => {
  const CardFeed: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const cards = opts?.cards ?? []

    return (
      <div class="card-feed">
        <div class="card-grid">
          {cards.map((card) => (
            <a
              href={resolveRelative(fileData.slug!, card.slug as any)}
              class="card"
              style={`background-image: url('${card.imageUrl}')`}
            >
              <div class="card-overlay">
                <h3 class="card-title">{card.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    )
  }

  CardFeed.css = `
.card-feed {
  width: 100%;
  padding: 2rem 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: 200px;
}

.card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  text-decoration: none;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: flex-end;

  /* Masonry effect - random heights */
  &:nth-child(3n + 1) {
    grid-row-end: span 2;
  }

  &:nth-child(5n + 2) {
    grid-row-end: span 3;
  }

  &:nth-child(7n + 3) {
    grid-row-end: span 2;
  }
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.card:hover .card-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9),
    rgba(0, 0, 0, 0.3)
  );
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8),
    rgba(0, 0, 0, 0.2)
  );
  transition: background 0.3s ease;
}

.card-title {
  margin: 0;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Responsive design */
@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    grid-auto-rows: 180px;
  }

  .card {
    /* Simplify masonry on mobile */
    &:nth-child(3n + 1),
    &:nth-child(5n + 2),
    &:nth-child(7n + 3) {
      grid-row-end: span 2;
    }
  }

  .card-overlay {
    padding: 1rem;
  }

  .card-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .card-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: 200px;
  }

  .card {
    /* Single column on very small screens */
    &:nth-child(3n + 1),
    &:nth-child(5n + 2),
    &:nth-child(7n + 3) {
      grid-row-end: span 1;
    }
  }
}

/* Dark mode adjustments */
[saved-theme="dark"] .card-title {
  color: #f0f0f0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
  }
}
`

  return CardFeed
}) satisfies QuartzComponentConstructor<CardFeedOptions>
