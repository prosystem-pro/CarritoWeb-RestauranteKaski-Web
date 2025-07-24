import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClasificacionProductoServicio } from '../../../Servicios/ClasificacionProductoServicio';
import { MenuPortadaServicio } from '../../../Servicios/MenuPortadaServicio';
import { HttpClient } from '@angular/common/http';
import { Entorno } from '../../../Entornos/Entorno';
import { Subscription } from 'rxjs';
import { CarruselImagenServicio } from '../../../Servicios/CarruselImagnServicio';
import { CarruselComponent } from '../../../Componentes/carrusel/carrusel.component';
import { CarruselServicio } from '../../../Servicios/CarruselServicio';
import { SvgDecoradorComponent } from '../../../Componentes/svg-decorador/svg-decorador.component';
import { Router } from '@angular/router';
import { ServicioCompartido } from '../../../Servicios/ServicioCompartido';
import { EmpresaServicio } from '../../../Servicios/EmpresaServicio';
import { AlertaServicio } from '../../../Servicios/Alerta-Servicio';
import { PermisoServicio } from '../../../Autorizacion/AutorizacionPermiso';
import { LoadingService } from '../../../Servicios/LoadingService';
import { SpinnerComponent } from '../../../Componentes/spinner/spinner.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-menuCategoria',
  imports: [NgFor, NgIf, FormsModule, CommonModule, CarruselComponent, SvgDecoradorComponent, SpinnerComponent],
  templateUrl: './menuCategoria.component.html',
  styleUrl: './menuCategoria.component.css',
})
export class MenuCategoriaComponent implements OnInit {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  private textoBusquedaSubscription!: Subscription;
    // Variables para el spinner
  cargandoOverlay: Observable<boolean>;

  modoEdicion = false;
  mostrarPanelColor = false;
  menuPortada: any = null;
  clasificaciones: any[] = [];
  clasificacionesOriginales: any[] = [];
  tituloPrincipal: string = '';
  editandoTituloPrincipal: boolean = false;
  tituloPrincipalOriginal: string = '';
  tituloPrincipalTemporal: string = '';
  editandoTitulo: number | null = null;
  tituloOriginal: string = '';
  tituloTemporal: string = '';
  carruselData: any = null;
  detallesCarrusel: any = null;
  titulo: string = ''
  codigoCarrusel: number = 0;
  datosListos: boolean = false;
  empresaData: any = null;
  codigoEmpresa: number = 0;
  isLoadingCrear: boolean = false;

  nuevaCategoria = {
    titulo: '',
    imagenFile: null as File | null,
    imagenPreview: null,
  };

  isLoading = true;
  error = false;

  coloresPredefinidos = [
    '#ff9500', //Default
    '#3498db', // Azul cielo
    '#2ecc71', // Verde esmeralda
    '#e74c3c', // Rojo coral
    '#f39c12', // Naranja ámbar
    '#9b59b6', // Púrpura amatista
    '#34495e', // Azul oscuro grisáceo
    '#ffffff', // Blanco
  ];

  constructor(
    private clasificacionProductoServicio: ClasificacionProductoServicio,
    private carruselServicio: CarruselServicio,
    private carruselImagenServicio: CarruselImagenServicio,
    private menuPortadaServicio: MenuPortadaServicio,
    private router: Router,
    private servicioCompartido: ServicioCompartido,
    private empresaServicio: EmpresaServicio,
    private alertaServicio: AlertaServicio,
    public Permiso: PermisoServicio,
    private loadingService: LoadingService,
    private http: HttpClient
  ) { 
    this.cargandoOverlay = this.loadingService.loading$;
  }

  ngOnInit(): void {
    this.cargarDataEmpresa();
    this.cargarMenuPortada();
    this.cargarClasificaciones();
    this.cargarDatosCarrusel();
  }

  ngOnDestroy(): void {
    if (this.textoBusquedaSubscription) {
      this.textoBusquedaSubscription.unsubscribe();
    }
  }

  toggleColorPanel(): void {
    this.mostrarPanelColor = !this.mostrarPanelColor;
  }

