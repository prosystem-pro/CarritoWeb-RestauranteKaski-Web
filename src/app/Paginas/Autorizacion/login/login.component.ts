import { Component, OnInit } from '@angular/core';
import { LoginServicio } from '../../../Servicios/LoginServicio';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoginPortadaServicio } from '../../../Servicios/LoginPortada';
import { PermisoServicio } from '../../../Autorizacion/AutorizacionPermiso';
import { Entorno } from '../../../Entornos/Entorno';
import { AlertaServicio } from '../../../Servicios/Alerta-Servicio';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  NombreUsuario: string = '';
  Clave: string = '';
  // recordarUsuario: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  modoEdicion = false;
  datosOriginales: any = null;

  // Propiedad para almacenar la portada de login
  portadaLogin: any = null;

  constructor(
    private LoginServicio: LoginServicio,
    private router: Router,
    private loginPortadaServicio: LoginPortadaServicio,
    public Permiso: PermisoServicio,
    private http: HttpClient,
    private alertaServicio: AlertaServicio
  ) {}

  ngOnInit(): void {
    this.obtenerPortadaLogin();
    // this.cargarUsuarioRecordado();
  }

  obtenerPortadaLogin(): void {
    this.loginPortadaServicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.portadaLogin = data[0];
          console.log(this.portadaLogin);
        } else {
          this.crearLoginPortadaPorDefecto();
        }
      },
      error: (error) => {
        console.error('Error al obtener la portada de login', error);
        // this.crearLoginPortadaPorDefecto();
      },
    });
  }

  private crearLoginPortadaPorDefecto(): void {
    const portadaDefecto = {
      UrlImagenPortada: '',
      UrlImagenDecorativaIzquierda: '',
      UrlImagenDecorativaDerecha: '',
      Color: '#44261B',
      Estatus: 1
    };

    this.loginPortadaServicio.Crear(portadaDefecto).subscribe({
      next: (response) => {
        this.portadaLogin = response.Entidad || response;
        this.alertaServicio.MostrarExito('Se creó una configuración de login por defecto');
        this.obtenerPortadaLogin();
      },
      error: (error) => {
        console.error('Error al crear portada de login por defecto:', error);
        this.alertaServicio.MostrarError('No se pudo crear la configuración inicial del login');
      }
    });
  }

  // cargarUsuarioRecordado(): void {
  //   // Cargar usuario recordado del localStorage si existe
  //   const usuarioRecordado = localStorage.getItem('usuarioRecordado');
  //   if (usuarioRecordado) {
  //     this.NombreUsuario = usuarioRecordado;
  //     this.recordarUsuario = true;
  //   }
  // }

  // Método para activar/desactivar el modo edición
  toggleModoEdicion(): void {
    if (!this.modoEdicion) {
      // Hacer una copia profunda de los datos antes de entrar en modo edición
      this.datosOriginales = JSON.parse(JSON.stringify(this.portadaLogin));
      this.modoEdicion = true;
      document.body.classList.add('modoEdicion');
    } else {
      // Usar el servicio de alerta para la confirmación
      this.alertaServicio
        .Confirmacion('¿Desea guardar los cambios?')
        .then((confirmado) => {
          if (confirmado) {
            this.guardarCambios();
          } else {
            // Restaurar datos originales si cancela
            this.portadaLogin = JSON.parse(
              JSON.stringify(this.datosOriginales)
            );
          }

          // Salir del modo edición solo después de decidir
          this.modoEdicion = false;
          document.body.classList.remove('modoEdicion');
        });
    }
  }

  // Método para guardar los cambios
  guardarCambios(): void {
    if (this.portadaLogin) {
      const datosActualizados = { ...this.portadaLogin };

      delete datosActualizados.UrlImagenPortada;
      delete datosActualizados.UrlImagenDecorativaIzquierda;
      delete datosActualizados.UrlImagenDecorativaDerecha;

      this.loginPortadaServicio.Editar(datosActualizados).subscribe({
        next: (response) => {
          this.alertaServicio.MostrarExito('Cambios guardados correctamente');
          this.modoEdicion = false;
          document.body.classList.remove('modoEdicion');
          this.datosOriginales = null;
        },
        error: (error) => {
          this.alertaServicio.MostrarError(
            error,
            'Error al guardar los cambios. Por favor, intente de nuevo.'
          );
        },
      });
    } else {
      console.error('No hay datos disponibles para actualizar');
    }
  }

  login(): void {
    // Limpiar mensaje de error anterior
    this.errorMessage = '';
    this.isLoading = true;

    // Validación básica
    if (!this.NombreUsuario.trim() || !this.Clave.trim()) {
      this.errorMessage = 'Por favor, complete todos los campos';
      this.isLoading = false;
      return;
    }

    this.LoginServicio.Login(this.NombreUsuario, this.Clave).subscribe({
      next: (response) => {
        // Guardar o eliminar usuario recordado
        // if (this.recordarUsuario) {
        //   localStorage.setItem('usuarioRecordado', this.NombreUsuario);
        // } else {
        //   localStorage.removeItem('usuarioRecordado');
        // }

        // Guardar token de autenticación si viene en la respuesta
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }

        this.isLoading = false;
        this.router.navigate(['/nosotros']);
      },
      error: (error) => {
        console.error('Error en el login', error);
        this.isLoading = false;

        // Manejo de errores más específico
        if (error.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          this.errorMessage =
            'Error de conexión. Verifique su conexión a internet';
        } else {
          this.errorMessage = 'Error del servidor. Intente nuevamente';
        }
      },
    });
  }

  actualizarImagenPortada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagen(file, 'UrlImagenPortada');
    }
  }

  actualizarImagenPortadaIzquierda(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagen(file, 'UrlImagenDecorativaIzquierda');
    }
  }

  actualizarImagenPortadaDerecha(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagen(file, 'UrlImagenDecorativaDerecha');
    }
  }

  // Método general para subir imágenes
  subirImagen(file: File, campoDestino: string): void {
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'LoginPortada');
    formData.append('CodigoPropio', this.portadaLogin.CodigoLoginPortada);
    formData.append('CampoPropio', 'CodigoLoginPortada');
    formData.append('NombreCampoImagen', campoDestino);
  // Mostrar en consola los datos del FormData

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        if (response && response.Entidad && response.Entidad[campoDestino]) {
          this.portadaLogin[campoDestino] = response.Entidad[campoDestino];

          const datosActualizados = { ...this.portadaLogin };

          delete datosActualizados.UrlImagenPortada;
          delete datosActualizados.UrlImagenDecorativaIzquierda;
          delete datosActualizados.UrlImagenDecorativaDerecha;

          this.loginPortadaServicio.Editar(datosActualizados).subscribe({
            next: (updateResponse) => {
              this.alertaServicio.MostrarExito(
                'Imagen actualizada correctamente'
              );
              this.obtenerPortadaLogin();
              this.modoEdicion = false;
            },
            error: (updateError) => {
              this.alertaServicio.MostrarError('Error al actualizar la imagen');
            },
          });
        }
      },
      error: (error) => {
        this.alertaServicio.MostrarError(
          error,
          'Error al subir la imagen. Por favor, intente de nuevo.'
        );
      },
    });
  }
}