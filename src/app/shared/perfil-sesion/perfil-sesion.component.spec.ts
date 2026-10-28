import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SesionService } from '../../core/services/sesion.service';
import { SharedModule } from '../shared.module';
import { PerfilSesionComponent } from './perfil-sesion.component';

describe('PerfilSesionComponent', () => {
  let fixture: ComponentFixture<PerfilSesionComponent>;
  let sesion: SesionService;

  const enlace = (): HTMLAnchorElement => fixture.nativeElement.querySelector('a');

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [SharedModule, RouterModule.forRoot([])] }).compileComponents();
    sesion = TestBed.inject(SesionService);
    fixture = TestBed.createComponent(PerfilSesionComponent);
    fixture.componentRef.setInput('rol', 'Cliente');
    fixture.componentRef.setInput('enlace', '/cliente/perfil');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('enlaza a la página de perfil', () => {
    expect(enlace().getAttribute('href')).toBe('/cliente/perfil');
  });

  it('mientras no se conoce el nombre, dice "Mi perfil" y las iniciales salen del rol', () => {
    expect(enlace().textContent).toContain('Mi perfil');
    expect(fixture.nativeElement.querySelector('app-avatar [role="img"]').textContent.trim()).toBe('C');
  });

  it('con el nombre de la sesión lo muestra, con "Mi perfil" para lectores de pantalla', () => {
    sesion.establecerNombre('Ana Pérez');
    fixture.detectChanges();

    expect(enlace().textContent).toContain('Ana Pérez');
    expect(enlace().querySelector('.sr-only')?.textContent).toContain('Mi perfil');
    expect(fixture.nativeElement.querySelector('app-avatar [role="img"]').textContent.trim()).toBe('AP');
  });

  it('el nombre cambia sin recargar cuando la sesión lo actualiza', () => {
    sesion.establecerNombre('Ana Pérez');
    fixture.detectChanges();
    sesion.establecerNombre('Ana María Pérez');
    fixture.detectChanges();

    expect(enlace().textContent).toContain('Ana María Pérez');
  });
});
