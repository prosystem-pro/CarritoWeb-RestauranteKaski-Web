import { Injectable } from '@angular/core';
import { LoginServicio } from '../Servicios/LoginServicio';

@Injectable({
  providedIn: 'root',
})
export class PermisoServicio {
  constructor(private loginServicio: LoginServicio) { }

  private ObtenerPayload(): any | null {
    const token = this.loginServicio.ObtenerToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }


  // Solo SuperAdmin
  PermisoSuperAdmin(): boolean {
    if (!this.loginServicio.ValidarToken()) {
      this.LimpiarDatosToken();
      return false;
    }

    const payload = this.ObtenerPayload();
    return payload?.SuperAdmin === 1;
  }

  // Admin o SuperAdmin
  PermisoAdminSuperAdmin(): boolean {
    if (!this.loginServicio.ValidarToken()) {
      this.LimpiarDatosToken();
      return false;
    }

    const payload = this.ObtenerPayload();
    return payload?.SuperAdmin === 1 || payload?.NombreRol === 'Administrador';
  }
  LimpiarDatosToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('colorClasificacion');
    localStorage.removeItem('colorClasificacionTexto');
  }

  // // Solo SuperAdmin
  // PermisoSuperAdmin(): boolean {
  //   const payload = this.ObtenerPayload();
  //   return payload?.SuperAdmin === 1;
  // }

  // // Admin o SuperAdmin
  // PermisoAdminSuperAdmin(): boolean {
  //   const payload = this.ObtenerPayload();
  //   return payload?.SuperAdmin === 1 || payload?.NombreRol === 'Administrador';
  // }

  EsSoloAdmin(): boolean {
    const payload = this.ObtenerPayload();
    return payload?.NombreRol === 'Administrador' && payload?.SuperAdmin !== 1;
  }

  // También podrías tener un helper si quisieras
  ObtenerRol(): string {
    return this.ObtenerPayload()?.NombreRol ?? '';
  }
}
