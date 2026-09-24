import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';

export interface RubberSegmentItem {
  value: string;
  label: string;
}

export type RubberSegmentSize = 'sm' | 'md' | 'lg';

interface RubberSegmentSizePreset {
  height: number;
  font: number;
  pad: number;
  min: number;
}

const SIZES: Record<RubberSegmentSize, RubberSegmentSizePreset> = {
  sm: { height: 28, font: 12, pad: 10, min: 36 },
  md: { height: 36, font: 13, pad: 14, min: 44 },
  lg: { height: 44, font: 14, pad: 18, min: 48 },
};

/**
 * Port of "RubberSegment" (React Bits) as a click/keyboard segmented control.
 * The physical drag-to-drag-the-thumb gesture (rubber-band overscroll, velocity
 * flick, spring momentum handoff) is intentionally not ported — the brief
 * prioritizes a well-animated click over a 1:1 gesture port. The double-layer
 * "real buttons + clipped color-inverted copy" technique that makes the moving
 * thumb correctly recolor its label is preserved, animated via a CSS
 * transition on clip-path rather than Framer Motion's useMotionValue.
 */
@Component({
  selector: 'app-rubber-segment',
  standalone: false,
  templateUrl: './rubber-segment.component.html',
  styleUrls: ['./rubber-segment.component.css'],
})
export class RubberSegmentComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) items: (string | RubberSegmentItem)[] = [];
  @Input() value?: string;
  @Input() defaultValue?: string;
  @Input() trackColor = 'rgba(255, 255, 255, 0.06)';
  @Input() thumbColor = '#d98e4a';
  @Input() textColor = 'rgba(255, 255, 255, 0.7)';
  @Input() activeTextColor = '#0b1224';
  @Input() size: RubberSegmentSize = 'md';
  @Input() radius = 10;
  @Input() disabled = false;
  @Input() ariaLabel = 'Control segmentado';

  @Output() valueChange = new EventEmitter<string>();
  @Output() change = new EventEmitter<string>();

  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;
  @ViewChildren('itemBtn') private itemRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  private innerValue?: string;
  private readonly inset = 3;
  clipLeft = 0;
  clipRight = 0;

  private resizeObserver?: ResizeObserver;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  get list(): RubberSegmentItem[] {
    return this.items.map((item) => (typeof item === 'string' ? { value: item, label: item } : item));
  }

  get current(): string | undefined {
    return this.value !== undefined ? this.value : this.innerValue;
  }

  get activeIndex(): number {
    const idx = this.list.findIndex((item) => item.value === this.current);
    return idx >= 0 ? idx : 0;
  }

  get preset(): RubberSegmentSizePreset {
    return SIZES[this.size] ?? SIZES.md;
  }

  get thumbRadius(): number {
    return Math.max(0, this.radius - this.inset);
  }

  get clipPathValue(): string {
    return `inset(0 ${this.clipRight}px 0 ${this.clipLeft}px round ${this.thumbRadius}px)`;
  }

  ngAfterViewInit(): void {
    this.measure();
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      if (this.trackRef) {
        this.resizeObserver.observe(this.trackRef.nativeElement);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultValue']?.firstChange) {
      this.innerValue = this.defaultValue ?? this.list[0]?.value;
    }
    if (this.trackRef) {
      this.measure();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onItemClick(index: number): void {
    if (this.disabled) return;
    this.select(index);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (this.disabled) return;
    const last = this.list.length - 1;
    let next: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(last, this.activeIndex + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, this.activeIndex - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;

    if (next === null) return;
    e.preventDefault();
    if (next === this.activeIndex) return;

    this.select(next);
    this.itemRefs?.get(next)?.nativeElement.focus();
  }

  private select(index: number): void {
    const list = this.list;
    if (index === this.activeIndex) return;

    const val = list[index].value;
    this.innerValue = val;
    this.valueChange.emit(val);
    this.change.emit(val);
    this.cdr.markForCheck();
    this.measure();
  }

  private measure(): void {
    const track = this.trackRef?.nativeElement;
    const el = this.itemRefs?.get(this.activeIndex)?.nativeElement;
    if (!track || !el) return;

    const trackRect = track.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    const innerWidth = trackRect.width - this.inset * 2;

    this.clipLeft = Math.max(0, itemRect.left - trackRect.left - this.inset);
    this.clipRight = Math.max(0, innerWidth - (itemRect.right - trackRect.left - this.inset));
    this.cdr.markForCheck();
  }
}
