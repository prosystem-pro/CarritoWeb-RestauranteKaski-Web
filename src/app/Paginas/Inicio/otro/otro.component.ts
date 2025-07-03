//Librerías
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
//Modelos
import { PortadaOtro } from '../../../Modelos/PortadaOtro';
import { Otro } from '../../../Modelos/Otro';
//Servicios
import { PortadaOtroServicio } from '../../../Servicios/PortadaOtroServicio';
import { EmpresaServicio } from '../../../Servicios/EmpresaServicio';
import { OtroServicio } from '../../../Servicios/OtroServicio';
import { PermisoServicio } from '../../../Autorizacion/AutorizacionPermiso';
import { Entorno } from '../../../Entornos/Entorno';
import { AlertaServicio } from '../../../Servicios/Alerta-Servicio';


@Component({
  selector: 'app-otro',
  imports: [CommonModule, FormsModule],
  templateUrl: './otro.component.html',
  styleUrl: './otro.component.css'
})
export class OtroComponent {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  PortadaOtro: PortadaOtro | null = null;
  Otro: Otro[] = [];
  MostrarPortadaOtro: boolean = false;
  MostrarListado: boolean[] = [];
  MostrarAgregarOtro: boolean = false;
  UrlImagenTemporal: string | ArrayBuffer | null = null;
  UrlImagenTemporal2: string | ArrayBuffer | null = null;
  CodigoTemporal: string | ArrayBuffer | null = null;


  constructor(
    public PortadaOtroServicio: PortadaOtroServicio,
    public EmpresaServicio: EmpresaServicio,
    public OtroServicio: OtroServicio,
    public Permiso: PermisoServicio,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private AlertaServicio: AlertaServicio
  ) { }

  ngOnInit(): void {
    this.ObtenerPortadaOtro();
    this.ObtenerOtro();
  }
  //CODIGO DE PORTADA OTRO
  ObtenerPortadaOtro(): void {
    this.PortadaOtroServicio.Listado().subscribe({
      next: (data: PortadaOtro[]) => {
        if (data && data.length > 0) {
          this.PortadaOtro = data[0];
        } else {
          this.PortadaOtro = {
            NombrePortadaOtro: 'Coloca un título',
            ColorNombrePortadaOtro: '#000000',
            ColorFondoNombrePortadaOtro: '#ffffff',
            Descripcion: 'Descripción predeterminada...',
            ColorDescripcion: '#000000',
            ColorDescripcionOtro: '#ffffff',
          };
          this.AlertaServicio.MostrarAlerta('No se encontraron registros. Se utilizarán valores predeterminados.');
        }
      },
      error: (error) => {
        this.PortadaOtro = {
          NombrePortadaOtro: 'Título predeterminado',
          ColorNombrePortadaOtro: '#000000',
          ColorFondoNombrePortadaOtro: '#ffffff',
          Descripcion: 'Coloca una descripción...',
          ColorDescripcion: '#000000',
          ColorDescripcionOtro: '#ffffff',
        };
        this.AlertaServicio.MostrarError(error, 'No se pudo obtener la información');
      }
    });
  }


  GuardarPortadaOtro(): void {
    if (!this.PortadaOtro?.CodigoPortadaOtro) {
      this.EmpresaServicio.Listado().subscribe({
        next: (empresas: any[]) => {
          if (empresas && empresas.length > 0) {
            const CodigoEmpresa = empresas[0].CodigoEmpresa;
            this.PortadaOtro!.CodigoEmpresa = CodigoEmpresa;

            this.PortadaOtroServicio.Crear(this.PortadaOtro).subscribe({
              next: () => {
                this.AlertaServicio.MostrarExito('El registro se creó correctamente.');
                this.ObtenerPortadaOtro();
                this.MostrarPortadaOtro = false;
              },
              error: (error) => {
                this.AlertaServicio.MostrarError(error, 'No se pudo crear el registro.');
              }
            });

          } else {
            this.AlertaServicio.MostrarAlerta('No se encontraron datos para continuar con la operación.');
          }
        },
        error: (error) => {
          this.AlertaServicio.MostrarError(error, 'No se pudo obtener la información necesaria.');
        }
      });
      return;
    }

    this.PortadaOtroServicio.Editar(this.PortadaOtro).subscribe({
      next: () => {
        this.AlertaServicio.MostrarExito('El registro se actualizó correctamente.');
        this.MostrarPortadaOtro = false;
        this.ObtenerPortadaOtro();
      },
      error: (error) => {
        this.AlertaServicio.MostrarError(error, 'No se pudo actualizar el registro.');
      }
    });
  }



  //CODIGO DE OTRO

  ngAfterViewChecked(): void {
    this.Otro.forEach((item, index) => {
      if (this.MostrarListado[index]) {
        const editor = document.getElementById(`editor-${index}`);
        if (editor && editor.innerHTML.trim() === '') {
          editor.innerHTML = item.Descripcion || '';
        }
      }
    });
  }