  cargarMenuPortada(): void {
    this.menuPortadaServicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.menuPortada = data[0];
          // Actualizar el título principal
          this.tituloPrincipal =
            this.menuPortada.TituloMenu || '';
          this.servicioCompartido.setDatosClasificacion({
            colorClasificacionFondo: this.menuPortada?.ColorFondoNombreClasificacion || '',
            colorClasificacionTexto: this.menuPortada?.ColorNombreClasificacion || '',
          });
        } else {
          this.crearMenuPortadaPorDefecto();
        }
      },
      error: (err) => {
        // this.crearMenuPortadaPorDefecto();
      },
    });
  }

  // Crear MenuPortada si no existe
  private crearMenuPortadaPorDefecto(): void {
    const menuPortadaDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      UrlImagenNavbar: '',
      UrlImagenPortadaIzquierdo: '',
      UrlImagenPortadaDerecho: '',
      TituloMenu: 'Nuestro Menú',
      ColorTituloMenu: '#ff9500',
      UrlImagenMenu: '',
      ColorContornoImagenClasificacion: '#ff9500',
      ColorNombreClasificacion: '#000000',
      ColorFondoNombreClasificacion: '#ff9500',
      UrlImagenPresentacion: '',
      Estatus: 1,
    };

    this.menuPortadaServicio.Crear(menuPortadaDefecto).subscribe({
      next: (response) => {
        console.log('MenuPortada creado exitosamente:', response);
        this.menuPortada = response.Entidad || response;
        this.tituloPrincipal = this.menuPortada.TituloMenu || '';
        this.servicioCompartido.setDatosClasificacion({
          colorClasificacionFondo: this.menuPortada?.ColorFondoNombreClasificacion || '',
          colorClasificacionTexto: this.menuPortada?.ColorNombreClasificacion || '',
        });
      },
      error: (error) => {
        console.error('Error al crear MenuPortada:', error);
        // Usar datos por defecto para que la interfaz no se rompa
        this.menuPortada = menuPortadaDefecto;
        this.tituloPrincipal = menuPortadaDefecto.TituloMenu;
      }
    });
  }

  cargarClasificaciones(): void {
    this.isLoading = true;
    this.clasificacionProductoServicio.Listado().subscribe({
      next: (data: any[]) => {
        console.log('Clasificaciones recibidas de la API:', data);
        this.clasificaciones = data.filter(
          (item) =>
            item.NombreClasificacionProducto &&
            item.NombreClasificacionProducto.trim() !== '' &&
            item.CodigoClasificacionProducto !== 0
        );
        this.clasificacionesOriginales = [...this.clasificaciones];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al obtener clasificaciones:', err);
        this.error = true;
        this.isLoading = false;
      },
    });
  }

  cargarDatosCarrusel(): void {
    this.carruselServicio.Listado().subscribe({
      next: (data) => {
        // Buscar carrusel únicamente por ubicación 'MenuCategoria'
        let carruselMenuCategoria = null;

        if (data && data.length > 0) {
          carruselMenuCategoria = data.find(c => c.Ubicacion === 'MenuCategoria');
        }

        if (carruselMenuCategoria) {
          this.carruselData = carruselMenuCategoria;
          this.codigoCarrusel = this.carruselData.CodigoCarrusel;
          this.titulo = this.carruselData.NombreCarrusel;
          this.cargarImagenesCarrusel();
        } else {
          this.crearCarruselPorDefecto();
        }
      },
      error: (err) => {
        // this.crearCarruselPorDefecto();
      }
    });
  }

  // Crear Carrusel si no existe
  private crearCarruselPorDefecto(): void {
    const carruselDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      NombreCarrusel: 'Galería de Menú',
      Descripcion: 'Carrusel de imágenes para la sección de categorías de menú',
      Ubicacion: 'MenuCategoria',
      Estatus: 1
    };

    this.carruselServicio.Crear(carruselDefecto).subscribe({
      next: (response) => {
        console.log('Carrusel creado exitosamente:', response);
        this.carruselData = response.Entidad || response;
        this.codigoCarrusel = this.carruselData.CodigoCarrusel;
        this.titulo = this.carruselData.NombreCarrusel;
        this.cargarImagenesCarrusel();
      },
      error: (error) => {
        console.error('Error al crear carrusel:', error);
        // Usar datos por defecto para que la interfaz no se rompa
        this.carruselData = carruselDefecto;
        this.detallesCarrusel = [];
        this.datosListos = true;
      }
    });
  }

  private cargarImagenesCarrusel(): void {
    if (this.carruselData?.CodigoCarrusel) {
      this.carruselImagenServicio.ListadoCarrusel(this.carruselData.CodigoCarrusel).subscribe({
        next: (data) => {
          this.detallesCarrusel = data;
          this.datosListos = true;
        },
        error: (err) => {
          this.detallesCarrusel = [];
          this.datosListos = true;
        }
      });
    }
  }

  cargarDataEmpresa(): void {
    this.empresaServicio.Listado().subscribe({
      next: (data) => {
        this.empresaData = data[0];
        this.codigoEmpresa = this.empresaData.CodigoEmpresa;
      },
      error: (err) => {
        console.error('Error al obtener datos de la empresa:', err);
      }
    });
  }

  toggleModoEdicion() {
    this.modoEdicion = !this.modoEdicion;
    document.body.classList.toggle('modoEdicion', this.modoEdicion);

    if (!this.modoEdicion) {
      this.mostrarPanelColor = false;
      this.resetNuevaCategoria();
    }
  }

  iniciarEdicionTituloPrincipal() {
    this.tituloPrincipalOriginal = this.tituloPrincipal;
    this.editandoTituloPrincipal = true;
    this.tituloPrincipalTemporal = this.tituloPrincipal;
  }

  onTituloPrincipalInput(evento: any) {
    this.tituloPrincipalTemporal = evento.target.textContent;
  }

  guardarTituloPrincipal() {
    this.tituloPrincipal = this.tituloPrincipalTemporal.trim();

    if (this.menuPortada) {
      this.menuPortada.TituloMenu = this.tituloPrincipal;
      this.actualizarMenuPortada();
    }

    this.editandoTituloPrincipal = false;
  }

  cancelarEdicionTituloPrincipal() {
    this.tituloPrincipal = this.tituloPrincipalOriginal;
    this.editandoTituloPrincipal = false;
    console.log('Edición del título principal cancelada');
  }

  iniciarEdicionTitulo(clasificacion: any) {
    this.tituloOriginal = clasificacion.NombreClasificacionProducto;
    this.editandoTitulo = clasificacion.CodigoClasificacionProducto;
    this.tituloTemporal = clasificacion.NombreClasificacionProducto;
  }

  onTituloInput(evento: any, clasificacion: any) {
    this.tituloTemporal = evento.target.textContent;
  }

  guardarTituloClasificacion(clasificacion: any) {
    clasificacion.NombreClasificacionProducto = this.tituloTemporal.trim();
    this.actualizarClasificacion(clasificacion);
    this.editandoTitulo = null;
    this.alertaServicio.MostrarExito('Título guardado correctamente', 'Éxito');
  }

  cancelarEdicionTitulo(clasificacion: any) {
    clasificacion.NombreClasificacionProducto = this.tituloOriginal;
    const elements = document.querySelectorAll(
      '[data-id="' + clasificacion.CodigoClasificacionProducto + '"]'
    );
    if (elements.length > 0) {
      elements[0].textContent = this.tituloOriginal;
    }
    this.editandoTitulo = null;
    console.log('Edición cancelada');
  }

  cambiarImagen(evento: any, clasificacion: any) {
    const file = evento.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        clasificacion.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, clasificacion);
    }
  }

  seleccionarImagenNuevaCategoria(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nuevaCategoria.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.nuevaCategoria.imagenFile = file;
    }
  }

  actualizarImagenPortadaIzquierda(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagenDecorativo(file, 'UrlImagenPortadaIzquierdo');
    }
  }

  actualizarImagenPortadaDerecha(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagenDecorativo(file, 'UrlImagenPortadaDerecho');
    }
  }

  actualizarImagenTemporada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.subirImagenDecorativo(file, 'UrlImagenPresentacion');
    }
  }

  subirImagenDecorativo(file: File, campoDestino: string): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'MenuPortada');
    formData.append('CodigoVinculado', this.menuPortada.CodigoEmpresa);
    formData.append('CodigoPropio', this.menuPortada.CodigoMenuPortada);
    formData.append('CampoVinculado', 'CodigoEmpresa');
    formData.append('CampoPropio', 'CodigoMenuPortada');
    formData.append('NombreCampoImagen', campoDestino);

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        if (response?.Alerta) {
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }

        if (response && response.Entidad && response.Entidad[campoDestino]) {
          this.menuPortada[campoDestino] = response.Entidad[campoDestino];
          const {
            UrlImagenNavbar,
            UrlImagenPortadaIzquierdo,
            UrlImagenPortadaDerecho,
            UrlImagenMenu,
            UrlImagenPresentacion,
            ...datosActualizados
          } = this.menuPortada;

          this.menuPortadaServicio.Editar(datosActualizados).subscribe({
            next: () => {
              this.alertaServicio.MostrarExito('Imagen actualizada correctamente', 'Éxito');
                  this.cargarMenuPortada();
              this.modoEdicion = false;
              this.loadingService.hide();
            },
            error: (error) => {
              this.loadingService.hide();
              if (error?.error?.Alerta) {
                this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
              } else {
                this.alertaServicio.MostrarError('Error al actualizar la imagen');
              }
            }
          });
        }
      },
      error: (error) => {
        this.loadingService.hide();
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError('Error al subir la imagen');
        }
      }
    });
  }

  subirImagenNuevaCategoria() {
    if (this.nuevaCategoria.titulo && this.nuevaCategoria.imagenFile) {
      // Verificar si ya existe una clasificacion con el mismo nombre
      if (
        this.nuevaCategoria.titulo &&
        this.existeClasificacionConMismoNombre(this.nuevaCategoria.titulo)
      ) {
        this.alertaServicio.MostrarAlerta(
          'Ya existe una clasificación con el mismo nombre. Por favor, elija otro nombre.'
        );
        this.isLoading = false;
        return;
      }

      this.isLoadingCrear = true;
      this.loadingService.show(); // Bloquea UI
      const formData = new FormData();
      formData.append('Imagen', this.nuevaCategoria.imagenFile);
      formData.append('CarpetaPrincipal', this.NombreEmpresa);
      formData.append('SubCarpeta', 'ClasificacionProducto');
      formData.append('CodigoVinculado', this.codigoEmpresa.toString() || '1');
      formData.append('CodigoPropio', ''); // Vacío para que el servidor cree uno nuevo
      formData.append('CampoVinculado', 'CodigoEmpresa');
      formData.append('CampoPropio', 'CodigoClasificacionProducto');
      formData.append('NombreCampoImagen', 'UrlImagen');

      this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
        next: (response: any) => {
          if (response?.Alerta) {
            this.isLoadingCrear = false;
            this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
            return;
          }

          if (response && response.Entidad) {
            // Construir objeto con los datos recibidos
            const nuevaClasificacionCompleta = {
              CodigoClasificacionProducto: response.Entidad.CodigoClasificacionProducto,
              CodigoEmpresa: this.codigoEmpresa,
              NombreClasificacionProducto: this.nuevaCategoria.titulo,
              UrlImagen: response.Entidad.UrlImagen || '',
              Estatus: 1,
            };

            // Excluir UrlImagen para enviar solo datos que deben actualizarse
            const { UrlImagen, ...datosActualizados } = nuevaClasificacionCompleta;

            this.clasificacionProductoServicio.Editar(datosActualizados).subscribe({
              next: () => {
                this.isLoadingCrear = false;
                this.loadingService.hide();
                this.alertaServicio.MostrarExito('Nueva categoría creada correctamente', 'Éxito');
                this.cargarClasificaciones();
                this.resetNuevaCategoria();
              },
              error: (updateError) => {
                this.isLoadingCrear = false;
                this.loadingService.hide();
                if (updateError?.error?.Alerta) {
                  this.alertaServicio.MostrarAlerta(updateError.error.Alerta, 'Atención');
                } else {
                  this.alertaServicio.MostrarError(updateError, 'Error al crear la categoría');
                }
                this.cargarClasificaciones();
              },
            });
          } else {
            this.isLoadingCrear = false;
            this.loadingService.hide();
            this.alertaServicio.MostrarError('Error al procesar la respuesta del servidor', 'Error');
          }
        },
        error: (error) => {
          this.isLoadingCrear = false;
          this.loadingService.hide();
          if (error?.error?.Alerta) {
            this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
          } else {
            this.alertaServicio.MostrarError(error, 'Error al subir la imagen. Por favor, intente de nuevo.');
          }
        },
      });
    }
  }

  existeClasificacionConMismoNombre(nombre: string | undefined): boolean {
    if (!nombre || nombre.trim() === '') return false;

    const nombreNormalizado = nombre.trim().toLowerCase();
    return this.clasificaciones.some(
      (clasificacion) =>
        clasificacion.NombreClasificacionProducto &&
        clasificacion.NombreClasificacionProducto.trim().toLowerCase() === nombreNormalizado
    );
  }

  subirImagen(file: File, clasificacion: any): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'ClasificacionProducto');
    formData.append('CodigoVinculado', clasificacion.CodigoEmpresa.toString());
    formData.append('CodigoPropio', clasificacion.CodigoClasificacionProducto.toString());
    formData.append('CampoVinculado', 'CodigoEmpresa');
    formData.append('CampoPropio', 'CodigoClasificacionProducto');
    formData.append('NombreCampoImagen', 'UrlImagen');

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        if (response?.Alerta) {
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }
        if (response && response.Entidad && response.Entidad.UrlImagen) {
          // Actualizar la imagen localmente
          clasificacion.UrlImagen = response.Entidad.UrlImagen;

          // Excluir UrlImagen para la actualización al backend
          const { UrlImagen, ...datosActualizados } = clasificacion;
          this.clasificacionProductoServicio.Editar(datosActualizados).subscribe({
            next: () => {
              this.alertaServicio.MostrarExito('Imagen actualizada correctamente', 'Éxito');
              this.cargarClasificaciones();
              this.loadingService.hide();
            },
            error: (updateError) => {
              this.loadingService.hide();
              if (updateError?.error?.Alerta) {
                this.alertaServicio.MostrarAlerta(updateError.error.Alerta, 'Atención');
              } else {
                this.alertaServicio.MostrarError('Error al actualizar la imagen');
              }
            }
          });
        } else {
          this.loadingService.hide();
          this.alertaServicio.MostrarError('Error al procesar la respuesta del servidor');
          console.warn('No se pudo obtener la URL de la imagen', response);
          this.cargarClasificaciones();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error al subir la imagen', error);
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError(error, 'Error al subir la imagen. Por favor, intente de nuevo.');
        }
      },
    });
  }

  // Actualiza una clasificación en el servidor
  actualizarClasificacion(clasificacion: any): void {
    delete clasificacion.UrlImagen;
    this.loadingService.show(); // Bloquea UI
    this.clasificacionProductoServicio.Editar(clasificacion).subscribe({
      next: (response) => {
        this.cargarClasificaciones();
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
      },
    });
  }

  eliminarCategoria(clasificacion: any): void {
    this.alertaServicio.Confirmacion(
      '¿Estás seguro de que deseas eliminar esta categoría?',
      'Esta acción no se puede deshacer.'
    ).then((confirmado) => {
      if (confirmado) {
        this.loadingService.show(); // Bloquea UI
        this.clasificacionProductoServicio
          .Eliminar(clasificacion.CodigoClasificacionProducto)
          .subscribe({
            next: (response) => {
              this.alertaServicio.MostrarExito('Categoría eliminada correctamente');

              const index = this.clasificaciones.findIndex(
                (c) => c.CodigoClasificacionProducto === clasificacion.CodigoClasificacionProducto
              );

              if (index !== -1) {
                this.clasificaciones.splice(index, 1);
              }
              this.loadingService.hide();
            },
            error: (error) => {
              this.loadingService.hide();
              this.alertaServicio.MostrarError('Error al eliminar la categoría');
            },
          });
      }
    });
  }

  resetNuevaCategoria() {
    this.nuevaCategoria = {
      titulo: '',
      imagenFile: null,
      imagenPreview: null,
    };
  }

  // EXCLUIR URLs de imágenes en todas las actualizaciones
  actualizarMenuPortada(): void {
    if (this.menuPortada) {
      const {
        UrlImagenNavbar,
        UrlImagenPortadaIzquierdo,
        UrlImagenPortadaDerecho,
        UrlImagenMenu,
        UrlImagenPresentacion,
        ...datosActualizados
      } = this.menuPortada;

     
      if (this.menuPortada.CodigoMenuPortada === 0) {
        this.menuPortadaServicio.Crear(datosActualizados).subscribe({
          next: (response) => {
            //  this.loadingService.show(); // Bloquea UI
            console.log('MenuPortada creado correctamente', response);
            if (response && response.Entidad) {
              this.menuPortada.CodigoMenuPortada = response.Entidad.CodigoMenuPortada;
            }
            // this.loadingService.hide();
          },
          error: (error) => {
            // this.loadingService.hide();
            console.error('Error al crear MenuPortada', error);
            this.crearEditarMenuPortada();
          },
        });
      } else {
        this.menuPortadaServicio.Editar(datosActualizados).subscribe({
          next: (response) => {
            //  this.loadingService.show(); // Bloquea UI
            console.log('MenuPortada actualizado correctamente', response);
            // this.loadingService.hide();
          },
          error: (error) => {
            // this.loadingService.hide();
            console.error('Error al actualizar MenuPortada', error);
            this.crearEditarMenuPortada();
          },
        });
      }
    }
  }

  crearEditarMenuPortada(): void {
    if (this.menuPortada) {
      const {
        UrlImagenNavbar,
        UrlImagenPortadaIzquierdo,
        UrlImagenPortadaDerecho,
        UrlImagenMenu,
        UrlImagenPresentacion,
        ...datosActualizados
      } = this.menuPortada;

      this.loadingService.show(); // Bloquea UI
      this.menuPortadaServicio.CrearEditar(datosActualizados).subscribe({
        next: (response) => {
          console.log('MenuPortada creado/actualizado correctamente', response);
          if (response && response.Entidad) {
            this.menuPortada.CodigoMenuPortada = response.Entidad.CodigoMenuPortada;
          }
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Error al crear/actualizar MenuPortada', error);
          this.alertaServicio.MostrarError('Error al actualizar la configuración de la portada');
        },
      });
    }
  }

  cambiarColorContorno(color: string): void {
    if (this.menuPortada) {
      this.menuPortada.ColorContornoImagenClasificacion = color;
      this.actualizarMenuPortada();
    }
  }

  cambiarColorFondoBoton(color: string): void {
    if (this.menuPortada) {
      this.menuPortada.ColorFondoNombreClasificacion = color;
      this.actualizarMenuPortada();
    }
  }

  cambiarColorTextoBoton(color: string): void {
    if (this.menuPortada) {
      this.menuPortada.ColorNombreClasificacion = color;
      this.actualizarMenuPortada();
    }
  }

  cambiarColorTitulo(color: string): void {
    if (this.menuPortada) {
      this.menuPortada.ColorTituloMenu = color;
      this.actualizarMenuPortada();
    }
  }

  navegar(ruta: string, codigo: string, nombre: string) {
    this.router.navigate([ruta, codigo, nombre]);
  }

  onColorChange(color: string) {
    this.menuPortada.ColorFondoNombreClasificacion = color;
    this.servicioCompartido.setDatosClasificacion({
      colorClasificacionFondo: color,
      colorClasificacionTexto: this.menuPortada.ColorNombreClasificacion,
    });
  }
}