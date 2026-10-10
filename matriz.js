(function (raiz) {
  'use strict';

  function mcd(a, b) {
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b !== 0n) { const t = a % b; a = b; b = t; }
    return a;
  }

  class Fraccion {
    constructor(num, den = 1n) {
      num = BigInt(num);
      den = BigInt(den);
      if (den === 0n) throw new Error('División entre cero');
      if (den < 0n) { num = -num; den = -den; }
      const g = mcd(num, den);
      this.n = num / g;
      this.d = den / g;
    }

    static desdeTexto(texto) {
      const t = String(texto).trim().replace(/\s+/g, '').replace(/−/g, '-').replace(',', '.');
      if (t === '') return null;
      let m = /^([+-]?\d+)\/([+-]?\d+)$/.exec(t);
      if (m) {
        const den = BigInt(m[2]);
        return den === 0n ? null : new Fraccion(BigInt(m[1]), den);
      }
      m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(t);
      if (!m || (m[2] === '' && !m[3])) return null;
      const dec = m[3] || '';
      let num = BigInt((m[2] || '0') + dec);
      if (m[1] === '-') num = -num;
      return new Fraccion(num, 10n ** BigInt(dec.length));
    }

    sumar(o) { return new Fraccion(this.n * o.d + o.n * this.d, this.d * o.d); }
    restar(o) { return new Fraccion(this.n * o.d - o.n * this.d, this.d * o.d); }
    multiplicar(o) { return new Fraccion(this.n * o.n, this.d * o.d); }
    dividir(o) { return new Fraccion(this.n * o.d, this.d * o.n); }
    negar() { return new Fraccion(-this.n, this.d); }
    inversa() { return new Fraccion(this.d, this.n); }
    abs() { return new Fraccion(this.n < 0n ? -this.n : this.n, this.d); }

    esCero() { return this.n === 0n; }
    esUno() { return this.n === 1n && this.d === 1n; }
    esNegativa() { return this.n < 0n; }
    esEntera() { return this.d === 1n; }
    igual(o) { return this.n === o.n && this.d === o.d; }

    texto() { return this.toString().replace('-', '−'); }
    toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  }

  const CERO = new Fraccion(0n);
  const UNO = new Fraccion(1n);

  function copiar(M) { return M.map(f => f.slice()); }

  function aFracciones(M) {
    return M.map(f => f.map(x => (x instanceof Fraccion ? x : Fraccion.desdeTexto(x))));
  }

  function identidad(n) {
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? UNO : CERO)));
  }

  function multiplicarMatrices(A, B) {
    return A.map(fila => B[0].map((_, j) =>
      fila.reduce((s, a, k) => s.sumar(a.multiplicar(B[k][j])), CERO)));
  }

  function esIdentidad(M) {
    return M.every((f, i) => f.every((x, j) => (i === j ? x.esUno() : x.esCero())));
  }

  function factorTexto(k) {
    return k.esEntera() && !k.esNegativa() ? k.texto() : `(${k.texto()})`;
  }

  function coefTexto(k) {
    if (k.esUno()) return '';
    return (k.esEntera() ? k.texto() : `(${k.texto()})`) + '·';
  }

  function crearPaso(tipo, notacion, explicacion, M, filas, pivote) {
    return { tipo, notacion, explicacion, matriz: copiar(M), filas, pivote };
  }

  function opIntercambio(M, a, b, col) {
    [M[a], M[b]] = [M[b], M[a]];
    return crearPaso('intercambio', `F${a + 1} ↔ F${b + 1}`,
      `En la columna ${col + 1} la fila ${a + 1} tenía un 0 en la posición del pivote, ` +
      `así que se intercambia con la fila ${b + 1}, que tiene un valor distinto de cero (${M[a][col].texto()}).`,
      M, [a, b], { fila: a, col });
  }

  function opEscalado(M, fila, col) {
    const piv = M[fila][col];
    const k = piv.inversa();
    M[fila] = M[fila].map(x => x.multiplicar(k));
    return crearPaso('escalado', `F${fila + 1} ← ${factorTexto(k)}·F${fila + 1}`,
      `Se multiplica la fila ${fila + 1} por ${k.texto()} (el inverso del pivote ${piv.texto()}) para que el pivote valga 1.`,
      M, [fila], { fila, col });
  }

  function opEliminacion(M, r, p, col, extra = '') {
    const factor = M[r][col].dividir(M[p][col]);
    M[r] = M[r].map((x, j) => x.restar(factor.multiplicar(M[p][j])));
    const a = factor.abs();
    const signo = factor.esNegativa() ? '+' : '−';
    const verbo = factor.esNegativa() ? 'suma' : 'resta';
    const veces = a.esUno() ? 'la fila' : `${a.texto()} veces la fila`;
    return crearPaso('eliminacion', `F${r + 1} ← F${r + 1} ${signo} ${coefTexto(a)}F${p + 1}`,
      `Se ${verbo} ${veces} ${p + 1} a la fila ${r + 1} para hacer 0 el elemento de la columna ${col + 1}.${extra}`,
      M, [r], { fila: p, col });
  }

  function gaussJordan(matriz, columnasPivote) {
    const M = copiar(matriz);
    const m = M.length;
    const pasos = [];
    const pivotes = [];
    let fila = 0;

    for (let c = 0; c < columnasPivote && fila < m; c++) {
      let p = fila;
      while (p < m && M[p][c].esCero()) p++;
      if (p === m) continue;

      if (p !== fila) pasos.push(opIntercambio(M, fila, p, c));

      if (!M[fila][c].esUno()) pasos.push(opEscalado(M, fila, c));

      for (let r = 0; r < m; r++) {
        if (r !== fila && !M[r][c].esCero()) pasos.push(opEliminacion(M, r, fila, c));
      }

      pivotes.push({ fila, col: c });
      fila++;
    }
    return { pasos, matriz: M, pivotes };
  }

  function resolverSistema(aumentada) {
    const inicial = aFracciones(aumentada);
    const n = inicial[0].length - 1;
    const { pasos, matriz: R, pivotes } = gaussJordan(inicial, n);
    const rangoA = pivotes.length;
    const base = { inicial, pasos, final: R, pivotes, numIncognitas: n, rangoA };

    for (let i = 0; i < R.length; i++) {
      if (R[i].slice(0, n).every(x => x.esCero()) && !R[i][n].esCero()) {
        return { ...base, tipo: 'sinSolucion', rangoAumentada: rangoA + 1, filaInconsistente: i, valor: R[i][n] };
      }
    }

    if (rangoA === n) {
      const solucion = new Array(n);
      pivotes.forEach(({ fila, col }) => { solucion[col] = R[fila][n]; });
      return { ...base, tipo: 'unica', rangoAumentada: rangoA, solucion };
    }

    const colPivote = new Map(pivotes.map(p => [p.col, p.fila]));
    const libres = [];
    for (let j = 0; j < n; j++) if (!colPivote.has(j)) libres.push(j);
    const expresiones = [];
    for (let j = 0; j < n; j++) {
      if (!colPivote.has(j)) { expresiones.push({ variable: j, libre: true }); continue; }
      const i = colPivote.get(j);
      const terminos = libres
        .filter(k => !R[i][k].esCero())
        .map(k => ({ variable: k, coef: R[i][k].negar() }));
      expresiones.push({ variable: j, libre: false, constante: R[i][n], terminos });
    }
    return { ...base, tipo: 'infinitas', rangoAumentada: rangoA, libres, expresiones };
  }

  function expresionTexto(e) {
    if (e.libre) return `x${e.variable + 1} es libre`;
    let s = '';
    if (!e.constante.esCero() || e.terminos.length === 0) s = e.constante.texto();
    for (const t of e.terminos) {
      const a = t.coef.abs();
      const c = a.esUno() ? '' : (a.esEntera() ? a.texto() : `(${a.texto()})`);
      const neg = t.coef.esNegativa();
      s += s === '' ? `${neg ? '−' : ''}${c}x${t.variable + 1}` : `${neg ? ' − ' : ' + '}${c}x${t.variable + 1}`;
    }
    return `x${e.variable + 1} = ${s}`;
  }

  function calcularDeterminante(matriz) {
    const inicial = aFracciones(matriz);
    const M = copiar(inicial);
    const n = M.length;
    const pasos = [];
    let intercambios = 0;

    for (let c = 0; c < n; c++) {
      let p = c;
      while (p < n && M[p][c].esCero()) p++;
      if (p === n) {
        return { inicial, pasos, triangular: M, intercambios, columnaSinPivote: c, diagonal: null, det: CERO };
      }
      if (p !== c) {
        const paso = opIntercambio(M, c, p, c);
        paso.explicacion += ' Un intercambio de filas cambia el signo del determinante.';
        pasos.push(paso);
        intercambios++;
      }
      for (let r = c + 1; r < n; r++) {
        if (!M[r][c].esCero()) pasos.push(opEliminacion(M, r, c, c, ' Esta operación no cambia el determinante.'));
      }
    }
    const diagonal = M.map((f, i) => f[i]);
    let det = diagonal.reduce((p, x) => p.multiplicar(x), UNO);
    if (intercambios % 2 === 1) det = det.negar();
    return { inicial, pasos, triangular: M, intercambios, columnaSinPivote: null, diagonal, det };
  }

  function calcularInversa(matriz) {
    const A = aFracciones(matriz);
    const n = A.length;
    const determinante = calcularDeterminante(A);
    if (determinante.det.esCero()) return { invertible: false, determinante };

    const I = identidad(n);
    const aumentada = A.map((f, i) => f.concat(I[i]));
    const { pasos, matriz: final } = gaussJordan(aumentada, n);
    const inversa = final.map(f => f.slice(n));
    const producto = multiplicarMatrices(A, inversa);
    return { invertible: true, determinante, inicial: aumentada, pasos, final, inversa, producto, verificada: esIdentidad(producto) };
  }

  const API = {
    Fraccion, mcd, copiar, aFracciones, identidad, multiplicarMatrices, esIdentidad,
    gaussJordan, resolverSistema, expresionTexto, calcularDeterminante, calcularInversa
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Matriz = API;
})(typeof window !== 'undefined' ? window : globalThis);
