import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PagoServicio } from '../../../Servicios/PagoServicio';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entornos/Entorno';
import { AlertaServicio } from '../../../Servicios/Alerta-Servicio';
import { EmpresaServicio } from '../../../Servicios/EmpresaServicio';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pago',
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.css'
})
export class PagoComponent implements OnInit {
  Pagos: any[] = [];
  AnioSeleccionado: number = new Date().getFullYear();
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  private Url = `${Entorno.ApiUrl}`;
  Cargando: boolean = false;
  MostrarModal: boolean = false;
  ComprobanteSeleccionado: string | null = null;


  constructor(
    private Servicio: PagoServicio,
    private AlertaServicio: AlertaServicio,
    private EmpresaServicio: EmpresaServicio,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.Listado();
  }

  Listado() {
    this.Servicio.Listado(this.AnioSeleccionado).subscribe({
      next: (res) => {
        this.Pagos = res;
      },
      error: (err) => {
        console.error('Error al cargar pagos:', err);
      },
    });
  }

  AbrirSelectorArchivo(codigoPago: number): void {
    const inputFile = document.getElementById('fileInput-' + codigoPago) as HTMLInputElement | null;
    if (inputFile) {
      inputFile.click();
    }
  }

  ArchivoSeleccionado(event: Event, codigoPago: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.SubirImagen(file, codigoPago);
    } else {
      this.AlertaServicio.MostrarAlerta('No se seleccionó ningún archivo.');
    }
  }

SubirImagen(file: File, codigoPago: number): void {
  const NombreEmpresa = this.NombreEmpresa ?? 'defaultCompanyName';
  this.Cargando = true; // Activar bloqueo

  this.EmpresaServicio.ConseguirPrimeraEmpresa().subscribe({
    next: (empresa) => {
      if (!empresa) {
        this.Cargando = false;
        this.AlertaServicio.MostrarAlerta('No se encontró ninguna empresa.');
        return;
      }

      const formData = new FormData();
      formData.append('Imagen', file);
      formData.append('CarpetaPrincipal', NombreEmpresa);
      formData.append('SubCarpeta', 'Pago');
      formData.append('CodigoVinculado', empresa.CodigoEmpresa.toString());
      formData.append('CodigoPropio', codigoPago.toString());
      formData.append('CampoVinculado', 'CodigoEmpresa');
      formData.append('CampoPropio', 'CodigoPago');
      formData.append('NombreCampoImagen', 'UrlComprobante');

      this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
        next: (response: any) => {
          if (response?.Alerta) {
            this.Cargando = false;
            this.AlertaServicio.MostrarAlerta(response.Alerta, 'Atención');
            return;
          }

          const CodigoPago = response?.CodigoPago ?? codigoPago;
          const Datos = { CodigoPago: CodigoPago, Estatus: 2 };

          this.Servicio.Editar(Datos).subscribe({
            next: () => {
              this.Cargando = false;
              this.AlertaServicio.MostrarExito('Comprobante guardado con éxito');
              this.Listado();
            },
            error: (err) => {
              this.Cargando = false;
              this.AlertaServicio.MostrarError(err, 'Error al actualizar estado del pago');
            }
          });
        },
        error: (err) => {
          this.Cargando = false;
          if (err?.error?.Alerta) {
            this.AlertaServicio.MostrarAlerta(err.error.Alerta, 'Atención');
          } else {
            this.AlertaServicio.MostrarError(err, 'Error al subir la imagen');
          }
        },
      });
    },
    error: (err) => {
      this.Cargando = false;
      if (err?.error?.Alerta) {
        this.AlertaServicio.MostrarAlerta(err.error.Alerta, 'Atención');
      } else {
        this.AlertaServicio.MostrarError(err, 'No se pudo obtener la empresa');
      }
    },
  });
}

VerComprobante(url: string) {
  this.ComprobanteSeleccionado = url;
  this.MostrarModal = true;
}

}
