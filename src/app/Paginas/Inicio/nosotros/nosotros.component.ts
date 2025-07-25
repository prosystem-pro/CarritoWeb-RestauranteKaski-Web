import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaPortadaServicio } from '../../../Servicios/EmpresaPortadaServicio';
import { CarruselImagenServicio } from '../../../Servicios/CarruselImagnServicio';
import { HttpClient } from '@angular/common/http';
import { Entorno } from '../../../Entornos/Entorno';
import { CarruselComponent } from '../../../Componentes/carrusel/carrusel.component';
import { CarruselServicio } from '../../../Servicios/CarruselServicio';
import { ServicioCompartido } from '../../../Servicios/ServicioCompartido';
import { PermisoServicio } from '../../../Autorizacion/AutorizacionPermiso';
import { AlertaServicio } from '../../../Servicios/Alerta-Servicio';
import { ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { EmpresaServicio } from '../../../Servicios/EmpresaServicio';
import { LoadingService } from '../../../Servicios/LoadingService';
import { Observable } from 'rxjs';
import { SpinnerComponent } from '../../../Componentes/spinner/spinner.component';

@Component({
  selector: 'app-nosotros',
  imports: [CommonModule, NgIf, FormsModule, CarruselComponent, SpinnerComponent],
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.css'],
  standalone: true,
})
export class NosotrosComponent implements OnInit, AfterViewInit {

  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  private VolumenVideo = false; // Inicialmente sin volumen
  private videoInicializado = false;
  rawYoutubeUrl: string = '';
  sanitizedVideoUrl!: SafeResourceUrl;
  isVideoPlaying = false;
  videoId: string = '';
    // Variables para el spinner
  cargandoOverlay: Observable<boolean>;

  // Nuevas propiedades para manejo de edición
  portadaData: any = null;
  carruselData: any = null;
  codigoCarrusel: number = 0;
  detallesCarrusel: any = null;
  titulo: string = '';
  isLoading = true;
  error = false;
  modoEdicion: boolean = false;
  datosOriginales: any = null;
  colorFooter: string = '';
  datosListos: boolean = false;
  codigoEmpresa: number | null = null;

  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;

  // Variable para controlar el overlay de sonido
  mostrarOverlay = true;

  constructor(
    private sanitizer: DomSanitizer,
    private empresaPortadaServicio: EmpresaPortadaServicio,
    private carruselServicio: CarruselServicio,
    private carruselImagenServicio: CarruselImagenServicio,
    private http: HttpClient,
    public Permiso: PermisoServicio,
    private alertaServicio: AlertaServicio,
    private servicioCompartido: ServicioCompartido,
    private loadingService: LoadingService,
    private EmpresaServicio: EmpresaServicio
  ) { 
    this.cargandoOverlay = this.loadingService.loading$;
  }

  ngOnInit(): void {
    this.obtenerCodigoEmpresa().then(() => {
      this.setSanitizedUrl();
      this.cargarDatosPortada();
      this.cargarDatosCarrusel();
      this.servicioCompartido.colorFooter$.subscribe((color) => {
        this.colorFooter = color;
      });

      // Listeners para intentar reproducir el video en la primera interacción
      document.body.addEventListener('touchstart', this.intentaReproducirVideo, { once: true });
      document.body.addEventListener('click', this.intentaReproducirVideo, { once: true });
      document.body.addEventListener('scroll', this.intentaReproducirVideo, { once: true });
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.configurarVideoSinSonido();
      this.intentaReproducirVideo();
    }, 500); // Aumentar el timeout para dar más tiempo
  }

  // Nuevo método para configurar el video sin sonido desde el inicio
  private configurarVideoSinSonido(): void {
    if (this.videoPlayer?.nativeElement) {
      const videoEl = this.videoPlayer.nativeElement;

      // Configuración exhaustiva para asegurar que inicie sin sonido
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.volume = 0;

      // Establecer atributos HTML directamente
      videoEl.setAttribute('muted', 'true');
      videoEl.setAttribute('defaultmuted', 'true');
      videoEl.setAttribute('playsinline', 'true');

      // Listener para cuando se carga el video
      videoEl.addEventListener('loadeddata', () => {
        videoEl.muted = true;
        videoEl.volume = 0;
      });

      // Listener para cuando el video está listo para reproducir
      videoEl.addEventListener('canplay', () => {
        videoEl.muted = true;
        videoEl.volume = 0;
      });
    }
  }

  // Método mejorado para intentar reproducir el video
  intentaReproducirVideo = () => {
    if (this.videoPlayer && !this.videoInicializado) {
      const videoEl = this.videoPlayer.nativeElement;

      // CRUCIAL: Forzar configuración sin sonido antes de cada intento de reproducción
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.volume = 0;

      // Asegurar atributos HTML
      videoEl.setAttribute('muted', 'true');
      videoEl.setAttribute('defaultmuted', 'true');

      // Intentar reproducir
      const playPromise = videoEl.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video reproduciéndose automáticamente SIN sonido');
            this.videoInicializado = true;
            this.VolumenVideo = false;

            // Verificar que realmente esté sin sonido después de reproducir
            setTimeout(() => {
              if (videoEl.volume > 0 || !videoEl.muted) {
                videoEl.muted = true;
                videoEl.volume = 0;
              }
            }, 100);
          })
          .catch((err) => {
            this.videoInicializado = true;
          });
      }
    }
  }

  // Método para activar el sonido solo cuando el usuario haga clic
  activarSonido(): void {
    if (this.videoPlayer?.nativeElement) {
      const videoEl = this.videoPlayer.nativeElement;

      // Activar sonido
      videoEl.muted = false;
      videoEl.volume = 1;
      videoEl.removeAttribute('muted');

      // Asegurar que siga reproduciéndose
      videoEl.play().catch(err => console.warn('Error al activar sonido:', err));

      this.mostrarOverlay = false;
      this.VolumenVideo = true;
    } else {
    }
  }

  // Método mejorado para configurar la URL sanitizada
  setSanitizedUrl(): void {
    if (this.rawYoutubeUrl) {
      this.sanitizedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawYoutubeUrl);

      // Después de establecer la URL, configurar el video sin sonido
      setTimeout(() => {
        this.configurarVideoSinSonido();
      }, 100);
    }
  }

  // Nuevo método para obtener el código de empresa
  private async obtenerCodigoEmpresa(): Promise<void> {
    try {
      const empresa = await this.EmpresaServicio.ConseguirPrimeraEmpresa().toPromise();
      if (empresa && empresa.CodigoEmpresa) {
        this.codigoEmpresa = empresa.CodigoEmpresa;
      } else {
        console.warn('No se encontró información de empresa');
        this.alertaServicio.MostrarError('No se pudo obtener la información de la empresa');
      }
    } catch (error) {
      console.error('Error al obtener código de empresa:', error);
      this.alertaServicio.MostrarError('Error al cargar información de empresa');
    }
  }

  // Modificar el método cargarDatosPortada para crear portada si no existe
  cargarDatosPortada(): void {
    this.empresaPortadaServicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          // Existe la portada, usar datos existentes
          this.portadaData = data[0];
          this.isLoading = false;

          // Actualizar la URL del video si viene de la API
          if (this.portadaData.Urlvideo) {
            this.rawYoutubeUrl = this.portadaData.Urlvideo;
            this.setSanitizedUrl();
          }
        } else {
          // No existe portada, crear una nueva con valores por defecto
          this.crearPortadaPorDefecto();
        }
      },
      error: (err) => {
        console.error('Error al obtener datos de la portada:', err);
        // En caso de error, intentar crear portada por defecto
        // this.crearPortadaPorDefecto();
      },
    });
  }

  // Nuevo método para crear portada con valores por defecto
  private crearPortadaPorDefecto(): void {
    if (!this.codigoEmpresa) {
      this.alertaServicio.MostrarError('No se puede crear la portada sin información de empresa');
      this.error = true;
      this.isLoading = false;
      return;
    }

    const portadaDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      ColorNombreEmpresa: '#000000',
      ColorFondoNombreEmpresa: '#ffffff',
      UrlImagenPortada: '',
      UrlImagenPortadaIzquierdo: '',
      UrlImagenPortadaDerecho: '',
      TitutloQuienesSomos: '¿Quiénes Somos?',
      ColorTituloQuienesSomos: '#000000',
      DescripcionQuienesSomos: 'Somos una empresa comprometida con la excelencia y la calidad en nuestros productos y servicios.',
      ColorDescripcionQuienesSomos: '#666666',
      TituloMision: 'Nuestra Misión',
      ColorTituloMision: '#000000',
      DescripcionMision: 'Brindar productos y servicios de calidad que superen las expectativas de nuestros clientes.',
      ColorDescripcionMision: '#666666',
      UrlImagenMision: '',
      TituloVision: 'Nuestra Visión',
      ColorTituloVision: '#000000',
      DescripcionVision: 'Ser reconocidos como líderes en nuestro sector, innovando constantemente para un futuro mejor.',
      ColordescripcionVision: '#666666',
      UrlImagenVision: '',
      ColorEslogan: '#000000',
      Urlvideo: '',
      Estatus: 1
    };

    this.empresaPortadaServicio.Crear(portadaDefecto).subscribe({
      next: (response) => {
        console.log('Portada creada exitosamente:', response);
        this.alertaServicio.MostrarExito('Configuración de portada creada correctamente');

        // Asignar los datos de la portada creada
        this.portadaData = response.Entidad || response;
        this.isLoading = false;

        if (this.portadaData.Urlvideo) {
          this.rawYoutubeUrl = this.portadaData.Urlvideo;
          this.setSanitizedUrl();
        }
      },
      error: (error) => {
        console.error('Error al crear portada por defecto:', error);
        this.alertaServicio.MostrarError('Error al crear la configuración de la portada');

        // Como fallback, usar datos temporales para que la interfaz no se rompa
        this.portadaData = portadaDefecto;
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  // Modificar el método cargarDatosCarrusel para crear carrusel si no existe
  cargarDatosCarrusel(): void {
    this.carruselServicio.Listado().subscribe({
      next: (data) => {
        // Buscar carrusel específicamente por ubicación 'Nosotros'
        let carruselNosotros = null;

        if (data && data.length > 0) {
          carruselNosotros = data.find(c => c.Ubicacion === 'Nosotros');
        }

        if (carruselNosotros) {
          this.carruselData = carruselNosotros;
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

  // Nuevo método para crear carrusel con valores por defecto
  private crearCarruselPorDefecto(): void {
    if (!this.codigoEmpresa) {
      this.alertaServicio.MostrarError('No se puede crear el carrusel sin información de empresa');
      this.error = true;
      this.isLoading = false;
      return;
    }

    const carruselDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      NombreCarrusel: 'Galería Principal',
      Descripcion: 'Carrusel de imágenes principal para la sección Nosotros',
      Ubicacion: 'Nosotros',
      Estatus: 1
    };

    this.carruselServicio.Crear(carruselDefecto).subscribe({
      next: (response) => {
        console.log('Carrusel creado exitosamente:', response);
        this.alertaServicio.MostrarExito('Carrusel creado correctamente');

        // Asignar los datos del carrusel creado
        this.carruselData = response.Entidad || response;
        this.codigoCarrusel = this.carruselData.CodigoCarrusel;
        this.titulo = this.carruselData.NombreCarrusel;

        this.cargarDatosCarrusel();
        // Cargar imágenes del carrusel (estará vacío inicialmente)
        this.cargarImagenesCarrusel();
      },
      error: (error) => {
        console.error('Error al crear carrusel por defecto:', error);
        this.alertaServicio.MostrarError('Error al crear el carrusel');

        // Como fallback, usar datos temporales
        this.carruselData = carruselDefecto;
        this.detallesCarrusel = [];
        this.datosListos = true;
      }
    });
  }

  // Nuevo método para cargar imágenes del carrusel
  private cargarImagenesCarrusel(): void {
    if (this.carruselData?.CodigoCarrusel) {
      this.carruselImagenServicio
        .ListadoCarrusel(this.carruselData.CodigoCarrusel)
        .subscribe({
          next: (data) => {
            this.detallesCarrusel = data;
            this.datosListos = true;
          },
          error: (err) => {
            this.detallesCarrusel = [];
            this.datosListos = true;
          },
        });
    }
  }

  // Método para activar/desactivar el modo edición
  toggleModoEdicion(): void {
    if (!this.modoEdicion) {
      this.datosOriginales = JSON.parse(JSON.stringify(this.portadaData));
      this.modoEdicion = true;
      document.body.classList.add('modoEdicion');
    } else {
      this.alertaServicio
        .Confirmacion('¿Desea guardar los cambios?')
        .then((confirmado) => {
          if (confirmado) {
            this.guardarCambios();
          } else {
            this.portadaData = JSON.parse(JSON.stringify(this.datosOriginales));
          }

          this.modoEdicion = false;
          document.body.classList.remove('modoEdicion');
        });
    }
  }

  // Método para guardar los cambios
  guardarCambios(): void {
    if (this.portadaData) {
      const datosActualizados = { ...this.portadaData };

      // EXCLUIR las URLs de imágenes para evitar problemas en el backend
      delete datosActualizados.UrlImagenPortada;
      delete datosActualizados.UrlImagenPortadaIzquierdo;
      delete datosActualizados.UrlImagenPortadaDerecho;
      delete datosActualizados.UrlImagenMision;
      delete datosActualizados.UrlImagenVision;

      this.loadingService.show(); // Bloquea UI
      this.empresaPortadaServicio.Editar(datosActualizados).subscribe({
        next: (response) => {
          this.alertaServicio.MostrarExito('Cambios guardados correctamente');
          this.modoEdicion = false;
          document.body.classList.remove('modoEdicion');
          this.datosOriginales = null;
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Error al guardar los cambios:', error);
          this.alertaServicio.MostrarError('Error al guardar los cambios. Por favor, intente de nuevo.');
        },
      });
    } else {
      this.loadingService.hide();
      console.error('No hay datos disponibles para actualizar');
    }
  }

  // Métodos para actualizar imágenes
  actualizarImagenPortada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.portadaData.UrlImagenPortada = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenPortada');
    }
  }

  actualizarImagenPortadaIzquierda(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.portadaData.UrlImagenPortadaIzquierdo = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenPortadaIzquierdo');
    }
  }

  actualizarImagenPortadaDerecha(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.portadaData.UrlImagenPortadaDerecho = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenPortadaDerecho');
    }
  }

  actualizarImagenMision(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.portadaData.UrlImagenMision = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenMision');
    }
  }

  actualizarImagenVision(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.portadaData.UrlImagenVision = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlImagenVision');
    }
  }

  // Modificar el método subirImagen para manejar la creación si no existe CodigoEmpresaPortada
  subirImagen(file: File, campoDestino: string): void {
    if (!this.portadaData) {
      this.alertaServicio.MostrarError('No hay datos de portada disponibles');
      return;
    }

    // Si no existe CodigoEmpresaPortada, primero crear la portada
    if (!this.portadaData.CodigoEmpresaPortada) {
      this.alertaServicio.MostrarAlerta('Creando configuración de portada...', 'Por favor, espere');

      // Crear la portada primero y luego subir la imagen
      this.empresaPortadaServicio.Crear(this.portadaData).subscribe({
        next: (response) => {
          this.portadaData = response.Entidad || response;
          // Ahora que tenemos el CodigoEmpresaPortada, proceder a subir la imagen
          this.ejecutarSubidaImagen(file, campoDestino);
        },
        error: (error) => {
          console.error('Error al crear portada antes de subir imagen:', error);
          this.alertaServicio.MostrarError('Error al crear la configuración de la portada');
        }
      });
    } else {
      // Ya existe la portada, proceder directamente a subir la imagen
      this.ejecutarSubidaImagen(file, campoDestino);
    }
  }

  // Nuevo método para ejecutar la subida de imagen
  private ejecutarSubidaImagen(file: File, campoDestino: string): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'EmpresaPortada');
    formData.append('CodigoVinculado', this.portadaData.CodigoEmpresa);
    formData.append('CodigoPropio', this.portadaData.CodigoEmpresaPortada);
    formData.append('CampoVinculado', 'CodigoEmpresa');
    formData.append('CampoPropio', 'CodigoEmpresaPortada');
    formData.append('NombreCampoImagen', campoDestino);

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        if (response?.Alerta) {
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }

        if (response && response.Entidad && response.Entidad[campoDestino]) {
          this.portadaData[campoDestino] = response.Entidad[campoDestino];

          const {
            UrlImagenPortada,
            UrlImagenPortadaIzquierdo,
            UrlImagenPortadaDerecho,
            UrlImagenMision,
            UrlImagenVision,
            ...datosActualizados
          } = this.portadaData;

          this.empresaPortadaServicio.Editar(datosActualizados).subscribe({
            next: () => {
              this.alertaServicio.MostrarExito(
                'Campo de imagen actualizado correctamente'
              );
              this.cargarDatosPortada();
              this.modoEdicion = false;
              this.loadingService.hide();
            },
            error: (error) => {
              this.loadingService.hide();
              if (error?.error?.Alerta) {
                this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
              } else {
                this.loadingService.hide();
                this.alertaServicio.MostrarError(
                  'Error al actualizar el campo de imagen. Por favor, intente de nuevo.'
                );
              }
            },
          });
        }
      },
      error: (error) => {
        this.loadingService.hide();
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError(
            'Error al subir la imagen. Por favor, intente de nuevo.'
          );
        }
      },
    });
  }

  // Método para actualizar la URL del video
  actualizarVideo(): void {
    if (this.portadaData) {
      this.portadaData.Urlvideo = this.rawYoutubeUrl;
      this.setSanitizedUrl();

      // Enviar solo el campo del video, sin las URLs de imágenes
      const datosVideo = {
        CodigoEmpresaPortada: this.portadaData.CodigoEmpresaPortada,
        CodigoEmpresa: this.portadaData.CodigoEmpresa,
        Urlvideo: this.portadaData.Urlvideo
      };

      this.loadingService.show(); // Bloquea UI
      this.empresaPortadaServicio.Editar(datosVideo).subscribe({
        next: () => {
          this.alertaServicio.MostrarExito('Video actualizado correctamente');
          this.modoEdicion = false;
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          console.error('Error al actualizar video:', error);
          this.alertaServicio.MostrarError('Error al actualizar el video. Por favor, intente de nuevo.');
        },
      });
    }
  }

  playVideo(): void {
    this.isVideoPlaying = true;
    this.setSanitizedUrl();
  }
}