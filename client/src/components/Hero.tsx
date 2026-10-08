import { Link } from 'react-router';
import type { CSSProperties } from 'react';
import { SparkleIcon } from './icons';
import { RingCarousel } from './RingCarousel';
import type { RingImage } from './RingCarousel';

const PROJECT_IMAGES: RingImage[] = [
  { src: '/images/project-1.jpg', alt: 'Portrait on a sunny rooftop in a grey long-sleeve top' },
  { src: '/images/project-2.jpg', alt: 'Portrait in a brown leather jacket' },
  { src: '/images/project-3.jpg', alt: 'Portrait in a navy jacket against a white wall' },
  { src: '/images/project-4.jpg', alt: 'Portrait on a sunny rooftop in a grey long-sleeve top' },
  { src: '/images/project-5.jpg', alt: 'Portrait in a brown leather jacket' },
  { src: '/images/project-6.jpg', alt: 'Portrait in a navy jacket against a white wall' },
];

const HEADLINE = ['혼자 고민하던 헤어스타일', 'IROKE와 함께', '시작해보세요.'];

export function Hero() {
  return (
    <main className="hero">
      <RingCarousel images={PROJECT_IMAGES} cardW={330} cardH={412} />

      <div className="hero__bottom">
        <div className="hero__intro">
          <p className="badge">
            <SparkleIcon />
            Your personal productivity buddy
          </p>
          <h1 className="headline">
            {HEADLINE.map((line, i) => (
              <span key={line} className="headline__line">
                <span className="headline__inner" style={{ '--line': i } as CSSProperties}>
                  {line}
                </span>
              </span>
            ))}
          </h1>
        </div>

        <div className="hero__aside">
          <p>
            I'm a multidisciplinary designer focused on creating bold visual identities, and digital experiences for
            brands and businesses.
          </p>
          <Link className="pill" to="/profile">
            모발 프로필 등록/확인 <span className="pill__arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
