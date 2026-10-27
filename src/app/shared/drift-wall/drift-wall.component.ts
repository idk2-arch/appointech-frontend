import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

export interface DriftWallItem {
  image?: string;
  title?: string;
}

interface DriftWallTile {
  id: string;
  item: DriftWallItem;
}

interface DriftWallColumn {
  copyHeight: number;
  tiles: DriftWallTile[];
}

function columnFactor(index: number, variance: number): number {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Port of "DriftWall" (React Bits): columns of tiles drifting vertically at
 * slightly different speeds, with a pointer-driven 3D tilt on the whole
 * plane. Las fotos no reaccionan al cursor (sin elevación, brillo ni pausa al
 * pasar el mouse): solo se desplazan solas y la cuadrícula se inclina un poco
 * con el movimiento del puntero. `radius`, `roll` y `grayscale` se dejan en los
 * valores originales en lugar de exponerlos como inputs.
 */
@Component({
  selector: 'app-drift-wall',
  standalone: false,
  templateUrl: './drift-wall.component.html',
  styleUrls: ['./drift-wall.component.css'],
})
export class DriftWallComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) items: DriftWallItem[] = [];
  @Input() columns = 5;
  @Input() tileWidth = 200;
  @Input() tileHeight = 132;
  @Input() gap = 18;
  @Input() tilt = 16;
  @Input() turn = -14;
  @Input() perspective = 1200;
  @Input() depth = 120;
  @Input() speed = 42;
  @Input() direction: 'up' | 'down' = 'up';
  @Input() variance = 0.45;
  @Input() parallax = 0.6;
  @Input() fade = 0.6;
  @Input() dim = 0.55;
  @Input() overlayColor = '#060010';

  readonly radius = 14;

  @ViewChild('container', { static: true }) private containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('plane', { static: true }) private planeRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('trackEl') private trackRefs!: QueryList<ElementRef<HTMLDivElement>>;

  columnData: DriftWallColumn[] = [];
  reduced = false;

  private offsets: number[] = [];
  private velocities: number[] = [];
  private baseVelocities: number[] = [];

  private raf = 0;
  private lastTs: number | null = null;
  private pointerTarget = { x: 0, y: 0 };
  private pointerDamped = { x: 0, y: 0 };

  private ro: ResizeObserver | null = null;
  private reducedMotionQuery: MediaQueryList | null = null;
  private onReducedMotionChange = (e: MediaQueryListEvent) => {
    this.reduced = e.matches;
    this.cdr.markForCheck();
  };
  private onPointerMove = (e: PointerEvent) => {};
  private onPointerLeave = () => {};

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get edgePercent(): number {
    return Math.max(0, (1 - this.fade) * 100);
  }

  ngAfterViewInit(): void {
    this.reduced = prefersReducedMotion();
    const container = this.containerRef.nativeElement;

    this.zone.runOutsideAngular(() => {
      this.rebuildColumns();

      this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotionQuery.addEventListener('change', this.onReducedMotionChange);

      this.onPointerMove = (e: PointerEvent) => {
        if (this.parallax <= 0 || this.reduced) return;
        const rect = container.getBoundingClientRect();
        this.pointerTarget = {
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        };
      };
      this.onPointerLeave = () => {
        this.pointerTarget = { x: 0, y: 0 };
      };
      container.addEventListener('pointermove', this.onPointerMove);
      container.addEventListener('pointerleave', this.onPointerLeave);

      this.ro = new ResizeObserver(() => this.rebuildColumns());
      this.ro.observe(container);

      const loop = (ts: number) => {
        if (this.lastTs === null) this.lastTs = ts;
        const dt = Math.min(0.05, Math.max(0, ts - this.lastTs) / 1000);
        this.lastTs = ts;

        const maxTilt = this.parallax * 8;
        const targetX = this.pointerTarget.x * maxTilt;
        const targetY = -this.pointerTarget.y * maxTilt;
        const damp = 1 - Math.exp(-dt / 0.12);
        this.pointerDamped.x += (targetX - this.pointerDamped.x) * damp;
        this.pointerDamped.y += (targetY - this.pointerDamped.y) * damp;
        this.applyPlaneTransform(this.pointerDamped.x, this.pointerDamped.y);

        if (!this.reduced) {
          const trackEls = this.trackRefs.toArray();
          for (let c = 0; c < trackEls.length; c++) {
            const meta = this.columnData[c];
            if (!meta) continue;
            const target = this.baseVelocities[c] ?? 0;
            const ease = 1 - Math.exp(-dt / 0.28);
            this.velocities[c] = (this.velocities[c] ?? 0) + (target - (this.velocities[c] ?? 0)) * ease;
            let next = (this.offsets[c] ?? 0) + this.velocities[c] * dt;
            next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
            this.offsets[c] = next;
            trackEls[c].nativeElement.style.transform = `translate3d(0, ${-next}px, 0)`;
          }
        }

        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.reducedMotionQuery?.removeEventListener('change', this.onReducedMotionChange);
    const container = this.containerRef?.nativeElement;
    container?.removeEventListener('pointermove', this.onPointerMove);
    container?.removeEventListener('pointerleave', this.onPointerLeave);
  }

  private rebuildColumns(): void {
    const container = this.containerRef.nativeElement;
    const containerHeight = container.getBoundingClientRect().height || 240;
    const unit = this.tileHeight + this.gap;

    const buckets: DriftWallItem[][] = Array.from({ length: this.columns }, () => []);
    this.items.forEach((item, i) => buckets[i % this.columns].push(item));

    this.columnData = buckets.map((bucket, c) => {
      const source = bucket.length ? bucket : this.items.slice(0, 1);
      const copyHeight = Math.max(unit, source.length * unit);
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
      const tiles: DriftWallTile[] = [];
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        source.forEach((item, itemIndex) => tiles.push({ id: `${c}-${copyIndex}-${itemIndex}`, item }));
      }
      return { copyHeight, tiles };
    });

    this.computeBaseVelocities();
    this.cdr.detectChanges();

    this.offsets = this.columnData.map((col, c) => col.copyHeight * ((c * 0.37) % 1));
    this.velocities = this.columnData.map(() => 0);

    const trackEls = this.trackRefs.toArray();
    trackEls.forEach((ref, c) => {
      ref.nativeElement.style.transform = `translate3d(0, ${-(this.offsets[c] ?? 0)}px, 0)`;
    });
  }

  private computeBaseVelocities(): void {
    const dirSign = this.direction === 'up' ? 1 : -1;
    this.baseVelocities = this.columnData.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return this.speed * columnFactor(c, this.variance) * dirSign * altSign;
    });
  }

  private applyPlaneTransform(px: number, py: number): void {
    const plane = this.planeRef.nativeElement;
    plane.style.transform =
      `translate(-50%, -50%) scale(1.18) ` +
      `rotateX(${this.tilt + py}deg) rotateY(${this.turn + px}deg) ` +
      `translateZ(${-this.depth}px)`;
  }
}
