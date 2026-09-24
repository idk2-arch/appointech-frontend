import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';

export type SidebarMenuIcon = 'chart' | 'users' | 'tool' | 'alert' | 'settings' | 'receipt';

export interface SidebarMenuItem {
  value: string;
  label: string;
  icon: SidebarMenuIcon;
  routerLink?: string | string[];
  disabled?: boolean;
  disabledTitle?: string;
}

/**
 * Flat sidebar nav list styled after "GlideSelect" (React Bits): a solid
 * surface with a pill that glides vertically between rows on hover, settling
 * under the active route when nothing is hovered. Only the visual language is
 * borrowed — this is a persistent nav list, not a dropdown/popover, so there is
 * no open/close state, trigger, or menu positioning to port.
 */
@Component({
  selector: 'app-sidebar-menu',
  standalone: false,
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.css'],
})
export class SidebarMenuComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: SidebarMenuItem[] = [];

  @ViewChild('list') private listRef?: ElementRef<HTMLElement>;
  @ViewChildren('rowEl') private rowRefs?: QueryList<ElementRef<HTMLElement>>;

  activeIndex = -1;
  hoveredIndex: number | null = null;
  pillTop = 0;
  pillHeight = 0;
  pillVisible = false;

  private resizeObserver?: ResizeObserver;
  private skipFirstResize = true;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private get targetIndex(): number {
    return this.hoveredIndex ?? this.activeIndex;
  }

  ngAfterViewInit(): void {
    this.placePill();
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.skipFirstResize) {
          this.skipFirstResize = false;
          return;
        }
        this.placePill();
      });
      if (this.listRef) {
        this.resizeObserver.observe(this.listRef.nativeElement);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && !changes['items'].firstChange) {
      queueMicrotask(() => this.placePill());
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onActiveChange(index: number, isActive: boolean): void {
    if (!isActive) return;
    this.activeIndex = index;
    this.cdr.markForCheck();
    queueMicrotask(() => this.placePill());
  }

  onRowEnter(index: number): void {
    this.hoveredIndex = index;
    this.placePill();
  }

  onRowLeave(): void {
    this.hoveredIndex = null;
    this.placePill();
  }

  private placePill(): void {
    const list = this.listRef?.nativeElement;
    const idx = this.targetIndex;
    const row = idx >= 0 ? this.rowRefs?.get(idx)?.nativeElement : undefined;
    if (!list) return;

    if (row) {
      this.pillTop = row.offsetTop;
      this.pillHeight = row.offsetHeight;
      this.pillVisible = true;
    } else {
      this.pillVisible = false;
    }
    this.cdr.markForCheck();
  }
}
