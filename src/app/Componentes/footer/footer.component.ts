import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FooterServicio } from '../../Servicios/FooterServicio';
import { HttpClient } from '@angular/common/http';
import { Entorno } from '../../Entornos/Entorno';
import { ServicioCompartido } from '../../Servicios/ServicioCompartido';
import { RedSocialServicio } from '../../Servicios/RedSocialServicio';
import { AlertaServicio } from '../../Servicios/Alerta-Servicio';
import { PermisoServicio } from '../../Autorizacion/AutorizacionPermiso';
import { ReporteRedSocialServicio } from '../../Servicios/ReporteRedSocialServicio';
import { RedSocialImagenServicio } from '../../Servicios/RedSocialImagenServicio';
import { EmpresaServicio } from '../../Servicios/EmpresaServicio';
import { LoadingService } from '../../Servicios/LoadingService';
import { Observable } from 'rxjs';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  footerData: any = null;
  isLoading = true;
  error = false;
  modoEdicion: boolean = false;
  datosOriginales: any = null;
  RedSocial: any = [];
  codigoEmpresa: number | null = null;
    // Variables para el spinner
  cargandoOverlay: Observable<boolean>;

  constructor(
    private footerServicio: FooterServicio,
    private http: HttpClient,
    private servicioCompartido: ServicioCompartido,
    private redSocialServicio: RedSocialServicio,
    public Permiso: PermisoServicio,
    private alertaServicio: AlertaServicio,
    private redSocialImagenServicio: RedSocialImagenServicio,
    private ReporteRedSocialServicio: ReporteRedSocialServicio,
    private loadingService: LoadingService,
    private EmpresaServicio: EmpresaServicio
  ) { 
    this.cargandoOverlay = this.loadingService.loading$;
  }

  ngOnInit(): void {
    this.obtenerCodigoEmpresa().then(() => {
      this.cargarDatosFooter();
      this.cargarRedesSociales();
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
        this.alertaServicio.MostrarError('No se pudo obtener la información de la empresa');
      }
    } catch (error) {
      console.error('Error al obtener código de empresa:', error);
      this.alertaServicio.MostrarError('Error al cargar información de empresa');
    }
  }

  ReportarRedSocial(codigo: number | undefined): void {
    if (codigo === undefined) {
      console.warn('Código de red social no definido, no se reporta');
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

  cargarRedesSociales(): void {
  this.redSocialServicio.Listado('Footer').subscribe({
    next: (data) => {
      this.RedSocial = data.filter((red: any) => red.Estatus === 1);
    },
    error: (error) => {
    }
  });
}

  // Modificar el método cargarDatosFooter para crear footer si no existe
  cargarDatosFooter(): void {
    this.footerServicio.Listado().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          // Existe el footer, usar datos existentes
          this.footerData = data[0];
          this.servicioCompartido.setColorFooter(this.footerData?.ColorFooter);
          this.isLoading = false;
        } else {
          // No existe footer, crear uno nuevo con valores por defecto
          this.crearFooterPorDefecto();
        }
      },
      error: (err) => {
        console.error('Error al obtener datos del footer:', err);
        // En caso de error, intentar crear footer por defecto
        // this.crearFooterPorDefecto();
      }
    });
  }

  // Nuevo método para crear footer con valores por defecto
  private crearFooterPorDefecto(): void {
    if (!this.codigoEmpresa) {
      this.alertaServicio.MostrarError('No se puede crear el footer sin información de empresa');
      this.error = true;
      this.isLoading = false;
      return;
    }

    const footerDefecto = {
      CodigoEmpresa: this.codigoEmpresa,
      TextoInicio: 'Nosotros',
      ColorTextoInicio: '#000000',
      TextoMenu: 'Menú',
      ColorTextoMenu: '#000000',
      TextoContacto: 'Contacto',
      ColorTextoContacto: '#000000',
      TextoOtro: 'Otro',
      ColorTextoOtro: '#000000',
      TextoTelefonoOficina: 'Teléfono de Oficina 54545454',
      ColorTextoTelefonoOficina: '#000000',
      ColorNoCelular: '#000000',
      TextoSuscripcion: 'Suscríbete...',
      ColorTextoSuscripcion: '#000000',
      TextoRedesSociales: 'Síguenos en redes sociales',
      ColorTextoRedesSociales: '#000000',
      TextoCorreo: 'Correo electrónico',
      ColorTextoCorreo: '#000000',
      TextoBotonSuscribirte: 'Suscribirse',
      ColorTextoBotonSuscribirte: '#ffffff',
      ColorBotonSuscribirte: '#007bff',
      DerechoDeAutor: '© 2024 Todos los derechos reservados',
      ColorDerechosDeAutor: '#666666',
      ColorFooter: '#f8f9fa',
      UrlLogo: '',
      Estatus: 1
    };

    this.footerServicio.Crear(footerDefecto).subscribe({
      next: (response) => {
        console.log('Footer creado exitosamente:', response);
        this.alertaServicio.MostrarExito('Configuración de footer creada correctamente');

        // Asignar los datos del footer creado
        this.footerData = response.Entidad || response;
        this.servicioCompartido.setColorFooter(this.footerData?.ColorFooter);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al crear footer por defecto:', error);
        this.alertaServicio.MostrarError('Error al crear la configuración del footer');

        // Como fallback, usar datos temporales para que la interfaz no se rompa
        this.footerData = footerDefecto;
        this.servicioCompartido.setColorFooter(this.footerData?.ColorFooter);
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  toggleModoEdicion(): void {
    if (!this.modoEdicion) {
      this.datosOriginales = JSON.parse(JSON.stringify(this.footerData));
      this.modoEdicion = true;
      document.body.classList.add('modoEdicion');
    } else {
      this.alertaServicio.Confirmacion('¿Desea guardar los cambios?').then((confirmado) => {
        if (confirmado) {
          this.guardarCambios();
        } else {
          this.footerData = JSON.parse(JSON.stringify(this.datosOriginales));
          this.servicioCompartido.setColorFooter(this.footerData?.ColorFooter);
        }
      });
      this.modoEdicion = false;
      document.body.classList.remove('modoEdicion');
    }
  }

  guardarCambios(): void {
    if (this.footerData) {
      const datosActualizados = { ...this.footerData };

      // EXCLUIR la URL del logo para evitar problemas en el backend
      delete datosActualizados.UrlLogo;

      this.loadingService.show(); // Bloquea UI
      this.footerServicio.Editar(datosActualizados).subscribe({
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
          this.alertaServicio.MostrarError('Error al guardar los cambios');
        }
      });
    } else {
      this.loadingService.hide();
      this.alertaServicio.MostrarAlerta('No hay datos disponibles para actualizar');
    }
  }

  actualizarLogo(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.footerData.UrlLogo = e.target.result;
      };
      reader.readAsDataURL(file);

      this.subirImagen(file, 'UrlLogo');
    }
  }

  // Modificar el método subirImagen para manejar la creación si no existe CodigoFooter
  subirImagen(file: File, campoDestino: string): void {
    if (!this.footerData) {
      this.alertaServicio.MostrarError('No hay datos de footer disponibles');
      return;
    }

    // Si no existe CodigoFooter, primero crear el footer
    if (!this.footerData.CodigoFooter) {
      this.alertaServicio.MostrarAlerta('Creando configuración de footer...', 'Por favor, espere');

      // Crear el footer primero y luego subir la imagen
      this.footerServicio.Crear(this.footerData).subscribe({
        next: (response) => {
          this.footerData = response.Entidad || response;
          // Ahora que tenemos el CodigoFooter, proceder a subir la imagen
          this.ejecutarSubidaImagen(file, campoDestino);
        },
        error: (error) => {
          console.error('Error al crear footer antes de subir imagen:', error);
          this.alertaServicio.MostrarError('Error al crear la configuración del footer');
        }
      });
    } else {
      // Ya existe el footer, proceder directamente a subir la imagen
      this.ejecutarSubidaImagen(file, campoDestino);
    }
  }

  // Nuevo método para ejecutar la subida de imagen
  private ejecutarSubidaImagen(file: File, campoDestino: string): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'Footer');
    formData.append('CodigoVinculado', this.footerData.CodigoEmpresa);
    formData.append('CodigoPropio', this.footerData.CodigoFooter);
    formData.append('CampoVinculado', 'CodigoEmpresa');
    formData.append('CampoPropio', 'CodigoFooter');
    formData.append('NombreCampoImagen', campoDestino);

    this.http.post(`${this.Url}subir-imagen`, formData)
      .subscribe({
        next: (response: any) => {
          if (response?.Alerta) {
            this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
            return;
          }

          if (response?.Entidad?.[campoDestino]) {
            this.footerData[campoDestino] = response.Entidad[campoDestino];

            const {UrlLogo, ...datosActualizados} = { ...this.footerData };

            this.footerServicio.Editar(datosActualizados).subscribe({
              next: () => {
                this.alertaServicio.MostrarExito('Imagen actualizada correctamente');
                this.cargarDatosFooter();
                this.modoEdicion = false;
                this.loadingService.hide();
              },
              error: () => {
                this.loadingService.hide();
                this.alertaServicio.MostrarError('Error al actualizar la imagen');
              }
            });
          } else {
            this.loadingService.hide();
            const imageUrl = response.UrlImagenPortada ||
              response.url ||
              (response.Entidad ? response.Entidad.UrlImagenPortada : null);

            if (imageUrl) {
              this.loadingService.hide();
              this.footerData[campoDestino] = imageUrl;
            } else {
              this.loadingService.hide();
              this.alertaServicio.MostrarError('Error al obtener la URL de la imagen');
            }
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

  // Método para actualizar imagen de red social
  actualizarImagenRedSocial(event: any, codigoRedSocial: number): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!codigoRedSocial) {
      this.alertaServicio.MostrarError('No se pudo identificar la red social');
      return;
    }

  // Buscar la red social específica
  const redSocial = this.RedSocial.find((red: any) => red.CodigoRedSocial === codigoRedSocial);
  if (!redSocial) {
    this.alertaServicio.MostrarError('Red social no encontrada');
    return;
  }

  // Mostrar preview inmediato
  const reader = new FileReader();
  reader.onload = (e: any) => {
    // Si ya tiene imágenes, actualizar la primera
    if (redSocial.Imagenes && redSocial.Imagenes.length > 0) {
      redSocial.Imagenes[0].UrlImagen = e.target.result;
    } else {
      // Si no tiene imágenes, crear el array y agregar una imagen temporal
      redSocial.Imagenes = [{
        CodigoRedSocialImagen: null,
        UrlImagen: e.target.result,
        Ubicacion: 'Footer'
      }];
    }
  };
  reader.readAsDataURL(file);

  // Subir la imagen al servidor
  this.subirImagenRedSocial(file, codigoRedSocial, redSocial);
}

subirImagenRedSocial(file: File, codigoRedSocial: number, redSocial: any): void {
  this.loadingService.show(); // Bloquea UI
  const formData = new FormData();
  formData.append('Imagen', file);
  formData.append('CarpetaPrincipal', this.NombreEmpresa);
  formData.append('SubCarpeta', 'RedSocialImagen');
  formData.append('CodigoVinculado', codigoRedSocial.toString());
  
  // Verificar si ya existe una imagen para esta red social en Footer
  const imagenExistente = redSocial.Imagenes?.find((img: any) => img.Ubicacion === 'Footer');
  const tieneImagenValida = imagenExistente && imagenExistente.CodigoRedSocialImagen;

  if (tieneImagenValida) {
    // Si ya existe con código válido, usar para actualización
    formData.append('CodigoPropio', imagenExistente.CodigoRedSocialImagen.toString());
  } else {
    // Si no existe o no tiene código, dejar vacío para creación
    formData.append('CodigoPropio', '');
  }

    formData.append('CampoVinculado', 'CodigoRedSocial');
    formData.append('CampoPropio', 'CodigoRedSocialImagen');
    formData.append('NombreCampoImagen', 'UrlImagen');

  this.http.post(`${this.Url}subir-imagen`, formData)
    .subscribe({
     next: (response: any) => {
        if (response?.Alerta) {
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }

        if (response && response.Entidad && response.Entidad.UrlImagen) {
          // Procesar la respuesta según si se creó o actualizó
          this.procesarRespuestaImagen(codigoRedSocial, response, redSocial);
          this.loadingService.hide();
        } else {
          // Manejar respuesta alternativa
          const imageUrl = response.UrlImagenPortada || 
                          response.url || 
                          (response.Entidad ? response.Entidad.UrlImagenPortada : null);

          if (imageUrl) {
            this.procesarRespuestaImagen(codigoRedSocial, { Entidad: { UrlImagen: imageUrl } }, redSocial);
            this.loadingService.hide();
          } else {
            this.loadingService.hide();
            this.alertaServicio.MostrarError('Error al obtener la URL de la imagen');
          }
        }
      },
      error: (error) => {
        this.loadingService.hide();
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError('Error al subir la imagen');
        }
        // Recargar las redes sociales para revertir el preview
        this.cargarRedesSociales();
      }
    });
}

procesarRespuestaImagen(codigoRedSocial: number, response: any, redSocial: any): void {
  const urlImagen = response.Entidad.UrlImagen;
  
  // Verificar si ya existe una imagen para esta red social en Footer
  const imagenExistente = redSocial.Imagenes?.find((img: any) => img.Ubicacion === 'Footer');

  if (imagenExistente && imagenExistente.CodigoRedSocialImagen) {
    // ACTUALIZAR: Ya existe una imagen con código válido en Footer
    this.actualizarRegistroRedSocialImagen(imagenExistente.CodigoRedSocialImagen, urlImagen);
  } else {
    // ACTUALIZAR EL REGISTRO CREADO AUTOMÁTICAMENTE: 
    // El endpoint subir-imagen ya creó un registro, solo necesitamos actualizarlo con la Ubicacion
    const codigoImagenCreada = response.Entidad.CodigoRedSocialImagen;
    
    if (codigoImagenCreada) {
      this.actualizarRegistroRedSocialImagen(codigoImagenCreada, urlImagen);
    } else {
      // Fallback: crear manualmente solo si no se creó automáticamente
      this.crearRegistroRedSocialImagen(codigoRedSocial, urlImagen);
    }
  }
}

crearRegistroRedSocialImagen(codigoRedSocial: number, urlImagen: string): void {
  const datosNuevos = {
    CodigoRedSocial: codigoRedSocial,
    Ubicacion: 'Footer', // Valor quemado como solicitaste
    Estatus: 1 // Agregar estatus activo
  };

  this.redSocialImagenServicio.Crear(datosNuevos).subscribe({
    next: (response) => {
      this.alertaServicio.MostrarExito('Imagen de red social creada correctamente');
      // Recargar las redes sociales para obtener los datos actualizados
      this.cargarRedesSociales();
    },
    error: (error) => {
      this.alertaServicio.MostrarError('Error al crear la imagen de la red social');
      // Recargar las redes sociales para revertir cambios
      this.cargarRedesSociales();
    }
  });
}


actualizarRegistroRedSocialImagen(codigoRedSocialImagen: number, urlImagen: string): void {
  const datosActualizados = {
    CodigoRedSocialImagen: codigoRedSocialImagen,
    Ubicacion: 'Footer', // Valor quemado como solicitaste
    Estatus: 1 // Mantener estatus activo
  };

  this.redSocialImagenServicio.Editar(datosActualizados).subscribe({
    next: (response) => {
      this.alertaServicio.MostrarExito('Imagen de red social actualizada correctamente');
      
      // Recargar las redes sociales para obtener los datos actualizados
      setTimeout(() => this.cargarRedesSociales(), 500);
    },
    error: (error) => {
      this.alertaServicio.MostrarError('Error al actualizar la imagen de la red social');
      // Recargar las redes sociales para revertir cambios
      this.cargarRedesSociales();
    }
  });
}
  sincronizarColoresTexto(): void {
    if (this.footerData) {
      const colorSeleccionado = this.footerData.ColorTextoInicio;
      this.footerData.ColorTextoMenu = colorSeleccionado;
      this.footerData.ColorTextoContacto = colorSeleccionado;
      this.footerData.ColorTextoOtro = colorSeleccionado;
    }
  }

  onColorChange(color: string) {
    this.footerData.ColorFooter = color;
    this.servicioCompartido.setColorFooter(color);
    
    // Enviar solo el cambio de color, sin las URLs de imágenes
    if (this.footerData && this.footerData.CodigoFooter) {
      const actualizacionColor = {
        CodigoFooter: this.footerData.CodigoFooter,
        CodigoEmpresa: this.footerData.CodigoEmpresa,
        ColorFooter: color
      };
      
      this.footerServicio.Editar(actualizacionColor).subscribe({
        next: (response) => {
        },
        error: (error) => {
        }
      });
    }
  }
}