# Vendiautos

Catálogo web de compra y venta de carros usados. Proyecto final de **Herramientas de Programación III (ET0056)**, I.U. Pascual Bravo, periodo 2026-2. Docente: Luis Fernando Londoño López.

- **Integrante:** Julián Taborda Bedoya
- **Aplicación publicada:** https://juliantaborda932-lab.github.io/vendiautos/
- **Repositorio:** https://github.com/juliantaborda932-lab/vendiautos

## Descripción del dominio

Vendiautos es un concesionario ficticio de carros usados en Medellín. La aplicación permite:

- **CRUD de carros** (la entidad principal): publicar, consultar, editar y eliminar carros con nombre, año, categoría, precio, kilometraje y unidades en el patio. Los datos se guardan en `localStorage` y sobreviven a la recarga.
- **Catálogo de tarjetas y tabla de inventario** con búsqueda, filtros combinados (texto, categoría y disponibilidad), ordenamiento por columna, paginación y exportación a CSV.
- **Precio en dólares**: consume la API REST de la TRM (Tasa Representativa del Mercado) de datos.gov.co para mostrar cada precio y el valor del inventario en dólares, con el historial reciente de la tasa.
- **Resumen** en la barra lateral: total de carros, unidades, agotados, valor del inventario, precio promedio e inventario en dólares.
- **Formulario de contacto** validado por el navegador.

## Cómo ejecutarlo

1. Abrir la carpeta del proyecto en **VS Code**.
2. Instalar la extensión **Live Server** (Ritwick Dey) si no está instalada.
3. Clic derecho sobre `index.html` → **Open with Live Server**.
4. Se abre `http://127.0.0.1:5500/index.html`. Se necesita internet solo para la sección del dólar; el resto funciona sin conexión.

No usa frameworks ni librerías: solo HTML5, CSS3 y JavaScript.

## Estructura del proyecto

```
vendiautos/
├── index.html
├── README.md
├── css/
│   └── estilos.css                 estilos con BEM
├── js/
│   ├── modelo/
│   │   └── modelo.js               datos, reglas, localStorage y cálculos
│   ├── vista/
│   │   └── vista.js                todo lo que toca el DOM
│   ├── controlador/
│   │   └── controlador.js          eventos y flujo
│   ├── servicios/
│   │   └── api.js                  consumo de la API REST de la TRM
│   └── app.js                      punto de arranque (DOMContentLoaded)
└── img/                            fotos de los carros
```

Los scripts se cargan al final de `index.html` en este orden: modelo, servicios, vista, controlador y app. El modelo no toca el DOM y la vista no guarda datos.

## API consumida: TRM de datos.gov.co

| Dato | Valor |
|---|---|
| Proveedor | Superintendencia Financiera de Colombia, publicado en datos.gov.co (plataforma Socrata) |
| URL base | `https://www.datos.gov.co` |
| Endpoint | `/resource/32sa-8pi3.json` |
| Método HTTP | `GET` |
| Parámetros | `$order=vigenciadesde DESC` (los más recientes primero) y `$limit=10` (solo 10 registros) |
| Autenticación | No necesita clave. No hay ningún dato secreto en el repositorio |
| Archivo | `js/servicios/api.js` |

URL completa que se pide:

```
https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=10
```

Ejemplo de respuesta (formato real de la API; los valores son ilustrativos):

```json
[
  {
    "valor": "3712.45",
    "unidad": "COP",
    "vigenciadesde": "2026-11-09T00:00:00.000",
    "vigenciahasta": "2026-11-09T00:00:00.000"
  },
  {
    "valor": "3698.2",
    "unidad": "COP",
    "vigenciadesde": "2026-11-08T00:00:00.000",
    "vigenciahasta": "2026-11-08T00:00:00.000"
  }
]
```

Qué hace la aplicación con la respuesta:

1. `fetch` dentro de la función `async obtenerTrm()`, con `await` y un tiempo máximo de 8 segundos.
2. Revisa `response.ok`: un error 404 o 500 no hace fallar a `fetch`, por eso se comprueba aparte.
3. Transforma los datos con métodos de arreglos: `map` (deja fecha y valor como número), `filter` (quita valores inválidos y la TRM de días futuros) y `sort` (de la más reciente a la más antigua).
4. `try/catch` cambia cualquier falla (sin internet, tiempo agotado, error del servidor) por un mensaje amable que se muestra en la página.
5. Mientras llega la respuesta se ve el indicador de carga "Consultando la TRM del día…".
6. Con la TRM, el modelo calcula el precio en dólares de cada carro, el inventario en dólares, el promedio, el máximo y el mínimo (con `reduce`) y el cambio diario (con `map`).

