import { Component, ElementRef, Renderer2, ViewChild, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarEstiloServicio } from '../../Servicios/NavbarEstiloServicio';
import { NgStyle, CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Entorno } from '../../Entornos/Entorno';
import { ServicioCompartido } from '../../Servicios/ServicioCompartido';
import { Subscription } from 'rxjs';
import { CarritoComponent } from '../carrito/carrito.component';
import { RedSocialServicio } from '../../Servicios/RedSocialServicio';
import { AlertaServicio } from '../../Servicios/Alerta-Servicio';
import { PermisoServicio } from '../../Autorizacion/AutorizacionPermiso';
import { ReporteRedSocialServicio } from '../../Servicios/ReporteRedSocialServicio';
import { RedSocialImagenServicio } from '../../Servicios/RedSocialImagenServicio';
import { CarritoEstadoService } from '../../Servicios/CarritoEstadoServicio';
import { EmpresaServicio } from '../../Servicios/EmpresaServicio'; // Importar el servicio
import { MenuPortadaServicio } from '../../Servicios/MenuPortadaServicio';
import { LoadingService } from '../../Servicios/LoadingService';
import { Observable } from 'rxjs';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-header',
  imports: [NgStyle, CommonModule, FormsModule, NgIf, CarritoComponent, SpinnerComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  standalone: true,
})
export class HeaderComponent implements OnInit, OnDestroy {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  private subscription!: Subscription;
    // Variables para el spinner
  cargandoOverlay: Observable<boolean>;
  primaryColor: string = '';
  Datos: any = null;
  modoEdicion: boolean = false;
  datosOriginales: any = null;
  textoBusqueda: string = '';
  busquedaActiva: boolean = false;
  totalItemsCarrito: number = 0;
  mostrarCarrito = false;
  RedeSocial: any = [];
  esMovil: boolean = false;
  codigoEmpresa: number | null = null;
  Data: any = null;
  colorNavbarEIcono: string = '';
  colorTextoNavbar: string = '';

  @ViewChild('navbarCollapse') navbarCollapse!: ElementRef;

  constructor(
    private Servicio: NavbarEstiloServicio,
    private router: Router,
    private http: HttpClient,
    private renderer: Renderer2,
    private servicioCompartido: ServicioCompartido,
    private redSocialServicio: RedSocialServicio,
    public Permiso: PermisoServicio,
    private redSocialImagenServicio: RedSocialImagenServicio,
    private AlertaServicio: AlertaServicio,
    private carritoEstadoService: CarritoEstadoService,
    private ReporteRedSocialServicio: ReporteRedSocialServicio,
    private menuPortadaServicio: MenuPortadaServicio,
    private loadingService: LoadingService,
    private EmpresaServicio: EmpresaServicio // Inyectar el servicio
  ) { 
    this.cargandoOverlay = this.loadingService.loading$;
  }

  ngOnInit(): void {
    this.obtenerCodigoEmpresa().then(() => {
      this.Listado();
      this.cargarRedesSociales();
      this.cargarData();
      this.subscription = this.servicioCompartido.carritoVaciado$.subscribe(() => {
        this.obtenerTotalItemsCarrito();
      });
      this.obtenerTotalItemsCarrito();
      this.verificarVista();
    });
  }

  // Nuevo método para obtener el código de empresa
  private async obtenerCodigoEmpresa(): Promise<void> {
    try {
      const empresa = await this.EmpresaServicio.ConseguirPrimeraEmpresa().toPromise();
      if (empresa && empresa.CodigoEmpresa) {
        this.codigoEmpresa = empresa.CodigoEmpresa;
      } else {
        console.warn('No se encontró información de empresa');
        this.AlertaServicio.MostrarError('No se pudo obtener la información de la empresa');
      }
    } catch (error) {
      console.error('Error al obtener código de empresa:', error);
      this.AlertaServicio.MostrarError('Error al cargar información de empresa');
    }
  }

