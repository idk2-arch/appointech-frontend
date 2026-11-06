import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { SidebarMenuComponent, SidebarMenuItem } from './sidebar-menu.component';

describe('SidebarMenuComponent: insignia numérica', () => {
  let fixture: ComponentFixture<SidebarMenuComponent>;

  const ITEMS: SidebarMenuItem[] = [
    { value: 'citas', label: 'Citas', icon: 'calendar', routerLink: '/admin/citas' },
    { value: 'alertas', label: 'Alertas', icon: 'bell', routerLink: '/admin/alertas', badge: 3 },
  ];

  const insignias = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.sidebar-menu__badge')).map((e) => (e as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '');

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    await TestBed.configureTestingModule({ imports: [SharedModule, RouterModule.forRoot([])] }).compileComponents();
    fixture = TestBed.createComponent(SidebarMenuComponent);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('dibuja el número junto a la fila, con un texto para lectores de pantalla', () => {
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    expect(insignias()).toEqual(['3 pendientes']);
    expect(fixture.nativeElement.querySelector('.sidebar-menu__badge .sr-only')).not.toBeNull();
  });

  it('con 0 o sin número no dibuja nada', () => {
    fixture.componentRef.setInput('items', [{ ...ITEMS[1], badge: 0 }, { ...ITEMS[0], badge: null }, ITEMS[0]]);
    fixture.detectChanges();
    expect(insignias()).toEqual([]);
  });

  it('se actualiza cuando cambia el total', () => {
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
    fixture.componentRef.setInput('items', [ITEMS[0], { ...ITEMS[1], badge: 7 }]);
    fixture.detectChanges();
    expect(insignias()).toEqual(['7 pendientes']);
  });
});
