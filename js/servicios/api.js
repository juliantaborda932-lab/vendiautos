/* =====================================================================
   api.js · CAPA DE SERVICIOS
   Consume la API REST pública de la TRM (Tasa Representativa del
   Mercado) en datos.gov.co. Solo pide los datos y los transforma:
   no toca el DOM ni guarda nada.
   La API no pide clave, así que no hay nada secreto en el repositorio.
   ===================================================================== */

"use strict";

// URL base + endpoint del conjunto de datos de la TRM (identificador 32sa-8pi3)
const URL_TRM = "https://www.datos.gov.co/resource/32sa-8pi3.json";

// Cuántos registros pedir y cuánto esperar antes de rendirse
const REGISTROS_TRM = 10;
const ESPERA_MAXIMA_MS = 8000;

const Api = {
    // Fecha de hoy en Colombia con formato AAAA-MM-DD
    obtenerFechaHoy() {
        return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    },

    // GET a la API. Devuelve [{ fecha, valor }] del más reciente al más antiguo.
    // Si algo falla, lanza un Error con un mensaje amable para el usuario
    async obtenerTrm() {
        // Parámetros SoQL: los más recientes primero ($order) y solo 10 ($limit).
        // %20 es el espacio escrito dentro de una URL
        const url = `${URL_TRM}?$order=vigenciadesde%20DESC&$limit=${REGISTROS_TRM}`;

        try {
            // await espera la respuesta sin congelar la página.
            // AbortSignal.timeout cancela la petición si tarda demasiado
            const respuesta = await fetch(url, {
                signal: AbortSignal.timeout(ESPERA_MAXIMA_MS)
            });

            // fetch solo falla sin red; un 404 o 500 llega como respuesta normal,
            // por eso hay que revisar response.ok
            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();
            const hoy = this.obtenerFechaHoy();

            // Transformación con métodos de arreglos:
            // map  → deja solo fecha y valor (el valor llega como texto)
            // filter → quita valores inválidos y la TRM de días futuros
            // sort → del más reciente al más antiguo
            const historial = datos
                .map((registro) => ({
                    fecha: registro.vigenciadesde.slice(0, 10),
                    valor: Number(registro.valor)
                }))
                .filter((registro) => registro.valor > 0 && registro.fecha <= hoy)
                .sort((a, b) => b.fecha.localeCompare(a.fecha));

            if (historial.length === 0) {
                throw new Error("Sin datos");
            }
            return historial;
        } catch (error) {
            // Cambia el error técnico por un mensaje que entienda el usuario
            if (error.name === "TimeoutError") {
                throw new Error("La consulta del dólar tardó demasiado. Intenta de nuevo en un momento.");
            }
            if (error.name === "TypeError") {
                throw new Error("No pudimos conectarnos para consultar el dólar. Revisa tu conexión a internet.");
            }
            throw new Error("El servicio del dólar no está disponible en este momento. Los precios se muestran solo en pesos.");
        }
    }
};
