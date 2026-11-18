/* =====================================================================
   modelo.js · CAPA DE DATOS Y NEGOCIO
   Guarda los carros, aplica las reglas de negocio, lee y escribe en
   localStorage y hace los cálculos (filtros, orden, páginas, resumen,
   CSV y precios en dólares).
   Este archivo NO toca el DOM.
   ===================================================================== */

"use strict";

// Clave propia para guardar los datos en el navegador
const CLAVE = "vendiautos-taborda";

// Reglas fijas del negocio
const ANIO_MINIMO = 1990;
const ANIO_MAXIMO = new Date().getFullYear() + 1;
const PRECIO_MINIMO = 5000000;
const STOCK_MAXIMO = 5;
const IMAGEN_POR_DEFECTO = "img/generico.svg";

// Filas por página de la tabla
const TAMANO_PAGINA = 5;

// Categorías permitidas
const CATEGORIAS = ["Sedán", "SUV", "Pickup", "Deportivo", "Eléctrico"];

// Datos de ejemplo: se usan la primera vez o al restaurar
const CARROS_INICIALES = [
    { id: 1, nombre: "Mazda 3", anio: 2024, categoria: "Sedán", precio: 92900000, kilometraje: 8500, unidades: 2, imagen: "img/mazda.webp" },
    { id: 2, nombre: "Tesla Model Y", anio: 2025, categoria: "Eléctrico", precio: 185000000, kilometraje: 4000, unidades: 4, imagen: "img/tesla.webp" },
    { id: 3, nombre: "Toyota Corolla Cross", anio: 2025, categoria: "SUV", precio: 132500000, kilometraje: 6800, unidades: 1, imagen: "img/toyota.jpg" },
    { id: 4, nombre: "Ford Mustang EcoBoost", anio: 2019, categoria: "Deportivo", precio: 145000000, kilometraje: 38000, unidades: 0, imagen: "img/mustang.webp" },
    { id: 5, nombre: "Toyota Hilux", anio: 2022, categoria: "Pickup", precio: 168000000, kilometraje: 45000, unidades: 3, imagen: "img/hilux.webp" },
    { id: 6, nombre: "Renault Logan", anio: 2021, categoria: "Sedán", precio: 48500000, kilometraje: 52000, unidades: 5, imagen: "img/logan.webp" }
];

