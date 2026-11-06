import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoberturaService } from '../../../core/services/cobertura.service';
import { ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { AdminModule } from '../admin.module';
import { CoberturaComponent } from './cobertura.component';
import { ReglasFranjasComponent } from '../reglas-franjas/reglas-franjas.component';

const REGLAS = { radioMaximoKm: 10, duracionBloqueMinutos: 120, horaInicioJornada: '08:00:00', horaFinJornada: '18:00:00' };

describe('Pestañas de Cobertura: la activa siempre coincide con la ruta', () => {
  const actualizar = vi.fn();

  beforeEach(async () => {
    actualizar.mockReset().mockReturnValue(of({ ...REGLAS, radioMaximoKm: 25 }));
    await TestBed.configureTestingModule({
      imports: [AdminModule],
      providers: [
        provideRouter([
          { path: 'admin/cobertura', component: CoberturaComponent },
          { path: 'admin/cobertura/franjas', component: ReglasFranjasComponent },
        ]),
        { provide: ReglasFranjasService, useValue: { obtener: () => of(REGLAS), actualizar } },
        { provide: CoberturaService, useValue: { obtener: () => of({ radioMaximoKm: 10 }), actualizar: vi.fn() } },
      ],
    }).compileComponents();
  });

  /** Lo que ve la persona: qué pestañas están resaltadas y cuál lleva aria-current. */
  const pestañas = (raiz: HTMLElement): { resaltadas: string[]; actual: string | null } => {
    const enlaces = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Configuración de agendamiento"] a'));
    return {
      resaltadas: enlaces.filter((a) => a.classList.contains('border-[#D98E4A]')).map((a) => a.textContent?.trim() ?? ''),
      actual: enlaces.find((a) => a.getAttribute('aria-current') === 'page')?.textContent?.trim() ?? null,
    };
  };

  const refrescar = (harness: RouterTestingHarness): void => {
    harness.fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    harness.detectChanges();
  };

  it('en Reglas de franjas resalta esa pestaña y la sigue resaltando después de guardar', async () => {
    const harness = await RouterTestingHarness.create();
    const pantalla = await harness.navigateByUrl('/admin/cobertura/franjas', ReglasFranjasComponent);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    const antes = pestañas(harness.routeNativeElement as HTMLElement);
    expect(antes).toEqual({ resaltadas: ['Reglas de franjas'], actual: 'Reglas de franjas' });

    pantalla.form.patchValue({ radioMaximoKm: 25 });
    pantalla.guardar();
    refrescar(harness);
    await harness.fixture.whenStable();
    refrescar(harness);

    expect(actualizar).toHaveBeenCalledOnce();
    expect(pestañas(harness.routeNativeElement as HTMLElement)).toEqual(antes);
  });

  it('la pestaña activa nunca lleva clases que se pisan con las de la inactiva (causa del resaltado que se perdía)', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/cobertura/franjas', ReglasFranjasComponent);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    const [cobertura, franjas] = Array.from((harness.routeNativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('nav a'));
    expect(Array.from(franjas.classList)).toEqual(expect.arrayContaining(['border-[#D98E4A]', 'text-white']));
    expect(franjas.classList.contains('text-white/60')).toBe(false);
    expect(franjas.classList.contains('border-transparent')).toBe(false);
    expect(Array.from(cobertura.classList)).toEqual(expect.arrayContaining(['border-transparent', 'text-white/60']));
    expect(cobertura.classList.contains('border-[#D98E4A]')).toBe(false);
  });

  it('con parámetros y ancla en la URL sigue marcando la pestaña correcta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/cobertura/franjas?x=1#arriba', ReglasFranjasComponent);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pestañas(harness.routeNativeElement as HTMLElement).actual).toBe('Reglas de franjas');
  });

  it('en Distancia y contacto resalta solo esa pestaña, y cambia al navegar entre las dos', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/cobertura', CoberturaComponent);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pestañas(harness.routeNativeElement as HTMLElement)).toEqual({ resaltadas: ['Distancia y contacto'], actual: 'Distancia y contacto' });

    await harness.navigateByUrl('/admin/cobertura/franjas', ReglasFranjasComponent);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pestañas(harness.routeNativeElement as HTMLElement)).toEqual({ resaltadas: ['Reglas de franjas'], actual: 'Reglas de franjas' });

    await TestBed.inject(Router).navigateByUrl('/admin/cobertura');
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pestañas(harness.routeNativeElement as HTMLElement)).toEqual({ resaltadas: ['Distancia y contacto'], actual: 'Distancia y contacto' });
  });
});
