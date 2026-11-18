/* =====================================================================
   controlador.js · EVENTOS Y FLUJO
   Escucha al usuario, le pide al modelo y al servicio de la API, y le
   dice a la vista qué pintar. No tiene reglas de negocio ni crea HTML.
   ===================================================================== */

"use strict";

const Controlador = {
    // null = el formulario está creando; un número = está editando ese carro
    idEditando: null,

    // Filtros combinados que eligió el usuario
    filtros: { texto: "", categoria: "Todas", estado: "todos" },

    // Columna y dirección del orden de la tabla (por defecto, en orden de llegada)
    orden: { columna: "id", direccion: "asc" },

    // Página actual de la tabla
    pagina: 1,

    // ----- Arranque -----
    iniciar() {
        Modelo.cargar();
        Vista.llenarCategorias(CATEGORIAS);
        this.escucharEventos();
        this.refrescar();
        // La TRM se pide sin bloquear: la página se usa mientras llega
        this.cargarTrm();
    },

    // ----- Eventos -----
    escucharEventos() {
        // Guardar: crea o edita según idEditando
        document.querySelector("#formCarro").addEventListener("submit", (evento) => {
            evento.preventDefault();
            this.guardar();
        });

        document.querySelector("#botonCancelar").addEventListener("click", () => {
            this.cancelarEdicion();
            this.refrescar();
        });

        // Delegación: un solo listener para Editar y Eliminar de todas las tarjetas
        document.querySelector("#contenedorCarros").addEventListener("click", (evento) => {
            const boton = evento.target.closest("button[data-accion]");
            if (!boton) {
                return;
            }
            const id = Number(boton.dataset.id);
            if (boton.dataset.accion === "editar") {
                this.editar(id);
            }
            if (boton.dataset.accion === "eliminar") {
                this.eliminar(id);
            }
        });

        // Filtros combinados: texto, disponibilidad y categoría
        document.querySelector("#buscador").addEventListener("input", (evento) => {
            this.cambiarFiltro("texto", evento.target.value);
        });

        document.querySelector("#filtroEstado").addEventListener("change", (evento) => {
            this.cambiarFiltro("estado", evento.target.value);
        });

        document.querySelector("#listaCategorias").addEventListener("click", (evento) => {
            const boton = evento.target.closest(".filtros__boton");
            if (boton) {
                this.cambiarFiltro("categoria", boton.dataset.categoria);
            }
        });

        // Delegación en el encabezado: ordenar por la columna tocada
        document.querySelector("#tablaInventario thead").addEventListener("click", (evento) => {
            const boton = evento.target.closest(".tabla__orden");
            if (boton) {
                this.ordenarPor(boton.dataset.columna);
            }
        });

        // Paginación
        document.querySelector("#botonAnterior").addEventListener("click", () => {
            this.pagina -= 1;
            this.refrescar();
        });

        document.querySelector("#botonSiguiente").addEventListener("click", () => {
            this.pagina += 1;
            this.refrescar();
        });

        // Exportar a CSV lo que se ve (filtrado y ordenado, todas las páginas)
        document.querySelector("#botonCsv").addEventListener("click", () => {
            const texto = Modelo.generarCsv(this.obtenerLista());
            Vista.descargarCsv(texto, `vendiautos-inventario-${Api.obtenerFechaHoy()}.csv`);
        });

        // Volver a consultar la API
        document.querySelector("#botonTrm").addEventListener("click", () => {
            this.cargarTrm();
        });

        // Volver a los datos de ejemplo
        document.querySelector("#botonRestaurar").addEventListener("click", () => {
            if (window.confirm("¿Borrar los cambios guardados y volver a los 6 carros de ejemplo?")) {
                Modelo.restaurar();
                window.location.reload();
            }
        });

        // Contacto: el navegador valida primero (required, email, pattern, minlength)
        document.querySelector("#formContacto").addEventListener("submit", (evento) => {
            evento.preventDefault();
            const nombre = Vista.leerNombreContacto();
            Vista.mostrarMensaje(
                "#mensajeContacto",
                `¡Gracias, ${nombre}! Recibimos tu registro y un asesor de Vendiautos te contactará pronto.`,
                "exito"
            );
            Vista.limpiarContacto();
        });
    },

    // ----- API: consumo de la TRM -----

    // async: puede esperar con await sin congelar la página
    async cargarTrm() {
        Vista.mostrarCargaTrm();
        try {
            const historial = await Api.obtenerTrm();
            Modelo.guardarTrm(historial);
            Vista.pintarTrm(Modelo.trm, Modelo.calcularCambiosTrm(), Modelo.calcularEstadisticasTrm());
        } catch (error) {
            Modelo.limpiarTrm();
            Vista.mostrarErrorTrm(error.message);
        }
        // Con o sin TRM, se repintan tarjetas, tabla y resumen
        this.refrescar();
    },

    // ----- Filtros, orden y páginas -----

    // Cambia un filtro y vuelve a la página 1
    cambiarFiltro(nombre, valor) {
        this.filtros[nombre] = valor;
        this.pagina = 1;
        this.refrescar();
    },

    // Misma columna: invierte la dirección. Columna nueva: empieza ascendente
    ordenarPor(columna) {
        const mismaColumna = this.orden.columna === columna;
        const direccion = mismaColumna && this.orden.direccion === "asc" ? "desc" : "asc";
        this.orden = { columna: columna, direccion: direccion };
        this.pagina = 1;
        this.refrescar();
    },

    // Lista filtrada y ordenada, con el precio en dólares (o null si no hay TRM)
    obtenerLista() {
        const filtrados = Modelo.filtrar(this.filtros);
        return Modelo.ordenar(filtrados, this.orden).map((carro) => ({
            ...carro,
            dolares: Modelo.convertirADolares(carro.precio)
        }));
    },

    // ----- CRUD -----

    // CREATE y UPDATE con el mismo formulario
    guardar() {
        const datos = Vista.leerFormulario();
        const errores = Modelo.validar({ id: this.idEditando, ...datos });

        // Si hay errores se muestran todos y no se guarda nada
        if (errores.length > 0) {
            Vista.mostrarErrores(errores);
            return;
        }

        const nombre = `${datos.nombre.trim()} ${datos.anio}`;
        if (this.idEditando === null) {
            Modelo.agregar(datos);
            Vista.mostrarMensaje("#mensajeCarro", `Se publicó el ${nombre} en el catálogo.`, "exito");
        } else {
            Modelo.actualizar(this.idEditando, datos);
            Vista.mostrarMensaje("#mensajeCarro", `Se actualizó el ${nombre}.`, "exito");
        }

        this.cancelarEdicion();
        this.refrescar();
    },

    // Prepara el formulario para editar un carro
    editar(id) {
        this.idEditando = id;
        Vista.limpiarErrores();
        Vista.llenarFormulario(Modelo.buscarPorId(id));
        Vista.mostrarMensaje("#mensajeCarro", "Modifica los datos y presiona Guardar cambios.", "exito");
        this.refrescar();
    },

    // Vuelve al modo "crear"
    cancelarEdicion() {
        this.idEditando = null;
        Vista.limpiarFormulario();
    },

    // DELETE con confirmación
    eliminar(id) {
        const carro = Modelo.buscarPorId(id);
        if (!window.confirm(`¿Eliminar el ${carro.nombre} ${carro.anio} del catálogo?`)) {
            return;
        }

        Modelo.eliminar(id);
        if (this.idEditando === id) {
            this.cancelarEdicion();
        }
        Vista.mostrarMensaje("#mensajeCarro", `Se eliminó el ${carro.nombre} ${carro.anio}.`, "exito");
        this.refrescar();
    },

    // READ: vuelve a pintar todo con los datos actuales
    refrescar() {
        const lista = this.obtenerLista();

        // Si se borró el último carro de una página, se retrocede una
        const totalPaginas = Modelo.contarPaginas(lista.length);
        this.pagina = Math.min(Math.max(this.pagina, 1), totalPaginas);

        const opciones = ["Todas", ...CATEGORIAS].map((nombre) => ({
            nombre: nombre,
            cantidad: Modelo.contarPorCategoria(nombre)
        }));

        Vista.pintarCarros(lista, Modelo.carros.length, this.idEditando);
        Vista.pintarTabla(Modelo.paginar(lista, this.pagina), STOCK_MAXIMO);
        Vista.pintarOrden(this.orden);
        Vista.pintarPaginacion(this.pagina, totalPaginas);
        Vista.pintarCategorias(opciones, this.filtros.categoria);
        Vista.pintarResumen(Modelo.calcularResumen());
    }
};