const Modelo = {
    carros: [],

    // Último valor de la TRM y su historial (los llena el controlador con la API)
    trm: null,
    historialTrm: [],

    // ----- Persistencia en localStorage -----

    // Lee lo guardado. Si no hay nada (o está dañado) usa los datos de ejemplo
    cargar() {
        const guardado = localStorage.getItem(CLAVE);
        try {
            this.carros = guardado ? JSON.parse(guardado) : this.copiarIniciales();
        } catch {
            this.carros = this.copiarIniciales();
        }
    },

    // Copia los datos de ejemplo para no modificar el arreglo original
    copiarIniciales() {
        return CARROS_INICIALES.map((carro) => ({ ...carro }));
    },

    // localStorage solo guarda texto: el arreglo se convierte a JSON
    guardar() {
        localStorage.setItem(CLAVE, JSON.stringify(this.carros));
    },

    // Borra la clave para volver a los datos de ejemplo
    restaurar() {
        localStorage.removeItem(CLAVE);
        this.cargar();
    },

    // ----- Reglas de negocio -----

    // Devuelve TODOS los errores juntos (lista vacía si todo está bien).
    // Cada error dice qué campo falló, para que la vista lo marque
    validar({ id, nombre, anio, categoria, precio, kilometraje, unidades }) {
        const errores = [];
        const nombreLimpio = nombre.trim();

        // 1. Nombre obligatorio y con sentido
        if (nombreLimpio.length < 3) {
            errores.push({ campo: "nombre", mensaje: "La marca y el modelo deben tener al menos 3 letras." });
        }

        // 2. Año dentro del rango que recibe el concesionario
        if (!Number.isInteger(anio) || anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
            errores.push({ campo: "anio", mensaje: `Solo recibimos carros modelo ${ANIO_MINIMO} a ${ANIO_MAXIMO}.` });
        }

        // 3. Categoría de la lista
        if (!CATEGORIAS.includes(categoria)) {
            errores.push({ campo: "categoria", mensaje: "Selecciona una categoría." });
        }

        // 4. Precio: número y mínimo de publicación
        if (!(precio > 0)) {
            errores.push({ campo: "precio", mensaje: "El precio debe ser un número mayor que cero." });
        } else if (precio < PRECIO_MINIMO) {
            errores.push({ campo: "precio", mensaje: "El precio mínimo para publicar un carro es $ 5.000.000." });
        }

        // 5. Kilometraje: entero de 0 en adelante
        if (!Number.isInteger(kilometraje) || kilometraje < 0) {
            errores.push({ campo: "kilometraje", mensaje: "El kilometraje debe ser un número entero de 0 en adelante." });
        }

        // 6. Unidades: entero entre 0 y el cupo del patio
        if (!Number.isInteger(unidades) || unidades < 0 || unidades > STOCK_MAXIMO) {
            errores.push({ campo: "unidades", mensaje: `Las unidades deben ser un entero de 0 a ${STOCK_MAXIMO}.` });
        }

        // 7. Sin duplicados: el mismo carro y año no se puede repetir.
        // carro.id !== id deja editar un carro sin que choque consigo mismo
        const repetido = this.carros.some(
            (carro) => carro.nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
                carro.anio === anio &&
                carro.id !== id
        );
        if (repetido) {
            errores.push({ campo: "nombre", mensaje: `Ya hay un ${nombreLimpio} ${anio} en el catálogo.` });
        }

        return errores;
    },

    // ----- CRUD -----

    // CREATE: el id nuevo es el mayor id + 1 (calculado con reduce)
    agregar(datos) {
        const nuevoId = this.carros.reduce((maximo, carro) => Math.max(maximo, carro.id), 0) + 1;
        this.carros.push({ id: nuevoId, ...datos, nombre: datos.nombre.trim(), imagen: IMAGEN_POR_DEFECTO });
        this.guardar();
    },

    // READ: busca un carro por su id con find
    buscarPorId(id) {
        return this.carros.find((carro) => carro.id === id);
    },

    // UPDATE: map devuelve un arreglo nuevo con el carro editado (conserva su imagen)
    actualizar(id, datos) {
        this.carros = this.carros.map((carro) =>
            carro.id === id ? { ...carro, ...datos, nombre: datos.nombre.trim() } : carro
        );
        this.guardar();
    },

    // DELETE: filter deja todos menos el eliminado
    eliminar(id) {
        this.carros = this.carros.filter((carro) => carro.id !== id);
        this.guardar();
    },

    // ----- Consultas: filtros combinados, orden y páginas -----

    // Dice si un carro cumple el filtro de disponibilidad
    cumpleEstado(carro, estado) {
        if (estado === "disponibles") {
            return carro.unidades > 0;
        }
        if (estado === "ultimas") {
            return carro.unidades === 1 || carro.unidades === 2;
        }
        if (estado === "agotados") {
            return carro.unidades === 0;
        }
        return true;
    },

    // Combina los tres filtros: texto (sin distinguir mayúsculas), categoría y estado
    filtrar({ texto, categoria, estado }) {
        const busqueda = texto.trim().toLowerCase();
        return this.carros.filter((carro) => {
            const coincideTexto = `${carro.nombre} ${carro.anio}`.toLowerCase().includes(busqueda);
            const coincideCategoria = categoria === "Todas" || carro.categoria === categoria;
            return coincideTexto && coincideCategoria && this.cumpleEstado(carro, estado);
        });
    },

    // Ordena por una columna. sort cambia el arreglo original,
    // por eso primero se copia con [...lista]
    ordenar(lista, { columna, direccion }) {
        const signo = direccion === "asc" ? 1 : -1;
        return [...lista].sort((a, b) => {
            const valorA = a[columna];
            const valorB = b[columna];
            if (typeof valorA === "string") {
                return valorA.localeCompare(valorB, "es") * signo;
            }
            return (valorA - valorB) * signo;
        });
    },

    // Cuántas páginas hay (mínimo 1 para que nunca diga "página 1 de 0")
    contarPaginas(total) {
        return Math.max(1, Math.ceil(total / TAMANO_PAGINA));
    },

    // Devuelve solo los carros de la página pedida
    paginar(lista, pagina) {
        const inicio = (pagina - 1) * TAMANO_PAGINA;
        return lista.slice(inicio, inicio + TAMANO_PAGINA);
    },

    // Cuántos carros hay en cada categoría (para los botones de filtro)
    contarPorCategoria(categoria) {
        if (categoria === "Todas") {
            return this.carros.length;
        }
        return this.carros.filter((carro) => carro.categoria === categoria).length;
    },

    // ----- Dólares con la TRM de la API -----

    // Guarda la TRM vigente y el historial que trajo el servicio
    guardarTrm(historial) {
        this.historialTrm = historial;
        this.trm = historial[0];
    },

    // Si la API falla se borra la TRM para no mostrar dólares viejos
    limpiarTrm() {
        this.trm = null;
        this.historialTrm = [];
    },

    // Convierte pesos a dólares. Si no hay TRM devuelve null
    convertirADolares(pesos) {
        return this.trm ? pesos / this.trm.valor : null;
    },

    // Historial con el cambio frente al día anterior (map con el índice)
    calcularCambiosTrm() {
        return this.historialTrm.map((registro, indice, lista) => {
            const anterior = lista[indice + 1];
            return { ...registro, cambio: anterior ? registro.valor - anterior.valor : null };
        });
    },

    // Estadísticas del historial con reduce
    calcularEstadisticasTrm() {
        const valores = this.historialTrm.map((registro) => registro.valor);
        const suma = valores.reduce((total, valor) => total + valor, 0);
        return {
            promedio: suma / valores.length,
            maximo: valores.reduce((mayor, valor) => Math.max(mayor, valor), valores[0]),
            minimo: valores.reduce((menor, valor) => Math.min(menor, valor), valores[0])
        };
    },

    // ----- Resumen de la barra lateral -----

    calcularResumen() {
        const valor = this.carros.reduce((suma, carro) => suma + carro.precio * carro.unidades, 0);
        const sumaPrecios = this.carros.reduce((suma, carro) => suma + carro.precio, 0);
        return {
            total: this.carros.length,
            agotados: this.carros.filter((carro) => carro.unidades === 0).length,
            unidades: this.carros.reduce((suma, carro) => suma + carro.unidades, 0),
            valor: valor,
            promedio: this.carros.length > 0 ? sumaPrecios / this.carros.length : 0,
            dolares: this.convertirADolares(valor)
        };
    },

    // ----- Exportar a CSV -----

    // Encierra cada valor entre comillas y duplica las comillas internas
    escaparCsv(valor) {
        return `"${String(valor).replaceAll("\"", "\"\"")}"`;
    },

    // Arma el texto del CSV con map y join. Usa ";" porque Excel en
    // español (Colombia) separa columnas con punto y coma
    generarCsv(lista) {
        const encabezado = ["Id", "Carro", "Año", "Categoría", "Precio COP", "Precio USD", "Kilometraje", "Unidades"];
        const filas = lista.map((carro) => {
            const dolares = this.convertirADolares(carro.precio);
            return [
                carro.id,
                carro.nombre,
                carro.anio,
                carro.categoria,
                carro.precio,
                dolares === null ? "" : Math.round(dolares),
                carro.kilometraje,
                carro.unidades
            ];
        });
        return [encabezado, ...filas]
            .map((fila) => fila.map((valor) => this.escaparCsv(valor)).join(";"))
            .join("\r\n");
    }
};