  // Modificar el método Listado para crear navbar si no existe
  Listado(): void {
    this.Servicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          // Existe el navbar, usar datos existentes
          this.Datos = data[0];
          this.actualizarEstilosCSS();
          this.servicioCompartido.setDatosHeader({
            urlImagenCarrito: this.Datos.UrlImagenCarrito,
            textoBuscador: this.Datos.TextoBuscador,
            urlImagenLupa: this.Datos.UrlImagenBuscador,
          });
        } else {
          // No existe navbar, crear uno nuevo con valores por defecto
          this.crearNavbarPorDefecto();
        }
      },
      error: (error) => {
        console.error('Error al cargar los datos del navbar:', error);
        // En caso de error, intentar crear navbar por defecto
        // this.crearNavbarPorDefecto();
      },
    });
  }

  // Nuevo método para crear navbar con valores por defecto
  private crearNavbarPorDefecto(): void {
    if (!this.codigoEmpresa) {
      this.AlertaServicio.MostrarError('No se puede crear el navbar sin información de empresa');
      return;
    }

    const navbarDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      TextoInicio: 'Nosotros',
      ColorTextoInicio: '#000000',
      TextoMenu: 'Menú',
      ColorTextoMenu: '#000000',
      TextoContacto: 'Contacto',
      ColorTextoContacto: '#000000',
      TextoOtro: 'Otro',
      ColortextoOtro: '#000000',
      ColorFondoOtro: '#f8f9fa',
      TextoReporte: 'Reportes',
      ColorTextextoReporte: '#000000',
      TextoBuscador: 'Buscar...',
      ColorTextoBuscador: '#000000',
      ColorFondoBuscador: '#ffffff',
      UrlImagenBuscador: '',
      UrlImagenCarrito: '',
      ColorFondoNavbar: '#ffffff',
      UrlLogo: '',
      Estatus: 1
    };

    this.Servicio.Crear(navbarDefecto).subscribe({
      next: (response) => {
        console.log('Navbar creado exitosamente:', response);
        this.AlertaServicio.MostrarExito('Configuración de navbar creada correctamente');

        // Asignar los datos del navbar creado
        this.Datos = response.Entidad || response;
        this.actualizarEstilosCSS();
        this.servicioCompartido.setDatosHeader({
          urlImagenCarrito: this.Datos.UrlImagenCarrito,
          textoBuscador: this.Datos.TextoBuscador,
          urlImagenLupa: this.Datos.UrlImagenBuscador,
        });
      },
      error: (error) => {
        console.error('Error al crear navbar por defecto:', error);
        this.AlertaServicio.MostrarError('Error al crear la configuración del navbar');

        // Como fallback, usar datos temporales para que la interfaz no se rompa
        this.Datos = navbarDefecto;
        this.actualizarEstilosCSS();
      }
    });
  }

  cargarData(): void {
    this.menuPortadaServicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.Data = data[0];
          this.colorNavbarEIcono = this.Data?.ColorFondoNombreClasificacion || '';
          this.colorTextoNavbar = this.Data?.ColorNombreClasificacion || '';
        }
      },
      error: (err) => {
      },
    });
  }

  // Modificar el método subirImagen para manejar la creación si no existe CodigoNavbar
  subirImagen(file: File, campoDestino: string): void {
    if (!this.Datos) {
      this.AlertaServicio.MostrarError('No hay datos de navbar disponibles');
      return;
    }

    // Si no existe CodigoNavbar, primero crear el navbar
    if (!this.Datos.CodigoNavbar) {
      this.AlertaServicio.MostrarAlerta('Creando configuración de navbar...', 'Por favor, espere');

      // Crear el navbar primero y luego subir la imagen
      this.Servicio.Crear(this.Datos).subscribe({
        next: (response) => {
          this.Datos = response.Entidad || response;
          // Ahora que tenemos el CodigoNavbar, proceder a subir la imagen
          this.ejecutarSubidaImagen(file, campoDestino);
        },
        error: (error) => {
          console.error('Error al crear navbar antes de subir imagen:', error);
          this.AlertaServicio.MostrarError('Error al crear la configuración del navbar');
        }
      });
    } else {
      // Ya existe el navbar, proceder directamente a subir la imagen
      this.ejecutarSubidaImagen(file, campoDestino);
    }
  }

  // Nuevo método para ejecutar la subida de imagen
  private ejecutarSubidaImagen(file: File, campoDestino: string): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'Navbar');
    formData.append('CodigoVinculado', this.Datos.CodigoEmpresa.toString());
    formData.append('CodigoPropio', this.Datos.CodigoNavbar.toString());
    formData.append('CampoVinculado', 'CodigoEmpresa');
    formData.append('CampoPropio', 'CodigoNavbar');
    formData.append('NombreCampoImagen', campoDestino);

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
      if (response?.Alerta) {
        this.AlertaServicio.MostrarAlerta(response.Alerta, 'Atención');
        return;
      }

      this.AlertaServicio.MostrarAlerta('Cargando imagen...', 'Por favor, espere');

      if (response && response.Entidad && response.Entidad[campoDestino]) {
        this.Datos[campoDestino] = response.Entidad[campoDestino];

        if (campoDestino === 'UrlImagenBuscador') {
          document.documentElement.style.setProperty(
            '--url-imagen-buscador',
            `url(${response.Entidad[campoDestino]})`
          );
        }

        const { UrlImagenBuscador, UrlImagenCarrito, UrlLogo, ...datosLimpios } = this.Datos;

        this.Servicio.Editar(datosLimpios).subscribe({
          next: () => {
            this.AlertaServicio.MostrarExito('Imagen actualizada correctamente');
            this.Listado();
            this.modoEdicion = false;
            this.loadingService.hide();
          },
          error: (error) => {
            this.loadingService.hide();
            if (error?.error?.Alerta) {
              this.AlertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
            } else {
              this.AlertaServicio.MostrarError('Error al actualizar el campo de imagen');
            }
          },
        });

      } else {
        this.loadingService.hide();
        const imageUrl =
          response.UrlImagenPortada ||
          response.url ||
          (response.Entidad ? response.Entidad.UrlImagenPortada : null);

        if (imageUrl) {
          this.Datos[campoDestino] = imageUrl;
          this.AlertaServicio.MostrarExito('Imagen subida correctamente');
        } else {
          this.AlertaServicio.MostrarAlerta('No se pudo obtener la URL de la imagen');
        }
      }
    },
    error: (error) => {
      this.loadingService.hide();
      if (error?.error?.Alerta) {
        this.AlertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
      } else {
        this.AlertaServicio.MostrarError('Error al subir la imagen. Por favor, intente de nuevo.');
      }
    },
  });
}

  // Los demás métodos permanecen igual...
  ReportarRedSocial(codigo: number | undefined): void {
    if (codigo === undefined) {
      console.warn('⚠️ Código de red social no definido, no se reporta');
      return;
    }

    const Datos = {
      CodigoRedSocial: codigo.toString(),
      Navegador: this.ObtenerNavegador()
    };

    this.ReporteRedSocialServicio.Crear(Datos).subscribe({
      next: (respuesta) => console.log('Red social reportada:', respuesta),
      error: (error) => console.error('Error al reportar red social:', error)
    });
  }

  ObtenerNavegador(): string {
    const AgenteUsuario = navigator.userAgent;

    if (AgenteUsuario.includes('Chrome') && !AgenteUsuario.includes('Edg')) {
      return 'Chrome';
    } else if (AgenteUsuario.includes('Firefox')) {
      return 'Firefox';
    } else if (AgenteUsuario.includes('Safari') && !AgenteUsuario.includes('Chrome')) {
      return 'Safari';
    } else if (AgenteUsuario.includes('Edg')) {
      return 'Edge';
    } else {
      return 'Desconocido';
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.verificarVista();
  }

  cargarRedesSociales(): void {
    this.redSocialServicio.Listado('Navbar').subscribe({
      next: (data) => {
        this.RedeSocial = data.filter((red: any) => red.Estatus === 1);
      },
      error: (error) => {
        console.error('Error al cargar redes sociales:', error);
      }
    });
  }

  // Resto de métodos permanecen igual...
  actualizarImagenRedSocial(event: any, codigoRedSocial: number): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!codigoRedSocial) {
      this.AlertaServicio.MostrarError('No se pudo identificar la red social');
      return;
    }

    const redSocial = this.RedeSocial.find((red: any) => red.CodigoRedSocial === codigoRedSocial);
    if (!redSocial) {
      this.AlertaServicio.MostrarError('Red social no encontrada');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (redSocial.Imagenes && redSocial.Imagenes.length > 0) {
        redSocial.Imagenes[0].UrlImagen = e.target.result;
      } else {
        redSocial.Imagenes = [{
          CodigoRedSocialImagen: null,
          UrlImagen: e.target.result,
          Ubicacion: 'Navbar'
        }];
      }
    };
    reader.readAsDataURL(file);

    this.subirImagenRedSocial(file, codigoRedSocial, redSocial);
  }

  subirImagenRedSocial(file: File, codigoRedSocial: number, redSocial: any): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'RedSocialImagen');
    formData.append('CodigoVinculado', codigoRedSocial.toString());

    const imagenExistente = redSocial.Imagenes?.find((img: any) => img.Ubicacion === 'Navbar');
    const tieneImagenValida = imagenExistente && imagenExistente.CodigoRedSocialImagen;

    if (tieneImagenValida) {
      formData.append('CodigoPropio', imagenExistente.CodigoRedSocialImagen.toString());
    } else {
      formData.append('CodigoPropio', '');
    }

    formData.append('CampoVinculado', 'CodigoRedSocial');
    formData.append('CampoPropio', 'CodigoRedSocialImagen');
    formData.append('NombreCampoImagen', 'UrlImagen');

    this.http.post(`${this.Url}subir-imagen`, formData)
      .subscribe({
        next: (response: any) => {
          if (response?.Alerta) {
            this.AlertaServicio.MostrarAlerta(response.Alerta, 'Atención');
            return;
          }

          if (response && response.Entidad && response.Entidad.UrlImagen) {
            this.procesarRespuestaImagen(codigoRedSocial, response, redSocial);
            this.loadingService.hide(); // Desbloquea UI
          } else {
            const imageUrl = response.UrlImagenPortada ||
              response.url ||
              (response.Entidad ? response.Entidad.UrlImagenPortada : null);

            if (imageUrl) {
              this.procesarRespuestaImagen(codigoRedSocial, { Entidad: { UrlImagen: imageUrl } }, redSocial);
            } else {
              this.loadingService.hide(); // Desbloquea UI
              this.AlertaServicio.MostrarError('Error al obtener la URL de la imagen');
            }
          }
        },
        error: (error) => {
          this.loadingService.hide(); // Desbloquea UI
          if (error?.error?.Alerta) {
            this.AlertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
          } else {
            this.AlertaServicio.MostrarError('Error al subir la imagen');
          }
          this.cargarRedesSociales();
        }
      });
  }
  procesarRespuestaImagen(codigoRedSocial: number, response: any, redSocial: any): void {
    const urlImagen = response.Entidad.UrlImagen;

    const imagenExistente = redSocial.Imagenes?.find((img: any) => img.Ubicacion === 'Navbar');

    if (imagenExistente && imagenExistente.CodigoRedSocialImagen) {
      this.actualizarRegistroRedSocialImagen(imagenExistente.CodigoRedSocialImagen, urlImagen);
    } else {
      const codigoImagenCreada = response.Entidad.CodigoRedSocialImagen;

      if (codigoImagenCreada) {
        this.actualizarRegistroRedSocialImagen(codigoImagenCreada, urlImagen);
      } else {
        this.crearRegistroRedSocialImagen(codigoRedSocial, urlImagen);
      }
    }
  }

  crearRegistroRedSocialImagen(codigoRedSocial: number, urlImagen: string): void {
    const datosNuevos = {
      CodigoRedSocial: codigoRedSocial,
      Ubicacion: 'Navbar',
      Estatus: 1
    };

    this.redSocialImagenServicio.Crear(datosNuevos).subscribe({
      next: (response) => {
        this.AlertaServicio.MostrarExito('Imagen de red social creada correctamente');
        this.cargarRedesSociales();
      },
      error: (error) => {
        this.AlertaServicio.MostrarError('Error al crear la imagen de la red social');
        this.cargarRedesSociales();
      }
    });
  }

  actualizarRegistroRedSocialImagen(codigoRedSocialImagen: number, urlImagen: string): void {
    const datosActualizados = {
      CodigoRedSocialImagen: codigoRedSocialImagen,
      Ubicacion: 'Navbar',
      Estatus: 1
    };

    this.redSocialImagenServicio.Editar(datosActualizados).subscribe({
      next: (response) => {
        this.AlertaServicio.MostrarExito('Imagen de red social actualizada correctamente');
        setTimeout(() => this.cargarRedesSociales(), 500);
      },
      error: (error) => {
        this.AlertaServicio.MostrarError('Error al actualizar la imagen de la red social');
        this.cargarRedesSociales();
      }
    });
  }

  buscar(): void {
    if (this.textoBusqueda.trim()) {
      this.busquedaActiva = true;
      this.router.navigate(['/productos/buscar'], { queryParams: { texto: this.textoBusqueda } });
    }
  }

  cancelarBusqueda(): void {
    if (this.textoBusqueda.trim()) {
      this.busquedaActiva = false;
      this.textoBusqueda = "";
    }
  }

  obtenerTotalItemsCarrito(): void {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      const carrito = JSON.parse(carritoGuardado);
      const totalItems = carrito.reduce((total: number, item: any) => total + (item.cantidad || 1), 0);
      this.totalItemsCarrito = totalItems;
    } else {
      this.totalItemsCarrito = 0;
    }
  }

  toggleModoEdicion(): void {
    if (!this.modoEdicion) {
      this.datosOriginales = JSON.parse(JSON.stringify(this.Datos));
      this.modoEdicion = true;
      document.body.classList.add('modoEdicion');
    } else {
      this.AlertaServicio.Confirmacion('¿Desea guardar los cambios?').then((confirmado) => {
        if (confirmado) {
          this.guardarCambios();
        } else {
          this.Datos = JSON.parse(JSON.stringify(this.datosOriginales));
          this.actualizarEstilosCSS();
        }
      });
      this.modoEdicion = false;
      document.body.classList.remove('modoEdicion');
    }
  }

  sincronizarColores(): void {
    if (this.Datos && this.Datos.length > 0) {
      const colorSeleccionado = this.Datos.ColorTextoInicio;
      this.Datos.ColorTextoMenu = colorSeleccionado;
      this.Datos.ColorTextoContacto = colorSeleccionado;
      this.Datos.ColorTextextoReporte = colorSeleccionado;
    }
  }

  guardarCambios(): void {
    if (this.Datos) {
      const datosActualizados = { ...this.Datos };

      delete datosActualizados.UrlImagenBuscador;
      delete datosActualizados.UrlImagenCarrito;
      delete datosActualizados.UrlLogo;

      datosActualizados.ColorTextoMenu = datosActualizados.ColorTextoInicio;
      datosActualizados.ColorTextoContacto = datosActualizados.ColorTextoInicio;
      datosActualizados.ColorTextextoReporte = datosActualizados.ColorTextoInicio;

      this.loadingService.show(); // Bloquea UI
      this.Servicio.Editar(datosActualizados).subscribe({
        next: (response) => {
          this.AlertaServicio.MostrarExito('Cambios guardados correctamente');
          this.modoEdicion = false;
          document.body.classList.remove('modoEdicion');
          this.datosOriginales = null;
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Error al guardar los cambios', error);
          this.AlertaServicio.MostrarAlerta('Error al guardar los cambios. Por favor, intente de nuevo.');
        },
      });
    } else {
      this.loadingService.hide();
      console.error('No hay datos disponibles para actualizar');
    }
  }

  actualizarEstilosCSS(): void {
    document.documentElement.style.setProperty(
      '--color-fondo-buscador',
      this.Datos?.ColorFondoBuscador || '#f0f0f0'
    );
    document.documentElement.style.setProperty(
      '--color-texto-buscador',
      this.Datos?.ColorTextoBuscador || '#000'
    );
    document.documentElement.style.setProperty(
      '--color-fondo-navbar',
      this.Datos?.ColorFondoNavbar || 'white'
    );
    document.documentElement.style.setProperty(
      '--url-imagen-buscador',
      `url(${this.Datos?.UrlImagenBuscador})`
    );
  }

  actualizarEstilosBuscador(): void {
    document.documentElement.style.setProperty(
      '--color-fondo-buscador',
      this.Datos?.ColorFondoBuscador || '#f0f0f0'
    );
    document.documentElement.style.setProperty(
      '--color-texto-buscador',
      this.Datos?.ColorTextoBuscador || '#000'
    );
  }

  actualizarLogo(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.Datos.UrlLogo = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlLogo');
    }
  }

  actualizarImagenBuscador(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.Datos.UrlImagenBuscador = e.target.result;
        document.documentElement.style.setProperty(
          '--url-imagen-buscador',
          `url(${e.target.result})`
        );
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenBuscador');
    }
  }

  actualizarImagenCarrito(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.Datos.UrlImagenCarrito = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenCarrito');
    }
  }

  cerrarNavbarSiEsMovil() {
    if (window.innerWidth < 992) {
      const el = this.navbarCollapse.nativeElement;
      this.renderer.removeClass(el, 'show');
    }
  }

  navegar(ruta: string) {
    this.cerrarNavbarSiEsMovil();
    this.router.navigate([ruta]);
  }

  estaRutaActiva(ruta: string): boolean {
    return this.router.url === ruta || this.router.url.startsWith(ruta + '/');
  }

  openColorPicker(): void {
    const colorInput = document.getElementById(
      'colorPicker'
    ) as HTMLInputElement;
    colorInput.click();
  }

  changeColor(event: Event): void {
    const color = (event.target as HTMLInputElement).value;

    document.documentElement.style.setProperty('--color-fondo-navbar', color);

    if (this.Datos) {
      this.Datos.ColorFondoNavbar = color;
    } else {
      console.error('No hay datos disponibles para actualizar');
    }
  }

  alternarCarrito() {
    this.mostrarCarrito = !this.mostrarCarrito;

    if (this.mostrarCarrito) {
      this.carritoEstadoService.abrirCarrito();
    } else {
      this.carritoEstadoService.cerrarCarrito();
    }
  }

  verificarVista() {
    this.esMovil = window.innerWidth <= 768 ||
      window.innerWidth <= 991 ||
      window.innerWidth <= 576 ||
      window.innerWidth <= 820;
  }

  cerrarSesion() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('colorClasificacion');
    localStorage.removeItem('colorClasificacionTexto');
    this.router.navigate(['/login']);
  }
}