  ObtenerOtro(): void {
    this.OtroServicio.Listado().subscribe({
      next: (data: Otro[]) => {
        if (data && data.length > 0) {
          console.log('estos son los datos obtenidos de otro', data)
          this.Otro = data.map(item => ({
            ...item,
            MostrarOtro: false
          }));
          this.MostrarListado = new Array(this.Otro.length).fill(false);
        } else {
          this.Otro = [];
          this.MostrarListado = [];
        }
      },
      error: () => {
        this.Otro = [];
        this.MostrarListado = [];
        this.AlertaServicio.MostrarAlerta('No se pudieron obtener los datos.');
      }
    });
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  GuardarOtro(index: number | null): void {
    let item: any;

    if (index !== null) {
      item = { ...this.Otro[index] };
      const editorId = `editor-${index}`;
      const editor = document.getElementById(editorId);
      if (editor) {
        item.Descripcion = editor.innerHTML;
      }
    } else {
      item = { ...this.Otro };
      const editor = document.getElementById('editor-nuevo');
      if (editor) {
        item.Descripcion = editor.innerHTML;
      }
      if (this.CodigoTemporal) {
        item.CodigoOtro = this.CodigoTemporal;
      }
    }

    delete item.UrlImagen;
    delete item.UrlImagen2

    if (index !== null || (this.CodigoTemporal && this.CodigoTemporal !== '')) {
      this.OtroServicio.Editar(item).subscribe({
        next: () => {
          this.MostrarAgregarOtro = false;
          this.ObtenerOtro();
          this.AlertaServicio.MostrarExito('Los datos se actualizaron correctamente.');
        },
        error: () => {
          this.AlertaServicio.MostrarError('No se pudieron guardar los datos.');
        }
      });
    } else {
      this.OtroServicio.Crear(item).subscribe({
        next: () => {
          this.UrlImagenTemporal = '';
          this.CodigoTemporal = '';
          this.MostrarAgregarOtro = false;
          this.ObtenerOtro();
          this.AlertaServicio.MostrarExito('El registro se creó correctamente.');
        },
        error: () => {
          this.AlertaServicio.MostrarError('No se pudieron guardar los datos.');
        }
      });
    }
  }

  FormatoTexto(comando: string, valor?: string): void {
    document.execCommand(comando, false, valor);
  }
  CambiarTamanoTexto(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.FormatoTexto('fontSize', valor);
  }

  ActualizarImagenOtro(event: any, index: number | null, permiso: string | null = null): void {
    const file: File = event.target.files[0];
    if (file) {
      this.subirImagen(file, 'UrlImagen', index, permiso);
    } else {
      this.AlertaServicio.MostrarAlerta('No se seleccionó ningún archivo.');
    }
  }
  ActualizarImagen2Otro(event: any, index: number | null, permiso: string | null = null): void {
    const file: File = event.target.files[0];
    if (file) {
      this.subirImagen(file, 'UrlImagen2', index, permiso);
    } else {
      this.AlertaServicio.MostrarAlerta('No se seleccionó ningún archivo.');
    }
  }

  subirImagen(file: File, CampoDestino: string, index: number | null, permiso: string | null): void {
  if (!permiso) {
    this.UrlImagenTemporal = '';
    this.UrlImagenTemporal2 = '';
    this.CodigoTemporal = '';
  }
    const nombreEmpresa = this.NombreEmpresa ?? 'defaultCompanyName';

    this.EmpresaServicio.ConseguirPrimeraEmpresa().subscribe({
      next: (empresa) => {
        if (!empresa) {
          this.AlertaServicio.MostrarAlerta('No se encontró el dato solicitado.');
          return;
        }

        const formData = new FormData();
        const CodigoOtro = index != null ? String(this.Otro[index]?.CodigoOtro ?? '') : '';
        const CodigoPropio = String(this.CodigoTemporal || CodigoOtro || '');

        formData.append('Imagen', file);
        formData.append('CarpetaPrincipal', nombreEmpresa);
        formData.append('SubCarpeta', 'Otro');
        formData.append('CodigoVinculado', empresa.CodigoEmpresa.toString());
        formData.append('CodigoPropio', CodigoPropio || CodigoOtro);
        formData.append('CampoVinculado', 'CodigoEmpresa');
        formData.append('CampoPropio', 'CodigoOtro');
        formData.append('NombreCampoImagen', CampoDestino);
        this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
          next: (res: any) => {
            if (res?.Alerta) {
              this.AlertaServicio.MostrarAlerta(res.Alerta, 'Atención');
              return;
            }
            this.AlertaServicio.MostrarAlerta('El registro se actualizó correctamente.');

          if (permiso) {
            this.UrlImagenTemporal = res?.Entidad?.UrlImagen || this.UrlImagenTemporal;
            this.UrlImagenTemporal2 = res?.Entidad?.UrlImagen2 || this.UrlImagenTemporal2;
            this.CodigoTemporal = res?.Entidad?.CodigoOtro || this.CodigoTemporal;
          }

            if (!permiso) {
              this.ObtenerOtro();
            }
          },
          error: (err) => {
            console.error('Error al subir la imagen:', err);
            if (err?.error?.Alerta) {
              this.AlertaServicio.MostrarAlerta(err.error.Alerta, 'Atención');
            } else {
              this.AlertaServicio.MostrarAlerta('Hubo un error al procesar la solicitud. Intente de nuevo.');
            }
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener empresa:', err);
        if (err?.error?.Alerta) {
          this.AlertaServicio.MostrarAlerta(err.error.Alerta, 'Atención');
        } else {
          this.AlertaServicio.MostrarAlerta('No se pudo obtener el dato solicitado. Intente nuevamente.');
        }
      }
    });
  }

  EliminarOtro(index: number): void {
    const item = this.Otro[index];
    const codigo = item?.CodigoOtro;

    if (codigo === undefined) return;

    this.AlertaServicio.Confirmacion(
      '¿Estás seguro?',
      'Esta acción eliminará el registro de forma permanente.',
      'Sí, eliminar',
      'Cancelar'
    ).then(confirmado => {
      if (confirmado) {
        this.OtroServicio.Eliminar(codigo).subscribe({
          next: () => {
            this.Otro.splice(index, 1);
            this.AlertaServicio.MostrarExito('Registro eliminado correctamente.');
          },
          error: (err) => {
            this.AlertaServicio.MostrarError(err, 'Error al eliminar');
          }
        });
      }
    });
  }

}