Si la API falla, la página sigue funcionando y los precios se muestran solo en pesos.

## Fuentes de documentación consultadas

| Página | Para qué sirvió |
|---|---|
| [MDN · Usando Fetch](https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch) | Hacer la petición `GET` a la API y leer el JSON con `response.json()` |
| [MDN · Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok) | Entender por qué hay que revisar `ok`: `fetch` no falla con un 404 o un 500 |
| [MDN · async function](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Statements/async_function) | Escribir `obtenerTrm()` y `cargarTrm()` con `async/await` y `try/catch` |
| [MDN · AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) | Cancelar la petición si tarda más de 8 segundos |
| [MDN · Window.localStorage](https://developer.mozilla.org/es/docs/Web/API/Window/localStorage) | Guardar y leer los carros con `setItem`, `getItem` y `removeItem` |
| [MDN · Node.textContent](https://developer.mozilla.org/es/docs/Web/API/Node/textContent) | Pintar los datos del usuario sin ejecutar HTML (en lugar de `innerHTML`) |
| [MDN · Array.prototype.reduce()](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce) | Totales del resumen, id nuevo y estadísticas de la TRM |
| [MDN · Array.prototype.sort()](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) | Ordenar la tabla por columna (copiando antes el arreglo, porque `sort` lo modifica) |
| [MDN · URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) | Descargar el CSV generado en el navegador |
| [MDN · Intl.NumberFormat](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) | Mostrar pesos y dólares con el formato de Colombia |
| [Socrata · API Endpoints](https://dev.socrata.com/docs/endpoints.html) | Armar la URL del conjunto de datos en datos.gov.co |
| [Socrata · $order](https://dev.socrata.com/docs/queries/order.html) y [$limit](https://dev.socrata.com/docs/queries/limit.html) | Pedir solo los 10 registros más recientes |
| [datos.gov.co · TRM](https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3) | Ver los campos del conjunto de datos (`valor`, `unidad`, `vigenciadesde`, `vigenciahasta`) |

## Normas de codificación

| Norma | Cómo se aplica |
|---|---|
| Nombres en **camelCase** | Variables y funciones: `idEditando`, `calcularResumen`. Constantes fijas en MAYÚSCULAS: `STOCK_MAXIMO` |
| Funciones con **verbo** | `pintarTabla`, `validar`, `obtenerTrm`, `generarCsv` |
| Clases CSS con **BEM** | `bloque__elemento--modificador`: `.tarjeta`, `.tarjeta__precio`, `.tarjeta--agotada` |
| **Sangría** de 4 espacios | En HTML, CSS y JavaScript |
| **Comentarios en español** | Cortos, al inicio de cada archivo y de cada bloque, diciendo qué hace |
| Comparaciones con `===` y `!==` | Nunca `==` |
| `const` por defecto, `let` solo si cambia | Nunca `var` |
| Punto y coma al final | En todas las instrucciones |
| Comillas dobles | `"texto"`; plantillas `` `${}` `` cuando hay variables |
| Datos del usuario con `textContent` | Nunca `innerHTML` |
| Estilos con clases | `classList`, nunca `element.style` |
| Sin código muerto | Sin funciones sin usar ni `console.log` de prueba |

## Créditos

- **Fotografías de los carros** (`img/mazda.webp`, `img/tesla.webp`, `img/toyota.jpg`, `img/mustang.webp`, `img/hilux.webp`, `img/logan.webp`): tomadas de anuncios públicos de venta de carros usados en internet (principalmente TuCarro, tucarro.com.co), usadas solo con fines académicos.
- **`img/generico.svg`**: dibujo hecho para este proyecto.
- **Datos de la TRM**: Superintendencia Financiera de Colombia, vía datos.gov.co.
- **Cifras del mercado automotor**: Andemos, con base en el RUNT (2026).
- No se usaron librerías externas.
