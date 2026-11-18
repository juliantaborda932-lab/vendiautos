/* =====================================================================
   vista.js · CAPA DE PRESENTACIÓN
   Todo lo que toca el DOM: dibuja tarjetas, tabla, filtros, resumen y
   la sección del dólar, y lee o llena los formularios.
   No guarda datos, no usa localStorage y no conoce las reglas de negocio:
   solo pinta lo que le pasa el controlador.
   ===================================================================== */

"use strict";

const Vista = {
    // Formatos de número para Colombia
    pesos: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
    dolares: new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    pesosConDecimales: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }),

    // Campos del formulario de carros (el id del HTML = el nombre del dato)
    campos: ["nombre", "anio", "categoria", "precio", "kilometraje", "unidades"],

    // ----- Ayudas de formato -----

    // 38000 → "38.000 km"
    formatearKilometros(valor) {
        return `${valor.toLocaleString("es-CO")} km`;
    },

    // "2026-11-09" → "lunes, 9 de noviembre de 2026"
    formatearFecha(fecha) {
        const [anio, mes, dia] = fecha.split("-").map(Number);
        return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { dateStyle: "full" });
    },

    // Texto según cuántas unidades quedan en el patio
    describirStock(unidades) {
        if (unidades === 0) {
            return "Agotado";
        }
        if (unidades === 1) {
            return "Última unidad";
        }
        if (unidades === 2) {
            return "Últimas 2 unidades";
        }
        return `${unidades} unidades disponibles`;
    },

    // Modificador de color de la barra de stock
    obtenerNivelStock(unidades) {
        if (unidades >= 4) {
            return "stock--alto";
        }
        if (unidades >= 2) {
            return "stock--medio";
        }
        return "stock--bajo";
    },

    // Crea un elemento con una clase y un texto (textContent: nunca ejecuta HTML)
    crearElemento(etiqueta, clase, texto) {
        const elemento = document.createElement(etiqueta);
        if (clase) {
            elemento.classList.add(clase);
        }
        if (texto !== undefined) {
            elemento.textContent = texto;
        }
        return elemento;
    },

    // Botón con data-accion y data-id para la delegación de eventos
    crearBoton(texto, accion, id) {
        const boton = this.crearElemento("button", "boton", texto);
        boton.type = "button";
        boton.classList.add(`boton--${accion}`);
        boton.dataset.accion = accion;
        boton.dataset.id = id;
        return boton;
    },

    // ----- Tarjetas del catálogo -----

    // Arma la tarjeta de un carro. carro.dolares llega calculado (o null)
    crearTarjeta(carro, idEditando) {
        const tarjeta = this.crearElemento("article", "tarjeta");

        // Estados visuales con classList
        if (carro.unidades === 0) {
            tarjeta.classList.add("tarjeta--agotada");
        } else if (carro.unidades <= 2) {
            tarjeta.classList.add("tarjeta--pocas");
        }
        if (carro.id === idEditando) {
            tarjeta.classList.add("tarjeta--editando");
        }

        const imagen = this.crearElemento("img", "tarjeta__imagen");
        imagen.src = carro.imagen;
        imagen.alt = `${carro.nombre} ${carro.anio}`;
        imagen.width = 300;
        imagen.height = 169;

        const acciones = this.crearElemento("div", "tarjeta__acciones");
        acciones.append(
            this.crearBoton("Editar", "editar", carro.id),
            this.crearBoton("Eliminar", "eliminar", carro.id)
        );

        tarjeta.append(
            imagen,
            this.crearElemento("p", "tarjeta__categoria", carro.categoria),
            this.crearElemento("h3", "tarjeta__titulo", `${carro.nombre} ${carro.anio}`),
            this.crearElemento("p", "tarjeta__precio", this.pesos.format(carro.precio))
        );

        // El precio en dólares solo aparece si la API respondió
        if (carro.dolares !== null) {
            tarjeta.append(this.crearElemento("p", "tarjeta__dolares", `≈ ${this.dolares.format(carro.dolares)}`));
        }

        tarjeta.append(
            this.crearElemento("p", "tarjeta__detalle", `${this.formatearKilometros(carro.kilometraje)} · Modelo ${carro.anio}`),
            this.crearElemento("p", "tarjeta__stock", this.describirStock(carro.unidades)),
            acciones
        );
        return tarjeta;
    },

    // Dibuja las tarjetas, el contador y el aviso de "sin resultados"
    pintarCarros(lista, total, idEditando) {
        const contenedor = document.querySelector("#contenedorCarros");
        contenedor.replaceChildren();

        if (lista.length === 0) {
            contenedor.append(this.crearElemento("p", "aviso", "No encontramos carros con esos filtros. Prueba con otra palabra, categoría o disponibilidad."));
        }

        lista.forEach((carro) => contenedor.append(this.crearTarjeta(carro, idEditando)));

        const palabra = total === 1 ? "carro" : "carros";
        document.querySelector("#contador").textContent = `Mostrando ${lista.length} de ${total} ${palabra}.`;
    },

    // ----- Tabla de inventario -----

    // Crea una celda; las numéricas se alinean a la derecha
    crearCelda(texto, esNumero) {
        return this.crearElemento("td", esNumero ? "tabla__numero" : null, texto);
    },

    // Pinta solo los carros de la página actual
    pintarTabla(carros, stockMaximo) {
        const cuerpo = document.querySelector("#cuerpoTabla");
        cuerpo.replaceChildren();

        if (carros.length === 0) {
            const fila = document.createElement("tr");
            const celda = this.crearCelda("No hay carros con esos filtros.", false);
            celda.colSpan = 7;
            fila.append(celda);
            cuerpo.append(fila);
            return;
        }

        carros.forEach((carro) => {
            const fila = document.createElement("tr");
            if (carro.unidades === 0) {
                fila.classList.add("tabla__fila--agotada");
            }

            // Celda de stock con la barra <progress>
            const celdaStock = document.createElement("td");
            const barra = this.crearElemento("progress", "stock");
            barra.classList.add(this.obtenerNivelStock(carro.unidades));
            barra.max = stockMaximo;
            barra.value = carro.unidades;
            barra.setAttribute("aria-label", `${carro.unidades} de ${stockMaximo} unidades`);
            celdaStock.append(barra, `${carro.unidades} de ${stockMaximo}`);

            fila.append(
                this.crearCelda(carro.nombre, false),
                this.crearCelda(carro.categoria, false),
                this.crearCelda(carro.anio, true),
                this.crearCelda(this.pesos.format(carro.precio), true),
                this.crearCelda(carro.dolares === null ? "—" : this.dolares.format(carro.dolares), true),
                this.crearCelda(this.formatearKilometros(carro.kilometraje), true),
                celdaStock
            );
            cuerpo.append(fila);
        });
    },

    // Marca la columna ordenada con flecha (clase) y aria-sort (lectores de pantalla)
    pintarOrden({ columna, direccion }) {
        document.querySelectorAll("th[data-columna]").forEach((encabezado) => {
            const boton = encabezado.querySelector(".tabla__orden");
            const activa = encabezado.dataset.columna === columna;
            boton.classList.toggle("tabla__orden--asc", activa && direccion === "asc");
            boton.classList.toggle("tabla__orden--desc", activa && direccion === "desc");
            if (activa) {
                encabezado.setAttribute("aria-sort", direccion === "asc" ? "ascending" : "descending");
            } else {
                encabezado.removeAttribute("aria-sort");
            }
        });
    },

    // Texto "Página X de Y" y botones activos o desactivados
    pintarPaginacion(pagina, totalPaginas) {
        document.querySelector("#infoPagina").textContent = `Página ${pagina} de ${totalPaginas}`;
        document.querySelector("#botonAnterior").disabled = pagina === 1;
        document.querySelector("#botonSiguiente").disabled = pagina === totalPaginas;
    },

    // Descarga un texto como archivo .csv
    descargarCsv(texto, nombreArchivo) {
        // "﻿" (BOM) hace que Excel reconozca las tildes
        const archivo = new Blob(["﻿", texto], { type: "text/csv;charset=utf-8" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(archivo);
        enlace.download = nombreArchivo;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
    },

    // ----- Barra lateral -----

    // Botones de categoría: recibe [{ nombre, cantidad }] y la categoría activa
    pintarCategorias(opciones, categoriaActual) {
        const lista = document.querySelector("#listaCategorias");
        lista.replaceChildren();

        opciones.forEach((opcion) => {
            const boton = this.crearElemento("button", "filtros__boton");
            boton.type = "button";
            boton.dataset.categoria = opcion.nombre;
            if (opcion.nombre === categoriaActual) {
                boton.classList.add("filtros__boton--activo");
                boton.setAttribute("aria-pressed", "true");
            } else {
                boton.setAttribute("aria-pressed", "false");
            }
            boton.append(
                this.crearElemento("span", null, opcion.nombre),
                this.crearElemento("span", "filtros__numero", opcion.cantidad)
            );

            const item = document.createElement("li");
            item.append(boton);
            lista.append(item);
        });
    },

    // Escribe el resumen que calculó el modelo
    pintarResumen(resumen) {
        document.querySelector("#resumenTotal").textContent = resumen.total;
        document.querySelector("#resumenUnidades").textContent = resumen.unidades;
        document.querySelector("#resumenAgotados").textContent = resumen.agotados;
        document.querySelector("#resumenValor").textContent = this.pesos.format(resumen.valor);
        document.querySelector("#resumenPromedio").textContent = this.pesos.format(resumen.promedio);
        document.querySelector("#resumenDolares").textContent =
            resumen.dolares === null ? "—" : this.dolares.format(resumen.dolares);
    },

    // ----- Formulario de carros (crear y editar) -----

    // Llena la lista desplegable de categorías
    llenarCategorias(categorias) {
        const select = document.querySelector("#categoria");
        const inicial = this.crearElemento("option", null, "Selecciona una categoría");
        inicial.value = "";
        select.append(inicial);

        categorias.forEach((nombre) => {
            const opcion = this.crearElemento("option", null, nombre);
            opcion.value = nombre;
            select.append(opcion);
        });
    },

    // Lee un campo numérico: si está vacío devuelve NaN para que el modelo lo rechace
    leerNumero(id) {
        const valor = document.querySelector(`#${id}`).value.trim();
        return valor === "" ? NaN : Number(valor);
    },

    // Devuelve los datos escritos, ya convertidos con Number()
    leerFormulario() {
        return {
            nombre: document.querySelector("#nombre").value,
            anio: this.leerNumero("anio"),
            categoria: document.querySelector("#categoria").value,
            precio: this.leerNumero("precio"),
            kilometraje: this.leerNumero("kilometraje"),
            unidades: this.leerNumero("unidades")
        };
    },

    // Pone los datos de un carro en el formulario para editarlo
    llenarFormulario(carro) {
        this.campos.forEach((campo) => {
            document.querySelector(`#${campo}`).value = carro[campo];
        });
        const formulario = document.querySelector("#formCarro");
        document.querySelector("#tituloFormulario").textContent = `Editando: ${carro.nombre} ${carro.anio}`;
        document.querySelector("#botonGuardar").textContent = "Guardar cambios";
        document.querySelector("#botonCancelar").hidden = false;
        formulario.classList.add("formulario--editando");
        formulario.scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelector("#nombre").focus({ preventScroll: true });
    },

    // Deja el formulario listo para publicar un carro nuevo
    limpiarFormulario() {
        const formulario = document.querySelector("#formCarro");
        formulario.reset();
        formulario.classList.remove("formulario--editando");
        document.querySelector("#tituloFormulario").textContent = "Publicar un carro";
        document.querySelector("#botonGuardar").textContent = "Publicar carro";
        document.querySelector("#botonCancelar").hidden = true;
        this.limpiarErrores();
    },

    // Quita las marcas rojas de los campos
    limpiarErrores() {
        this.campos.forEach((campo) => {
            document.querySelector(`#${campo}`).classList.remove("formulario__entrada--error");
        });
    },

    // Marca en rojo los campos con error y los lista todos
    mostrarErrores(errores) {
        this.limpiarErrores();
        const mensaje = document.querySelector("#mensajeCarro");
        mensaje.replaceChildren();
        mensaje.classList.remove("mensaje--exito");
        mensaje.classList.add("mensaje--error");

        const lista = this.crearElemento("ul", "mensaje__lista");
        errores.forEach((error) => {
            document.querySelector(`#${error.campo}`).classList.add("formulario__entrada--error");
            lista.append(this.crearElemento("li", null, error.mensaje));
        });
        mensaje.append(lista);
        document.querySelector(`#${errores[0].campo}`).focus();
    },

    // Mensaje verde (éxito) o rojo (error)
    mostrarMensaje(selector, texto, tipo) {
        const mensaje = document.querySelector(selector);
        mensaje.textContent = texto;
        mensaje.classList.remove("mensaje--error", "mensaje--exito");
        mensaje.classList.add(tipo === "error" ? "mensaje--error" : "mensaje--exito");
    },

    // ----- Sección "Dólar hoy" (datos de la API) -----

    // Indicador de carga mientras llega la respuesta
    mostrarCargaTrm() {
        const estado = document.querySelector("#estadoTrm");
        estado.textContent = "Consultando la TRM del día…";
        estado.classList.remove("trm__estado--error");
        estado.classList.add("trm__estado--cargando");
        document.querySelector("#botonTrm").disabled = true;
    },

    // Mensaje amable si la API falla o no hay internet
    mostrarErrorTrm(mensaje) {
        const estado = document.querySelector("#estadoTrm");
        estado.textContent = mensaje;
        estado.classList.remove("trm__estado--cargando");
        estado.classList.add("trm__estado--error");
        document.querySelector("#panelTrm").hidden = true;
        document.querySelector("#botonTrm").disabled = false;
    },

    // Muestra la TRM vigente, sus estadísticas y el historial
    pintarTrm(trm, historial, estadisticas) {
        const estado = document.querySelector("#estadoTrm");
        estado.textContent = "";
        estado.classList.remove("trm__estado--cargando", "trm__estado--error");

        document.querySelector("#valorTrm").textContent = `1 USD = ${this.pesosConDecimales.format(trm.valor)}`;
        document.querySelector("#fechaTrm").textContent = `Vigente desde el ${this.formatearFecha(trm.fecha)}`;
        document.querySelector("#promedioTrm").textContent = this.pesosConDecimales.format(estadisticas.promedio);
        document.querySelector("#maximoTrm").textContent = this.pesosConDecimales.format(estadisticas.maximo);
        document.querySelector("#minimoTrm").textContent = this.pesosConDecimales.format(estadisticas.minimo);

        const cuerpo = document.querySelector("#historialTrm");
        cuerpo.replaceChildren();
        historial.forEach((registro) => {
            const fila = document.createElement("tr");
            const celdaCambio = this.crearCelda("—", true);
            if (registro.cambio !== null) {
                const signo = registro.cambio > 0 ? "+" : "";
                celdaCambio.textContent = `${signo}${registro.cambio.toFixed(2)}`;
                if (registro.cambio > 0) {
                    celdaCambio.classList.add("trm__cambio--sube");
                } else if (registro.cambio < 0) {
                    celdaCambio.classList.add("trm__cambio--baja");
                }
            }
            fila.append(
                this.crearCelda(registro.fecha, false),
                this.crearCelda(this.pesosConDecimales.format(registro.valor), true),
                celdaCambio
            );
            cuerpo.append(fila);
        });

        document.querySelector("#panelTrm").hidden = false;
        document.querySelector("#botonTrm").disabled = false;
    },

    // ----- Formulario de contacto -----

    leerNombreContacto() {
        return document.querySelector("#contactoNombre").value.trim();
    },

    limpiarContacto() {
        document.querySelector("#formContacto").reset();
    }
};
