import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoServicio } from '../../Servicios/ProductoServicio';
import { Producto } from '../../Modelos/Producto';
import { HttpClient } from '@angular/common/http';
import { Entorno } from '../../Entornos/Entorno';
import { ServicioCompartido } from '../../Servicios/ServicioCompartido';
import { SvgDecoradorComponent } from '../svg-decorador/svg-decorador.component';
import { CarritoComponent } from '../carrito/carrito.component';
import { Subscription } from 'rxjs';
import { ClasificacionProductoServicio } from '../../Servicios/ClasificacionProductoServicio';
import { AlertaServicio } from '../../Servicios/Alerta-Servicio';
import { PermisoServicio } from '../../Autorizacion/AutorizacionPermiso';
import { MenuPortadaServicio } from '../../Servicios/MenuPortadaServicio';
import { LoadingService } from '../../Servicios/LoadingService';
import { Observable } from 'rxjs';
import { SpinnerComponent } from '../spinner/spinner.component';

interface ProductoConCantidad extends Producto {
  cantidad?: number;
  imagenPreview?: string | null;
  imagenFile?: File | null;
}

interface PrecioTemp {
  moneda: string;
  valor: number;
}

@Component({
  selector: 'app-productos',
  imports: [CommonModule, FormsModule, SvgDecoradorComponent, CarritoComponent, SpinnerComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit, OnDestroy {
  private Url = `${Entorno.ApiUrl}`;
  private NombreEmpresa = `${Entorno.NombreEmpresa}`;
  private subscription!: Subscription;
  // Variables para el spinner
  cargandoOverlay: Observable<boolean>;

  // Variables originales
  productos: ProductoConCantidad[] = [];
  nombreClasificacion: string = '';
  codigoClasificacion: number = 0;
  cargando: boolean = true;
  error: string | null = null;
  totalItemsCarrito: number = 0;
  mostrarCarrito = false;
  isLoading: boolean = false;

  ordenAscendente: boolean = true;
  colorFooter: string = '';
  colorClasificacion: string = '';
  colorTextoClasificacion: string = '';
  terminoBusqueda: string = '';
  mostrarResultados: boolean = false;
  resultadosBusqueda: Producto[] = [];
  productosOriginales: ProductoConCantidad[] = [];
  busquedaActiva: boolean = false;
  DatosHeader: any = null;

  // Nueva variable para controlar el tipo de vista
  esBusquedaGlobal: boolean = false;
  textoBusquedaGlobal: string = '';

  // Variables para el modo edición
  modoEdicion: boolean = false;

  // Variables para editar nombres de productos
  editandoNombre: number | null = null;
  nombreOriginal: string = '';
  nombreTemporal: string = '';

  // Variables para editar precios de productos
  editandoPrecio: number | null = null;
  precioOriginal: string = '';
  precioTemporal: string = '';
  precioTemp: PrecioTemp = {
    moneda: '',
    valor: 0,
  };
  Data: any = null;
  colorNavbarEIcono: string = '';
  colorTextoNavbar: string = '';

  // Variables para nuevo producto
  creandoNuevoProducto: boolean = false;
  nuevaImagenPreview: string | null = null;
  nuevaImagenFile: File | null = null;
  nuevoProducto: ProductoConCantidad = this.inicializarNuevoProducto();

  @ViewChild('nuevaImagenInput') nuevaImagenInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('titleContent') titleContent!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoServicio: ProductoServicio,
    private servicioCompartido: ServicioCompartido,
    private clasificacionProductoServicio: ClasificacionProductoServicio,
    private alertaServicio: AlertaServicio,
    private menuPortadaServicio: MenuPortadaServicio,
    public Permiso: PermisoServicio,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {
    this.actualizarTotalCarrito();
    // Escuchar cambios en localStorage para actualizar el contador del carrito
    window.addEventListener('storage', () => {
      this.actualizarTotalCarrito();
    });
    this.cargandoOverlay = this.loadingService.loading$;
  }

  ngOnInit(): void {
    // Verificar si es una búsqueda global o por categoría
    this.route.url.subscribe(url => {
      const rutaActual = url.map(segment => segment.path).join('/');

      if (rutaActual.includes('buscar')) {
        // Es una búsqueda global
        this.esBusquedaGlobal = true;
        this.route.queryParams.subscribe(params => {
          if (params['texto']) {
            this.textoBusquedaGlobal = params['texto'];
            this.terminoBusqueda = params['texto'];
            this.nombreClasificacion = `Búsqueda: "${this.textoBusquedaGlobal}"`;
            this.buscarProductosGlobalmente(this.textoBusquedaGlobal);
          }
        });
      } else {
        // Es una búsqueda por categoría (comportamiento original)
        this.esBusquedaGlobal = false;
        this.route.params.subscribe((params) => {
          if (params['codigo']) {
            this.codigoClasificacion = +params['codigo'];
            this.cargarClasificacion(this.codigoClasificacion);
            this.cargarProductos(this.codigoClasificacion);
          }
        });
      }
    });

    this.servicioCompartido.colorFooter$.subscribe((color) => {
      this.colorFooter = color;
    });

    this.servicioCompartido.datosClasificacion$.subscribe((datos) => {
      this.colorClasificacion =
        datos.colorClasificacionFondo ||
        localStorage.getItem('colorClasificacion') ||
        '';
      this.colorTextoClasificacion =
        datos.colorClasificacionTexto ||
        localStorage.getItem('colorClasificacionTexto') ||
        '';
    });

    this.servicioCompartido.datosHeader$.subscribe((datos) => {
      this.DatosHeader = datos;
    });

    this.subscription = this.servicioCompartido.carritoVaciado$.subscribe(
      () => {
        this.actualizarTotalCarrito();
      }
    );

    this.cargarData();
    // Recuperar el total de items en el carrito si existe en localStorage
    this.actualizarTotalCarrito();
  }

  ngOnDestroy(): void {
    // Importante: desuscribirse para evitar memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // Método para búsqueda global de productos
  buscarProductosGlobalmente(texto: string): void {
    this.cargando = true;
    this.error = null;

    this.productoServicio.BuscarProductos(1, texto).subscribe({
      next: (data) => {
        const esAdminOSuperAdmin = this.Permiso.PermisoAdminSuperAdmin();

        // Filtrar productos según el estatus y rol del usuario
        const productosFiltrados = data.filter((producto: Producto) => {
          return (
            producto.Estatus === 1 ||
            (producto.Estatus === 2 && esAdminOSuperAdmin)
          );
        });
        // Agregar la propiedad cantidad a cada producto
        this.productos = productosFiltrados.map((producto: Producto) => ({
          ...producto,
          cantidad: 1,
        }));
        this.productosOriginales = [...this.productos];
        this.busquedaActiva = true;
        this.cargando = false;

        if (this.productos.length === 0) {
          this.error = `No se encontraron productos que coincidan con "${texto}"`;
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = `No se encontraron productos que coincidan con "${texto}"`;
        } else {
          this.error = 'No se pudieron cargar los productos. Contacte al administrador.';
        }

        this.cargando = false;
      },
    });
  }

  cargarProductos(codigo: number): void {
    this.cargando = true;
    this.error = null;

    this.productoServicio.ListadoProductos(codigo).subscribe({
      next: (data) => {
        const esAdminOSuperAdmin = this.Permiso.PermisoAdminSuperAdmin();

        // Filtrar productos según el estatus y rol del usuario
        const productosFiltrados = data.filter((producto: Producto) => {
          return (
            producto.Estatus === 1 ||
            (producto.Estatus === 2 && esAdminOSuperAdmin)
          );
        });

        // Agregar cantidad y guardar
        this.productos = productosFiltrados.map((producto: Producto) => ({
          ...producto,
          cantidad: 1,
        }));

        this.productosOriginales = [...this.productos]; // copia original
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los productos. Contacte al administrador.';
        this.cargando = false;
      },
    });
  }
  cargarClasificacion(codigo: number): void {
    this.clasificacionProductoServicio.ObtenerPorCodigo(codigo).subscribe({
      next: (data) => {
        this.nombreClasificacion = data.NombreClasificacionProducto;

        // Formatear el nombre de la categoría para URL
        const nombreFormateado = data.NombreClasificacionProducto
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-');

        // Si el nombre en la URL no coincide con el nombre formateado esperado
        if (this.nombreClasificacion !== nombreFormateado) {
          // Redirigir a la URL correcta sin perder el estado
          this.router.navigate(
            ['/productos', this.codigoClasificacion, nombreFormateado],
            {
              replaceUrl: true, // Esto reemplaza la URL actual en el historial
            }
          );
          return; // Terminamos la ejecución aquí, los productos se cargarán después de la redirección
        }
      },
      error: (err) => {
        this.alertaServicio.MostrarError(err, 'Error al cargar clasificación');
      },
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

  // Métodos originales
  incrementarCantidad(producto: ProductoConCantidad): void {
    if (!producto.cantidad) {
      producto.cantidad = 1;
    }
    producto.cantidad++;
  }

  decrementarCantidad(producto: ProductoConCantidad): void {
    if (!producto.cantidad) {
      producto.cantidad = 1;
    }
    if (producto.cantidad > 1) {
      producto.cantidad--;
    }
  }

  agregarAlCarrito(producto: ProductoConCantidad): void {
    // Obtener el carrito actual del localStorage
    let carrito: ProductoConCantidad[] = [];
    const carritoGuardado = localStorage.getItem('carrito');

    if (carritoGuardado) {
      carrito = JSON.parse(carritoGuardado);
    }

    // Verificar si el producto ya está en el carrito
    const index = carrito.findIndex(
      (item) => item.CodigoProducto === producto.CodigoProducto
    );

    if (index !== -1) {
      // Si ya existe, actualizar la cantidad
      carrito[index].cantidad =
        (carrito[index].cantidad || 0) + (producto.cantidad || 1);
    } else {
      // Si no existe, agregar al carrito
      carrito.push({
        ...producto,
        cantidad: producto.cantidad || 1,
      });
    }

    this.alertaServicio.MostrarToast('El producto se agregó al carrito', 'success');

    // Guardar el carrito actualizado
    localStorage.setItem('carrito', JSON.stringify(carrito));

    // Actualizar el contador del carrito
    this.actualizarTotalCarrito();
  }

  actualizarTotalCarrito(): void {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      const carrito: ProductoConCantidad[] = JSON.parse(carritoGuardado);
      this.totalItemsCarrito = carrito.reduce(
        (total, item) => total + (item.cantidad || 1),
        0
      );
    } else {
      this.totalItemsCarrito = 0;
    }
  }

  volver(): void {
    this.router.navigate(['/clasificacion']); // Ajusta esta ruta según tu estructura
  }

  ordenarProductos(): void {
    if (!this.productos) return;

    this.ordenAscendente = !this.ordenAscendente;

    this.productos.sort((a, b) => {
      const nombreA = a?.NombreProducto || '';
      const nombreB = b?.NombreProducto || '';

      return this.ordenAscendente
        ? nombreA.localeCompare(nombreB)
        : nombreB.localeCompare(nombreA);
    });
  }

  // ============= MÉTODOS PARA MODO EDICIÓN =============

  toggleModoEdicion(): void {
    // Solo permitir modo edición en vista de categoría, no en búsqueda global
    if (this.esBusquedaGlobal) {
      this.alertaServicio.MostrarAlerta('El modo edición no está disponible en la búsqueda global');
      return;
    }

    this.modoEdicion = !this.modoEdicion;
    this.crearNuevoProducto();

    // Si salimos del modo edición, resetear todos los estados de edición
    if (!this.modoEdicion) {
      this.cancelarEdicionNombre(null);
      this.cancelarEdicionPrecio(null);
      this.cancelarNuevoProducto();
    }
  }

  // ---- Edición del nombre de un producto ----

  iniciarEdicionNombre(producto: ProductoConCantidad | null): void {
    this.cancelarEdicionPrecio(null);

    if (!producto || !producto.CodigoProducto || !producto.NombreProducto) {
      console.warn('Producto inválido al intentar editar nombre:', producto);
      return;
    }

    this.editandoNombre = producto.CodigoProducto;
    this.nombreOriginal = producto.NombreProducto;
    this.nombreTemporal = producto.NombreProducto;
  }

  guardarNombre(producto: ProductoConCantidad): void {
    if (!this.nombreTemporal || this.nombreTemporal.trim() === '') {
      this.alertaServicio.MostrarAlerta('El nombre del producto no puede estar vacío');
      return;
    }

    delete producto.UrlImagen;

    // Actualizar el nombre en el modelo
    producto.NombreProducto = this.nombreTemporal;

    this.loadingService.show(); // Bloquea UI
    // Llamar al servicio para actualizar en la base de datos
    this.productoServicio.Editar(producto).subscribe({
      next: (response) => {
        this.cargarProductos(this.codigoClasificacion);
        this.alertaServicio.MostrarExito('Nombre del producto actualizado correctamente');
        this.editandoNombre = null;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error al actualizar nombre', error);
        this.alertaServicio.MostrarError(error, 'Error al actualizar nombre');
        // Restaurar el nombre original en caso de error
        producto.NombreProducto = this.nombreOriginal;
        this.editandoNombre = null;
      },
    });
  }

  cancelarEdicionNombre(producto: ProductoConCantidad | null): void {
    if (this.editandoNombre !== null) {
      // Buscar el producto que se estaba editando
      const productoEditado = this.productos.find(
        (p) => p.CodigoProducto === this.editandoNombre
      );

      if (productoEditado) {
        productoEditado.NombreProducto = this.nombreOriginal;
      }

      this.editandoNombre = null;
    }
  }

  // ---- Edición del precio de un producto ----

  iniciarEdicionPrecio(producto: ProductoConCantidad | null): void {
    this.cancelarEdicionNombre(null);

    if (
      !producto ||
      !producto.CodigoProducto ||
      !producto.Moneda ||
      !producto.Precio
    ) {
      console.warn('Producto inválido al intentar editar precio:', producto);
      return;
    }

    this.editandoPrecio = producto.CodigoProducto;
    this.precioTemp = {
      moneda: producto.Moneda,
      valor: producto.Precio,
    };

    // Guardar el precio original para poder restaurarlo si se cancela
    this.precioOriginal = `${producto.Moneda} ${producto.Precio}`;
  }

  guardarPrecio(producto: ProductoConCantidad): void {
    if (!this.precioTemp.moneda || this.precioTemp.moneda.trim() === '') {
      this.alertaServicio.MostrarAlerta('La moneda no puede estar vacía');
      return;
    }

    if (this.precioTemp.valor <= 0) {
      this.alertaServicio.MostrarAlerta('El precio debe ser mayor que cero');
      return;
    }

    delete producto.UrlImagen;
    // Actualizar el producto
    producto.Moneda = this.precioTemp.moneda;
    producto.Precio = this.precioTemp.valor;

    this.loadingService.show(); // Bloquea UI
    // Llamar al servicio para actualizar en la base de datos
    this.productoServicio.Editar(producto).subscribe({
      next: (response) => {
        console.log('Precio actualizado correctamente', response);
        this.cargarProductos(this.codigoClasificacion);
        this.alertaServicio.MostrarExito('Precio del producto actualizado correctamente');
        this.editandoPrecio = null;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        this.alertaServicio.MostrarError(error, 'Error al actualizar precio');
        this.cargarProductos(this.codigoClasificacion);
        // Restaurar valores originales
        const partes = this.precioOriginal.match(/([^\d]*)(\d+(?:\.\d+)?)/);
        if (partes) {
          producto.Moneda = partes[1].trim();
          producto.Precio = parseFloat(partes[2]);
        }

        this.editandoPrecio = null;
      },
    });
  }

  cancelarEdicionPrecio(producto: ProductoConCantidad | null): void {
    if (this.editandoPrecio !== null) {
      // Buscar el producto que se estaba editando
      const productoEditado = this.productos.find(
        (p) => p.CodigoProducto === this.editandoPrecio
      );

      if (productoEditado) {
        // Restaurar valores originales
        const partes = this.precioOriginal.match(/([^\d]*)(\d+(?:\.\d+)?)/);
        if (partes) {
          productoEditado.Moneda = partes[1].trim();
          productoEditado.Precio = parseFloat(partes[2]);
        }
      }

      this.editandoPrecio = null;
    }
  }

  // ---- Cambiar imagen de un producto ----

  cambiarImagenProducto(evento: any, producto: ProductoConCantidad): void {
    const file = evento.target.files[0];
    if (file) {
      this.subirImagenProducto(file, producto);
    }
  }

  subirImagenProducto(file: File, producto: ProductoConCantidad): void {
    this.loadingService.show(); // Bloquea UI
    const formData = new FormData();
    formData.append('Imagen', file);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'Producto');
    formData.append('CodigoVinculado', this.codigoClasificacion.toString());
    formData.append('CodigoPropio', (producto.CodigoProducto ?? '').toString());
    formData.append('CampoVinculado', 'CodigoClasificacionProducto');
    formData.append('CampoPropio', 'CodigoProducto');
    formData.append('NombreCampoImagen', 'UrlImagen');

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta completa del backend al subir imagen:', response);
        if (response?.Alerta) {
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }

        if (response && response.Entidad && response.Entidad.UrlImagen) {
          // Actualizar la URL de la imagen en el producto
          producto.UrlImagen = response.Entidad.UrlImagen;
          this.alertaServicio.MostrarExito('Imagen actualizada correctamente');
          this.cargarProductos(this.codigoClasificacion);
          this.loadingService.hide();
        } else {
          this.alertaServicio.MostrarAlerta('Error al procesar la respuesta del servidor');

          // Recargar productos para obtener la imagen actualizada
          this.cargarProductos(this.codigoClasificacion);
          this.loadingService.hide();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError(error, 'Error al subir imagen');
        }
      },
    });
  }

  // ---- Nuevo producto simplificado ----

  inicializarNuevoProducto(): ProductoConCantidad {
    return {
      CodigoProducto: 0,
      CodigoClasificacionProducto: this.codigoClasificacion,
      NombreProducto: '',
      Moneda: 'Q',
      Precio: 0,
      UrlImagen: '',
      Estatus: 1,
      cantidad: 1,
    };
  }

  crearNuevoProducto(): void {
    // Cerrar cualquier edición en curso
    this.cancelarEdicionNombre(null);
    this.cancelarEdicionPrecio(null);

    this.creandoNuevoProducto = true;
    this.nuevoProducto = this.inicializarNuevoProducto();
    this.nuevoProducto.CodigoClasificacionProducto = this.codigoClasificacion;
    this.nuevaImagenPreview = null;
    this.nuevaImagenFile = null;
  }

  cancelarNuevoProducto(): void {
    this.creandoNuevoProducto = false;
    this.nuevoProducto = this.inicializarNuevoProducto();
    this.nuevaImagenPreview = null;
    this.nuevaImagenFile = null;
  }

  seleccionarNuevaImagen(evento: any): void {
    const file = evento.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nuevaImagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.nuevaImagenFile = file;
    }
  }

  esFormularioValido(): boolean {
    if (
      !this.nuevoProducto ||
      !this.nuevoProducto.NombreProducto ||
      !this.nuevoProducto.Precio
    ) {
      return false;
    }

    return (
      this.nuevoProducto.NombreProducto.trim() !== '' &&
      this.nuevoProducto.Precio > 0 &&
      this.nuevaImagenFile !== null
    );
  }

  guardarNuevoProducto(): void {
    if (!this.esFormularioValido()) {
      this.alertaServicio.MostrarAlerta(
        'Por favor, complete todos los campos y seleccione una imagen'
      );
      this.isLoading = false;
      return;
    }

    // Verificar si ya existe un producto con el mismo nombre
    if (
      this.nuevoProducto.NombreProducto &&
      this.existeProductoConMismoNombre(this.nuevoProducto.NombreProducto)
    ) {
      this.alertaServicio.MostrarAlerta(
        'Ya existe un producto con el mismo nombre. Por favor, elija otro nombre.'
      );
      this.isLoading = false;
      return;
    }

    // 1. Primero subir la imagen (esto crea el registro del producto automáticamente)
    this.subirImagenNuevoProducto();
  }

  subirImagenNuevoProducto(): void {
    if (!this.nuevaImagenFile) return;

    this.loadingService.show(); // Bloquea UI
    this.isLoading = true;
    const formData = new FormData();
    formData.append('Imagen', this.nuevaImagenFile);
    formData.append('CarpetaPrincipal', this.NombreEmpresa);
    formData.append('SubCarpeta', 'Producto');
    formData.append('CodigoVinculado', this.codigoClasificacion.toString());
    formData.append('CodigoPropio', ''); // Vacío para que el servidor cree uno nuevo
    formData.append('CampoVinculado', 'CodigoClasificacionProducto');
    formData.append('CampoPropio', 'CodigoProducto');
    formData.append('NombreCampoImagen', 'UrlImagen');

    this.http.post(`${this.Url}subir-imagen`, formData).subscribe({
      next: (response: any) => {
        if (response?.Alerta) {
          this.isLoading = false;
          this.alertaServicio.MostrarAlerta(response.Alerta, 'Atención');
          return;
        }

        if (response && response.Entidad && response.Entidad.CodigoProducto) {
          const codigoProductoGenerado = response.Entidad.CodigoProducto;

          const productoActualizado: Producto = {
            CodigoProducto: codigoProductoGenerado,
            CodigoClasificacionProducto: this.codigoClasificacion,
            NombreProducto: this.nuevoProducto.NombreProducto,
            Moneda: this.nuevoProducto.Moneda || '',
            Precio: this.nuevoProducto.Precio || 0,
            Estatus: 1,
          };

          this.productoServicio.Editar(productoActualizado).subscribe({
            next: () => {
              this.isLoading = false;
              this.alertaServicio.MostrarExito('Producto creado correctamente');
              this.cargarProductos(this.codigoClasificacion);
              this.cancelarNuevoProducto();
              this.loadingService.hide();
            },
            error: (editError) => {
              this.isLoading = false;
              this.alertaServicio.MostrarError(editError, 'Error al actualizar datos del producto');
              this.cargarProductos(this.codigoClasificacion);
              this.cancelarNuevoProducto();
              this.loadingService.hide();
            },
          });
        } else {
          this.loadingService.hide();
          this.isLoading = false;
          this.alertaServicio.MostrarAlerta('Error al procesar la respuesta del servidor');
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.isLoading = false;
        if (error?.error?.Alerta) {
          this.alertaServicio.MostrarAlerta(error.error.Alerta, 'Atención');
        } else {
          this.alertaServicio.MostrarError(error, 'Error al subir imagen y crear producto');
        }
      },
    });
  }

  existeProductoConMismoNombre(nombre: string | undefined): boolean {
    if (!nombre || nombre.trim() === '') return false;

    const nombreNormalizado = nombre.trim().toLowerCase();
    return this.productos.some(
      (producto) =>
        producto.NombreProducto &&
        producto.NombreProducto.trim().toLowerCase() === nombreNormalizado
    );
  }

  // ---- Eliminar producto ----

  eliminarProducto(producto: ProductoConCantidad): void {
    if (!producto.CodigoProducto) {
      this.alertaServicio.MostrarAlerta('El producto no tiene un código válido.');
      return;
    }

    this.alertaServicio.Confirmacion(
      `¿Está seguro que desea eliminar el producto "${producto.NombreProducto}"?`,
      'Esta acción no se puede deshacer.'
    ).then((confirmado) => {
      if (confirmado) {
        this.loadingService.show(); // Bloquea UI
        this.productoServicio.Eliminar(producto.CodigoProducto!).subscribe({
          next: (response) => {
            this.alertaServicio.MostrarExito('Producto eliminado correctamente');

            // Eliminar de la lista local
            this.productos = this.productos.filter(
              (p) => p.CodigoProducto !== producto.CodigoProducto
            );
            this.loadingService.hide();
          },
          error: (error) => {
            this.loadingService.hide();
            this.alertaServicio.MostrarError(error, 'Error al eliminar el producto');
          },
        });
      }
    });
  }

  // Método modificado para manejar ambos tipos de búsqueda
  buscar(): void {
    if (this.terminoBusqueda.trim()) {
      // Si estamos en búsqueda global, hacer nueva búsqueda
      if (this.esBusquedaGlobal) {
        this.textoBusquedaGlobal = this.terminoBusqueda;
        this.nombreClasificacion = `Búsqueda: "${this.textoBusquedaGlobal}"`;
        this.buscarProductosGlobalmente(this.terminoBusqueda);
      } else {
        // Si estamos en vista de categoría, hacer búsqueda local
        this.buscarEnTiempoReal();
        this.productos = this.resultadosBusqueda;
        this.busquedaActiva = true;
      }
    }
  }

  buscarEnTiempoReal(): void {
    if (this.terminoBusqueda.length === 0) {
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.resultadosBusqueda = this.productosOriginales.filter(
      (producto) =>
        producto.NombreProducto?.toLowerCase().includes(termino) ?? false
    );
  }

  seleccionarProducto(): void {
    this.productos = this.resultadosBusqueda;
    this.mostrarResultados = false;
    this.busquedaActiva = true;
  }

  // Método modificado para cancelar búsqueda
  cancelarBusqueda(): void {
    if (this.terminoBusqueda.trim()) {
      if (this.esBusquedaGlobal) {
        // Si es búsqueda global, volver a clasificaciones
        this.router.navigate(['/clasificacion']);
      } else {
        // Si es vista de categoría, restaurar productos originales
        this.busquedaActiva = false;
        this.terminoBusqueda = '';
        this.productos = this.productosOriginales; // Restaurar la lista original
      }
    }
  }

  ocultarResultados(): void {
    setTimeout(() => {
      this.mostrarResultados = false;
    }, 200);
  }

  //Método para ver el carrito
  alternarCarrito() {
    this.mostrarCarrito = !this.mostrarCarrito;
    // Si activamos el carrito, actualizamos el contador
    if (this.mostrarCarrito) {
      this.actualizarTotalCarrito();
    }
  }

  toggleEstadoProducto(producto: Producto): void {
    const nuevoEstado = producto.Estatus === 1 ? 2 : 1;

    const productoActualizado: Producto = {
      ...producto,
      Estatus: nuevoEstado
    };

    delete productoActualizado.UrlImagen;

    this.loadingService.show(); // Bloquea UI
    this.productoServicio.Editar(productoActualizado).subscribe({
      next: () => {
        producto.Estatus = nuevoEstado; // Actualiza el estado local
        this.alertaServicio.MostrarExito(
          `Producto ${nuevoEstado === 1 ? 'activado' : 'desactivado'} correctamente`
        );
        this.loadingService.hide();
      },
      error: (err) => {
        this.loadingService.hide();
        this.alertaServicio.MostrarError(err, 'Error al cambiar el estado del producto');
      }
    });
  }

  getProductosActivos() {
    return this.productos.filter(producto => producto.Estatus !== 2);
  }

}