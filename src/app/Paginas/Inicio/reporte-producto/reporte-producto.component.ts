import { Component } from '@angular/core';
import { ReporteProductoServicio } from '../../../Servicios/ReporteProductoServicio';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { HeaderReporteComponent } from "../../../Componentes/header-reporte/header-reporte.component";

@Component({
  selector: 'app-reporte-producto',
  imports: [CommonModule, BaseChartDirective, FormsModule, HeaderReporteComponent],
  templateUrl: './reporte-producto.component.html',
  styleUrl: './reporte-producto.component.css'
})
export class ReporteProductoComponent {

TotalSolicitudMes: number = 0;
TopProductos: any[] = [];
ConseguirAnio = new Date().getFullYear();
AnioTemporal: number = this.ConseguirAnio;
MesTemporal: number = new Date().getMonth() + 1;  

Meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Ma\u200Byo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

GraficoLineal: any = 'line';
ConfiguracionGraficoLineal: any = {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '',
      backgroundColor: '',
      fill: false,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 2
    }]
};
GraficoRadar: any = 'polarArea';
  ConfiguracionGraficoRadar: any = {
  labels: [],
  datasets: [{ data: [], backgroundColor: [] }]
};
 
GraficoBarra: any = 'bar';
ConfiguracionGraficoBarra: any = {
  labels: [],
  datasets: [{ data: [], backgroundColor: [] }]
};

  constructor(private Servicio: ReporteProductoServicio) {
    this.ObtenerDatos();
  }

  ObtenerDatos() {
  const Anio = this.AnioTemporal;
  const Mes = this.MesTemporal;

    this.Servicio.ObtenerResumen(Anio, Mes).subscribe({
      next: (res) => {
        // TopProductos
        if (res.TopProductos && Array.isArray(res.TopProductos)) {
            this.TopProductos = res.TopProductos;
        }
          // Guardamos total solicitudes por mes
        if (res.SolicitudesPorMes && typeof res.SolicitudesPorMes.total === 'number') {
          this.TotalSolicitudMes = res.SolicitudesPorMes.total;
        }
        // Línea - ResumenPorDiaMes
        if (res.ResumenPorDiaMes && res.ResumenPorDiaMes.datos && Array.isArray(res.ResumenPorDiaMes.datos)) {
          const labelsLine = res.ResumenPorDiaMes.datos.map((item: any) => item.dia);
          const dataLine = res.ResumenPorDiaMes.datos.map((item: any) => item.cantidad);
          const colorHue = Math.floor(Math.random() * 360);
          const borderColorLine = `hsl(${colorHue}, 70%, 50%)`;
          const backgroundColorLine = `hsla(${colorHue}, 70%, 60%, 0.3)`;

          this.ConfiguracionGraficoLineal = {
            labels: labelsLine,
            datasets: [{
              data: dataLine,
              borderColor: borderColorLine,
              backgroundColor: backgroundColorLine,
              fill: false,
              tension: 0.3,
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2
            }]
          };
        }

        // PolarArea - ClasificacionMes
        if (res.ClasificacionMes && Array.isArray(res.ClasificacionMes)) {
          const labels = res.ClasificacionMes.map((item: any) => item.NombreClasificacionProducto);
          const data = res.ClasificacionMes.map((item: any) => item.TotalRegistros);
          const backgroundColor = this.GenerarColoresAleatorios(labels.length);

          this.ConfiguracionGraficoRadar = {
            labels,
            datasets: [{
              data,
              backgroundColor
            }]
          };
        }

        // Barra - SolicitudesAño
        if (res.SolicitudesAño && res.SolicitudesAño.datos && Array.isArray(res.SolicitudesAño.datos)) {
          const labelsBar = res.SolicitudesAño.datos.map((item: any) => item.nombreMes);
          const dataBar = res.SolicitudesAño.datos.map((item: any) => item.cantidad);
          const backgroundColorBar = this.GenerarColoresAleatorios(labelsBar.length);

          this.ConfiguracionGraficoBarra = {
            labels: labelsBar,
            datasets: [{
              data: dataBar,
              backgroundColor: backgroundColorBar
            }]
          };
        }
      },
      error: (error) => {
        console.error('Error al obtener resumen:', error);
      }
    });
  }

  GenerarColoresAleatorios(cantidad: number): string[] {
    const colores: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      const hue = Math.floor(Math.random() * 360);
      colores.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colores;
  }
    DetectarCambiosAnio(event: any) {
    this.AnioTemporal = +event.target.value;
    this.ObtenerDatos();
  }

  DetectarCambiosMes(event: any) {
    this.MesTemporal = +event.target.value;
    this.ObtenerDatos();
  }
}
