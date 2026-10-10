# Calculadora de Matrices

Aplicación web en JavaScript puro (sin frameworks, sin servidor, sin instalar nada) que:

1. **Resuelve sistemas de ecuaciones lineales** m×n con el método de **Gauss-Jordan**.
2. **Calcula la matriz inversa** de una matriz cuadrada n×n, previo cálculo del **determinante**.

Muestra **cada paso** con su notación (`F1 ↔ F2`, `F2 ← (1/3)·F2`, `F3 ← F3 − 2·F1`), una explicación en español y la matriz resultante. Las filas modificadas y el pivote aparecen resaltados. Todos los cálculos usan **fracciones exactas** (BigInt + MCD), no decimales, así que los resultados coinciden con los de un cálculo hecho a mano.

## Archivos

| Archivo       | Contenido                                                                   |
|---------------|-----------------------------------------------------------------------------|
| `index.html`  | Estructura de la página (dos pestañas).                                     |
| `estilos.css` | Estilos adaptables a celular, con modo oscuro automático.                   |
| `matriz.js`   | Cálculo: clase `Fraccion`, Gauss-Jordan, determinante, inversa (sin interfaz). |
| `ui.js`       | Interfaz: cuadrículas de entrada, validación, pestañas y presentación de pasos. |
| `README.md`   | Este documento.                                                             |

## Cómo abrirla

1. Descomprime la carpeta (si viene en ZIP).
2. Haz doble clic en **`index.html`**. Se abre en el navegador (Chrome, Edge, Firefox o Safari).
3. No necesita internet ni instalar nada.

## Cómo se usa

- **Sistemas de ecuaciones:** elige el número de ecuaciones (filas) y de incógnitas (columnas). Escribe los coeficientes y, después de la línea azul, el término independiente `b`. Pulsa **Resolver**.
- **Matriz inversa:** elige el tamaño n y escribe la matriz A. Pulsa **Resolver**.
- **Ejemplo** rellena datos de muestra; cada clic carga un ejemplo distinto.
- **Limpiar** borra los datos y los resultados.
- Valores aceptados: enteros (`4`, `-2`), decimales (`0.5`, `-1,25`) y fracciones (`1/3`, `-7/2`). Las celdas vacías o con valores no válidos se marcan en rojo y aparece un mensaje.

## Qué muestra

**Módulo 1 – Sistemas (Gauss-Jordan)**
1. La matriz aumentada inicial `[A | b]`.
2. Cada operación de fila, con su explicación y la matriz resultante. Las operaciones inútiles (multiplicar por 1, restar 0) se omiten.
3. La forma escalonada reducida, con rango(A) y rango([A | b]).
4. La conclusión: **solución única** (valores de x₁, x₂, …), **infinitas soluciones** (variables libres y las demás en función de ellas) o **sin solución** (la fila `0 = k`, con k ≠ 0).

Funciona también con sistemas no cuadrados (m ≠ n).

**Módulo 2 – Matriz inversa**
1. El determinante por eliminación hasta forma triangular. Se registran los intercambios (cada uno cambia el signo) y se usa `det(A) = (−1)^s · producto de la diagonal`.
2. Si `det(A) = 0`: mensaje de que la matriz **no es invertible**, y no se calcula la inversa.
3. Si `det(A) ≠ 0`: Gauss-Jordan sobre `[A | I]` paso a paso hasta `[I | A⁻¹]`.
4. La matriz `A⁻¹` y la verificación `A · A⁻¹ = I`.

## Ejemplos de prueba

| Caso | Datos | Resultado esperado |
|------|-------|--------------------|
| Solución única | `2x + y − z = 8`, `−3x − y + 2z = −11`, `−2x + y + 2z = −3` | x₁ = 2, x₂ = 3, x₃ = −1 |
| Infinitas soluciones | `x + 2y − z = 3`, `2x + 4y − 2z = 6`, `x − y + z = 0` | x₃ libre; x₁ = 1 − (1/3)x₃, x₂ = 1 + (2/3)x₃ |
| Sin solución | `x + y + z = 2`, `2x + 2y + 2z = 5`, `x − y = 0` | fila 0 = 1 → inconsistente |
| No cuadrado (2×3) | `x + y + z = 6`, `2x − y + 3z = 9` | x₃ libre; x₁ = 5 − (4/3)x₃, x₂ = 1 + (1/3)x₃ |
| Inversa entera | `[[1,2,3],[0,1,4],[5,6,0]]` | det = 1; A⁻¹ = `[[−24,18,5],[20,−15,−4],[−5,4,1]]` |
| Inversa con fracciones | `[[2,−1,0],[−1,2,−1],[0,−1,2]]` | det = 4; A⁻¹ = `[[3/4,1/2,1/4],[1/2,1,1/2],[1/4,1/2,3/4]]` |
| Con intercambio | `[[0,1,2],[1,0,3],[4,−3,8]]` | det = −2 (un intercambio) |
| Singular | `[[1,2,3],[4,5,6],[7,8,9]]` | det = 0 → no invertible |

Todos estos ejemplos se cargan con el botón **Ejemplo**.

### Probar el cálculo con Node (opcional)

`matriz.js` también funciona en Node.js sin dependencias:

```js
const M = require('./matriz.js');
const r = M.resolverSistema([['2','1','-1','8'], ['-3','-1','2','-11'], ['-2','1','2','-3']]);
console.log(r.tipo, r.solucion.map(String)); // unica [ '2', '3', '-1' ]
console.log(M.calcularInversa([['1','2'],['3','4']]).inversa.map(f => f.map(String)));
```

## Cómo comprimir en ZIP para Classroom

**Windows**
1. Abre la carpeta `actividad-matrices` en el Explorador de archivos.
2. Selecciona los 5 archivos (`index.html`, `estilos.css`, `matriz.js`, `ui.js`, `README.md`).
3. Clic derecho → **Enviar a → Carpeta comprimida (en zip)** (en Windows 11: **Comprimir en archivo ZIP**).
4. Cambia el nombre, por ejemplo `actividad-matrices-ApellidoNombre.zip`.

**macOS:** selecciona los archivos → clic derecho → **Comprimir**.

**Linux / terminal:** `zip actividad-matrices.zip index.html estilos.css matriz.js ui.js README.md`

**Subir a Google Classroom:** abre la tarea → **Tu trabajo** → **Añadir o crear** → **Archivo** → elige el `.zip` → **Entregar**.

> Para comprobar el ZIP, descomprímelo en otra carpeta y abre `index.html`: debe funcionar igual.
