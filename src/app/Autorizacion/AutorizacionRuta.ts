import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { LoginServicio } from '../Servicios/LoginServicio';

@Injectable({
  providedIn: 'root'
})
export class AutorizacionRuta implements CanActivate {

  constructor(private LoginServicio: LoginServicio, private router: Router) {}

canActivate(
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean {
  console.log('%c[AutorizacionRuta] → canActivate()', 'color:blue; font-weight:bold;');
  console.log('Ruta solicitada:', state.url);
  console.log('Snapshot completo:', next);

  const tokenValido = this.LoginServicio.ValidarToken();
  console.log('Resultado de ValidarToken():', tokenValido);

  if (tokenValido) {
    console.log('✔️ Acceso permitido');
    return true;
  } else {
    console.warn('❌ Token inválido, eliminando token y redirigiendo al login');
    this.LoginServicio.EliminarToken();
    setTimeout(() => {
      console.log('➡️ Redireccionando al login con delay');
      this.router.navigate(['/login']);
    }, 0);
    return false;
  }
}

}
