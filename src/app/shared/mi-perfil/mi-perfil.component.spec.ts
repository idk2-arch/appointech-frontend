import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { SesionService } from '../../core/services/sesion.service';
import { SharedModule } from '../shared.module';
import { MiPerfilComponent } from './mi-perfil.component';

describe('MiPerfilComponent', () => {
  let fixture: ComponentFixture<MiPerfilComponent>;
  let componente: MiPerfilComponent;
  let servicio: { subirPropia: ReturnType<typeof vi.fn>; quitarPropia: ReturnType<typeof vi.fn> };
  let sesion: SesionService;

  beforeEach(async () => {
    localStorage.clear();
    servicio = {
      subirPropia: vi.fn().mockReturnValue(of({ fotoUrl: '/api/fotos/nueva' })),
      quitarPropia: vi.fn().mockReturnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: FotoPerfilService, useValue: servicio }],
    }).compileComponents();
    sesion = TestBed.inject(SesionService);
    fixture = TestBed.createComponent(MiPerfilComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('al guardar envía la foto, actualiza la sesión y avisa', () => {
    componente.guardar('data:image/jpeg;base64,QUJD');
    fixture.detectChanges();

    expect(servicio.subirPropia).toHaveBeenCalledWith('data:image/jpeg;base64,QUJD');
    expect(sesion.fotoUrl).toBe('/api/fotos/nueva');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('actualizada');
    expect(componente.enviando).toBe(false);
  });

  it('al quitar borra la foto de la sesión', () => {
    sesion.establecerFoto('/api/fotos/vieja');

    componente.quitar();
    fixture.detectChanges();

    expect(servicio.quitarPropia).toHaveBeenCalledTimes(1);
    expect(sesion.fotoUrl).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('eliminada');
  });

  it('si el servidor rechaza la foto muestra su mensaje y conserva la foto actual', () => {
    sesion.establecerFoto('/api/fotos/vieja');
    servicio.subirPropia.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, error: 'Imagen inválida' } }))
    );

    componente.guardar('data:image/jpeg;base64,QUJD');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Imagen inválida');
    expect(sesion.fotoUrl).toBe('/api/fotos/vieja');
    expect(componente.enviando).toBe(false);
  });
});
