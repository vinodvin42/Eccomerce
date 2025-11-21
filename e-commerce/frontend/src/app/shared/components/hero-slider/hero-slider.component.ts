import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  category: string;
  slug: string;
}

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <section class="store-hero">
      <div class="hero-slider">
        <div
          class="hero-slide"
          *ngFor="let slide of slides; let i = index"
          [class.active]="i === activeSlide()"
          [style.backgroundImage]="'url(' + slide.image + ')'"
        >
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <p class="hero-eyebrow">{{ slide.eyebrow }}</p>
            <h1 class="hero-title">{{ slide.title }}</h1>
            <p class="hero-subtitle">{{ slide.subtitle }}</p>
            <div class="hero-actions">
              <button class="btn-primary" (click)="onCategoryClick(slide.slug, $event)">
                Explore {{ slide.category }}
              </button>
              <button class="hero-btn-secondary" (click)="onViewAll($event)">View All Collections</button>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-indicators">
        <button
          *ngFor="let slide of slides; let i = index"
          class="indicator-dot"
          [class.active]="i === activeSlide()"
          (click)="setSlide(i)"
          [attr.aria-label]="'View slide ' + (i + 1)"
        ></button>
      </div>
    </section>
  `,
  styles: [
    `
      .store-hero {
        position: relative;
        width: 100%;
        max-width: 1400px;
        margin: 2rem auto 3rem;
        padding: 0 2rem;
        box-sizing: border-box;
      }

      .hero-slider {
        position: relative;
        width: 100%;
        height: 420px;
        border-radius: 1.5rem;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
      }

      .hero-slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0;
        transition: opacity 0.8s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-slide.active {
        opacity: 1;
        z-index: 1;
      }

      .hero-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(30, 41, 59, 0.5));
        z-index: 1;
      }

      .hero-content {
        position: relative;
        z-index: 2;
        text-align: center;
        color: #fff;
        max-width: 800px;
        padding: 2rem;
      }

      .hero-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.875rem;
        color: var(--premium-gold);
        margin: 0 0 1rem 0;
        font-weight: 600;
      }

      .hero-title {
        font-size: 3.5rem;
        font-weight: 800;
        margin: 0 0 1rem 0;
        line-height: 1.2;
        text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
      }

      .hero-subtitle {
        font-size: 1.25rem;
        margin: 0 0 2rem 0;
        opacity: 0.95;
        line-height: 1.6;
      }

      .hero-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .hero-btn-secondary {
        padding: 0.85rem 2.5rem;
        background: transparent;
        color: #fff;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .hero-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .hero-indicators {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
        z-index: 3;
      }

      .indicator-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.5);
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
      }

      .indicator-dot.active {
        background: var(--premium-gold);
        border-color: var(--premium-gold);
      }

      @media (max-width: 768px) {
        .store-hero {
          margin-top: 1.5rem;
          padding: 0 1rem;
        }

        .hero-slider {
          height: 400px;
        }

        .hero-title {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .hero-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-btn-secondary,
        .btn-primary {
          width: 100%;
        }
      }
    `,
  ],
})
export class HeroSliderComponent implements OnInit, OnDestroy {
  @Input() slides: HeroSlide[] = [];
  @Input() autoSlideInterval = 5000;
  @Output() categoryClick = new EventEmitter<{ slug: string; event: Event }>();
  @Output() viewAll = new EventEmitter<Event>();

  activeSlide = signal(0);
  private intervalId?: number;

  ngOnInit() {
    if (this.slides.length > 1 && this.autoSlideInterval > 0) {
      this.startAutoSlide();
    }
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  setSlide(index: number) {
    this.activeSlide.set(index);
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  onCategoryClick(slug: string, event: Event) {
    this.categoryClick.emit({ slug, event });
  }

  onViewAll(event: Event) {
    this.viewAll.emit(event);
  }

  private startAutoSlide() {
    this.intervalId = window.setInterval(() => {
      const next = (this.activeSlide() + 1) % this.slides.length;
      this.activeSlide.set(next);
    }, this.autoSlideInterval);
  }

  private stopAutoSlide() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

