import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  afterNextRender,
} from '@angular/core';

export type FuseButtonPhase = 'idle' | 'armed' | 'settled';
export type FuseButtonFuse = 'outline' | 'line' | 'top';
export type FuseButtonSize = 'sm' | 'md' | 'lg';
export type FuseButtonCommitOn = 'press' | 'fuseEnd';
export type FuseButtonSettle = 'reset' | 'stay';
export type FuseButtonIcon = 'block' | 'archive';

interface FuseButtonSizePreset {
  height: number;
  font: number;
  icon: number;
  px: number;
}

const SIZES: Record<FuseButtonSize, FuseButtonSizePreset> = {
  sm: { height: 36, font: 13, icon: 14, px: 16 },
  md: { height: 44, font: 14, icon: 15, px: 20 },
  lg: { height: 52, font: 15, icon: 17, px: 24 },
};

const LINE_KEYFRAMES: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];
const OUTLINE_KEYFRAMES: Keyframe[] = [{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }];

/**
 * Port of "FuseButton" (React Bits): an idle action that arms a countdown fuse
 * instead of opening a confirmation dialog. Undoing during the window cancels
 * for free; letting the fuse burn out commits the action.
 */
@Component({
  selector: 'app-fuse-button',
  standalone: false,
  templateUrl: './fuse-button.component.html',
  styleUrls: ['./fuse-button.component.css'],
})
export class FuseButtonComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() label = 'Archivar';
  @Input() undoLabel = 'Deshacer';
  @Input() doneLabel = 'Archivado';
  @Input() icon: FuseButtonIcon = 'block';
  @Input() color = 'rgba(255, 255, 255, 0.85)';
  @Input() background = 'rgba(255, 255, 255, 0.06)';
  @Input() fuseColor = '#d98e4a';
  @Input() size: FuseButtonSize = 'md';
  @Input() radius = 22;
  @Input() undoWindow = 4000;
  @Input() fuse: FuseButtonFuse = 'outline';
  @Input() fuseThickness = 1.5;
  @Input() crossfadeMs = 200;
  @Input() commitOn: FuseButtonCommitOn = 'press';
  @Input() pauseOnHover = true;
  @Input() settle: FuseButtonSettle = 'reset';
  @Input() disabled = false;

  @Output() commit = new EventEmitter<FuseButtonCommitOn>();
  @Output() undo = new EventEmitter<void>();
  @Output() fuseEnd = new EventEmitter<void>();
  @Output() phaseChange = new EventEmitter<FuseButtonPhase>();

  @ViewChild('rootEl') private rootRef!: ElementRef<HTMLElement>;
  @ViewChild('idleBtn') private idleRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('undoBtn') private undoRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('lineEl') private lineRef?: ElementRef<HTMLElement>;
  @ViewChild('rimEl') private rimRef?: ElementRef<SVGRectElement>;

  phase: FuseButtonPhase = 'idle';
  instant = false;

  private static idCounter = 0;
  readonly statusId = `fuse-button-status-${FuseButtonComponent.idCounter++}`;

  private anim: Animation | null = null;
  private readonly pauseState = { hover: false, hidden: false, canHoverPause: false };
  private lastInput: 'pointer' | 'keyboard' = 'pointer';
  private windowMs = this.undoWindow;

  constructor(
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {}

  get preset(): FuseButtonSizePreset {
    return SIZES[this.size] ?? SIZES.md;
  }

  ngAfterViewInit(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fuse'] && !changes['fuse'].firstChange && this.anim && this.phase === 'armed') {
      this.light(Number(this.anim.currentTime) || 0);
    }
    if (changes['pauseOnHover'] && !changes['pauseOnHover'].firstChange && !this.pauseOnHover) {
      this.pauseState.hover = false;
      this.syncPlayState();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.anim?.cancel();
  }

  arm(): void {
    if (this.disabled || this.phase !== 'idle') return;
    this.windowMs = this.undoWindow;
    this.light();
    this.pauseState.canHoverPause = false;
    this.pauseState.hover = false;
    if (this.commitOn === 'press') this.commit.emit('press');
    this.go('armed');
  }

  onUndoClick(): void {
    if (this.phase !== 'armed') return;
    const a = this.anim;
    if (a) {
      a.onfinish = null;
      a.pause();
    }
    this.undo.emit();
    this.go('idle');
  }

  onPointerDown(e: PointerEvent): void {
    this.lastInput = 'pointer';
    const pressable = this.phase === 'armed' || (this.phase === 'idle' && !this.disabled);
    if (e.button === 0 && pressable) {
      this.rootRef?.nativeElement.setAttribute('data-pressed', '');
    }
  }

  onPointerUp(): void {
    this.release();
  }

  onPointerCancel(): void {
    this.release();
  }

  onPointerEnter(e: PointerEvent): void {
    if (this.pauseOnHover && e.pointerType === 'mouse' && this.pauseState.canHoverPause) {
      this.pauseState.hover = true;
      this.syncPlayState();
    }
  }

  onPointerLeave(e: PointerEvent): void {
    this.release();
    if (e.pointerType !== 'mouse') return;
    this.pauseState.canHoverPause = true;
    this.pauseState.hover = false;
    this.syncPlayState();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') this.lastInput = 'keyboard';
    if (e.key === 'Escape' && this.phase === 'armed') {
      e.preventDefault();
      this.lastInput = 'keyboard';
      this.onUndoClick();
    }
  }

  private light(from = 0): void {
    const el = this.fuse === 'outline' ? this.rimRef?.nativeElement : this.lineRef?.nativeElement;
    if (!el) return;

    this.anim?.cancel();
    const keyframes = this.fuse === 'outline' ? OUTLINE_KEYFRAMES : LINE_KEYFRAMES;
    const a = el.animate(keyframes, { duration: this.windowMs, easing: 'linear', fill: 'forwards' });
    if (from) a.currentTime = from;

    a.onfinish = () => {
      this.fuseEnd.emit();
      if (this.commitOn === 'fuseEnd') this.commit.emit('fuseEnd');
      this.lastInput = 'pointer';
      this.go(this.settle === 'stay' ? 'settled' : 'idle');
    };
    this.anim = a;
    this.syncPlayState();
  }

  private go(next: FuseButtonPhase): void {
    this.instant = this.lastInput === 'keyboard';
    this.phase = next;
    this.phaseChange.emit(next);
    this.cdr.markForCheck();
    afterNextRender(() => this.applyFocusForPhase(), { injector: this.injector });
  }

  private applyFocusForPhase(): void {
    const root = this.rootRef?.nativeElement;
    const insideRoot = root ? root.contains(document.activeElement) : false;

    if (this.phase === 'armed') {
      this.undoRef?.nativeElement.focus({ preventScroll: true });
    } else if (insideRoot) {
      (this.phase === 'idle' ? this.idleRef?.nativeElement : root)?.focus({ preventScroll: true });
    }
  }

  private syncPlayState(): void {
    const a = this.anim;
    if (!a) return;
    const { hover, hidden } = this.pauseState;
    if (hover || hidden) {
      if (a.playState === 'running') a.pause();
    } else if (a.playState === 'paused') {
      a.play();
    }
  }

  private release(): void {
    this.rootRef?.nativeElement.removeAttribute('data-pressed');
  }

  private readonly onVisibilityChange = (): void => {
    this.pauseState.hidden = document.hidden;
    this.syncPlayState();
  };
}
