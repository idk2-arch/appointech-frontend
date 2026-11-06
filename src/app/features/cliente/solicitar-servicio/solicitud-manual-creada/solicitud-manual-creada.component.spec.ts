import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Perfil } from '../../../../core/models/perfil';
import { PerfilService } from '../../../../core/services/perfil.service';
import { ClienteModule } from '../../cliente.module';
import { SolicitudManualCreadaComponent } from './solicitud-manual-creada.component';

const perfil = (telefono: string | null): Perfil =>
  ({ nombre: 'Ana', apellido: 'Pérez', correo: 'a@b.co', telefono, tipoDocumento: null, numeroDocumento: null }) as Perfil;

describe('SolicitudManualCreadaComponent', () => {
  let fixture: ComponentFixture<SolicitudManualCreadaComponent>;
  const obtener = vi.fn();

  const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

  async function crear(respuesta: unknown, entradas: Record<string, unknown> = {}): Promise<void> {
    obtener.mockReset().mockReturnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [{ provide: PerfilService, useValue: { obtener } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SolicitudManualCreadaComponent);
    for (const [clave, valor] of Object.entries({ motivo: 'SIN_TECNICOS_ESPECIALIDAD', especialidadNombre: 'Lavadoras', direccion: 'Calle 6 # 12-34', ...entradas })) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('explica que no hay técnicos para la especialidad y que un administrador lo contactará', async () => {
    await crear(of(perfil('300 123 4567')));

    expect(texto()).toContain('Recibimos tu solicitud');
    expect(texto()).toContain('Por ahora no hay técnicos disponibles para esta especialidad.');
    expect(texto()).toContain('Un administrador te contactará');
    expect(texto()).toContain('Lavadoras');
    expect(texto()).toContain('Calle 6 # 12-34');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('muestra el teléfono con el que lo contactarán', async () => {
    await crear(of(perfil(' 300 123 4567 ')));
    expect(texto()).toContain('Teléfono con el que te contactarán 300 123 4567');
    expect(fixture.componentInstance.telefono).toBe('300 123 4567');
  });

  it('sin teléfono registrado pide agregarlo en el perfil', async () => {
    await crear(of(perfil(null)));

    expect(texto()).toContain('No tenemos un teléfono registrado');
    expect(fixture.nativeElement.querySelector('a[href="/cliente/perfil"]')).not.toBeNull();
  });

  it('si no se puede leer el perfil, no bloquea la pantalla y pide el teléfono', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(texto()).toContain('Recibimos tu solicitud');
    expect(texto()).toContain('No tenemos un teléfono registrado');
  });

  it('mientras consulta el teléfono lo avisa', async () => {
    await crear(new Subject<Perfil>());
    expect(texto()).toContain('Consultando');
  });

  it('fuera de cobertura usa su propio mensaje; sin motivo, uno general', async () => {
    await crear(of(perfil(null)), { motivo: 'FUERA_DE_COBERTURA' });
    expect(texto()).toContain('Tu dirección está fuera de nuestra zona de cobertura automática.');

    TestBed.resetTestingModule();
    await crear(of(perfil(null)), { motivo: null });
    expect(texto()).toContain('no podemos ofrecerte horarios automáticos');
  });

  it('omite servicio y dirección si no se conocen', async () => {
    await crear(of(perfil(null)), { especialidadNombre: null, direccion: null });
    expect(texto()).not.toContain('Servicio');
    expect(texto()).not.toContain('Dirección');
  });

  it('"Volver al inicio" avisa al flujo', async () => {
    await crear(of(perfil(null)));
    const volver = vi.fn();
    fixture.componentInstance.volverInicio.subscribe(volver);

    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Volver al inicio'))!.click();
    expect(volver).toHaveBeenCalledOnce();
  });

  it('al destruirse cancela la consulta pendiente', async () => {
    const respuesta = new Subject<Perfil>();
    await crear(respuesta);
    fixture.destroy();
    expect(respuesta.observed).toBe(false);
  });
});
