(function () {
  'use strict';

  const { Fraccion, resolverSistema, calcularInversa } = window.Matriz;
  const MAX = 8;
  const $ = id => document.getElementById(id);

  function fracHTML(f) {
    const signo = f.esNegativa() ? '−' : '';
    const a = f.abs();
    if (a.esEntera()) return signo + a.n;
    return `${signo}<span class="frac"><span class="fn">${a.n}</span><span class="fd">${a.d}</span></span>`;
  }

  function factorHTML(f) {
    return f.esEntera() && !f.esNegativa() ? fracHTML(f) : `(${fracHTML(f)})`;
  }

  const variableHTML = j => `x<sub>${j + 1}</sub>`;

  function tablaMatriz(M, opc = {}) {
    const { separador = null, encabezados = null, filas = [], pivotes = [] } = opc;
    const esPivote = (i, j) => pivotes.some(p => p && p.fila === i && p.col === j);
    const claseSep = j => (separador !== null && j === separador ? 'sep' : '');
    let h = '<div class="tabla-scroll"><table class="matriz">';
    if (encabezados) {
      h += '<thead><tr>' + encabezados.map((e, j) => `<th class="${claseSep(j)}">${e}</th>`).join('') + '</tr></thead>';
    }
    h += '<tbody>';
    M.forEach((fila, i) => {
      h += `<tr class="${filas.includes(i) ? 'fila-mod' : ''}">`;
      fila.forEach((x, j) => {
        const cls = [claseSep(j), esPivote(i, j) ? 'pivote' : ''].join(' ').trim();
        h += `<td class="${cls}">${fracHTML(x)}</td>`;
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  const NOMBRE_TIPO = { intercambio: 'Intercambio', escalado: 'Escalado', eliminacion: 'Eliminación' };

  function listaPasos(pasos, opcTabla) {
    return '<ol class="pasos">' + pasos.map((p, k) => `
      <li class="paso ${p.tipo}">
        <div class="paso-cab">
          <span class="paso-num">Paso ${k + 1}</span>
          <code class="notacion">${p.notacion}</code>
          <span class="etiqueta ${p.tipo}">${NOMBRE_TIPO[p.tipo]}</span>
        </div>
        <p class="explicacion">${p.explicacion}</p>
        ${tablaMatriz(p.matriz, { ...opcTabla, filas: p.filas, pivotes: [p.pivote] })}
      </li>`).join('') + '</ol>';
  }

  const seccion = (titulo, contenido) => `<section class="seccion"><h3>${titulo}</h3>${contenido}</section>`;

  function expresionHTML(e) {
    if (e.libre) return `${variableHTML(e.variable)} es libre (puede tomar cualquier valor real)`;
    let s = '';
    if (!e.constante.esCero() || e.terminos.length === 0) s = fracHTML(e.constante);
    for (const t of e.terminos) {
      const a = t.coef.abs();
      const c = a.esUno() ? '' : (a.esEntera() ? fracHTML(a) : `(${fracHTML(a)})`);
      const neg = t.coef.esNegativa();
      s += s === '' ? `${neg ? '−' : ''}${c}${variableHTML(t.variable)}` : ` ${neg ? '−' : '+'} ${c}${variableHTML(t.variable)}`;
    }
    return `${variableHTML(e.variable)} = ${s}`;
  }

  function textosActuales(cont) {
    const datos = {};
    cont.querySelectorAll('input').forEach(inp => { datos[`${inp.dataset.i},${inp.dataset.j}`] = inp.value; });
    return datos;
  }

  function crearCuadricula(cont, filas, cols, encabezado, separador = null) {
    const previos = textosActuales(cont);
    let h = '<div class="tabla-scroll"><table class="entrada"><thead><tr><th></th>';
    for (let j = 0; j < cols; j++) h += `<th class="${j === separador ? 'sep' : ''}">${encabezado(j)}</th>`;
    h += '</tr></thead><tbody>';
    for (let i = 0; i < filas; i++) {
      h += `<tr><th>F${i + 1}</th>`;
      for (let j = 0; j < cols; j++) {
        const v = (previos[`${i},${j}`] || '').replace(/"/g, '');
        h += `<td class="${j === separador ? 'sep' : ''}"><input type="text" autocomplete="off" spellcheck="false"
          data-i="${i}" data-j="${j}" value="${v}" aria-label="Fila ${i + 1}, columna ${j + 1}"></td>`;
      }
      h += '</tr>';
    }
    cont.innerHTML = h + '</tbody></table></div>';
  }

  function leerCuadricula(cont, filas, cols) {
    const matriz = Array.from({ length: filas }, () => new Array(cols));
    let invalidas = 0;
    cont.querySelectorAll('input').forEach(inp => {
      const f = Fraccion.desdeTexto(inp.value);
      inp.classList.toggle('invalida', f === null);
      if (f === null) invalidas++;
      else matriz[+inp.dataset.i][+inp.dataset.j] = f;
    });
    return { matriz, invalidas };
  }

  function rellenarCuadricula(cont, valores) {
    cont.querySelectorAll('input').forEach(inp => {
      inp.value = valores[+inp.dataset.i][+inp.dataset.j];
      inp.classList.remove('invalida');
    });
  }

  function leerTamano(input) {
    const v = Number(input.value);
    return Number.isInteger(v) && v >= 1 && v <= MAX ? v : null;
  }

  function configurarModulo(cfg) {
    const grid = $(`${cfg.prefijo}-grid`);
    const error = $(`${cfg.prefijo}-error`);
    const salida = $(`${cfg.prefijo}-resultado`);
    const info = $(`${cfg.prefijo}-info`);
    let indiceEjemplo = 0;

    const mostrarError = msg => { error.innerHTML = msg; error.hidden = false; };
    const ocultarError = () => { error.hidden = true; error.innerHTML = ''; };

    function regenerar() {
      const dim = cfg.dimensiones();
      if (!dim) { mostrarError(`El tamaño debe ser un número entero entre 1 y ${MAX}.`); return false; }
      ocultarError();
      crearCuadricula(grid, dim.filas, dim.cols, j => cfg.encabezado(j, dim.cols), cfg.separador(dim.cols));
      return true;
    }

    function resolver() {
      const dim = cfg.dimensiones();
      if (!dim) { mostrarError(`El tamaño debe ser un número entero entre 1 y ${MAX}.`); return; }
      const { matriz, invalidas } = leerCuadricula(grid, dim.filas, dim.cols);
      if (invalidas > 0) {
        salida.innerHTML = '';
        mostrarError(`<strong>Revisa los datos</strong>Hay ${invalidas} celda${invalidas > 1 ? 's' : ''} vacía${invalidas > 1 ? 's' : ''} ` +
          `o con un valor no válido (marcada${invalidas > 1 ? 's' : ''} en rojo). Usa enteros (<code>4</code>), ` +
          `decimales (<code>-0.5</code>) o fracciones (<code>1/3</code>).`);
        return;
      }
      ocultarError();
      try {
        salida.innerHTML = cfg.resolver(matriz);
        salida.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        mostrarError(`Ocurrió un error inesperado: ${e.message}`);
      }
    }

    function limpiar() {
      grid.querySelectorAll('input').forEach(inp => { inp.value = ''; inp.classList.remove('invalida'); });
      salida.innerHTML = '';
      info.textContent = '';
      ocultarError();
    }

    function ejemplo() {
      const ej = cfg.ejemplos[indiceEjemplo];
      indiceEjemplo = (indiceEjemplo + 1) % cfg.ejemplos.length;
      cfg.aplicarEjemplo(ej);
      regenerar();
      rellenarCuadricula(grid, ej.valores);
      salida.innerHTML = '';
      info.textContent = `Ejemplo ${cfg.ejemplos.indexOf(ej) + 1} de ${cfg.ejemplos.length}: ${ej.nombre}. ` +
        'Pulsa «Resolver» o vuelve a pulsar «Ejemplo» para ver otro.';
    }

    cfg.entradasTamano.forEach(inp => inp.addEventListener('input', () => { if (leerTamano(inp)) regenerar(); }));
    cfg.entradasTamano.forEach(inp => inp.addEventListener('change', regenerar));
    grid.addEventListener('keydown', e => { if (e.key === 'Enter') resolver(); });
    $(`${cfg.prefijo}-resolver`).addEventListener('click', resolver);
    $(`${cfg.prefijo}-limpiar`).addEventListener('click', limpiar);
    $(`${cfg.prefijo}-ejemplo`).addEventListener('click', ejemplo);
    regenerar();
  }

  function renderSistema(A) {
    const r = resolverSistema(A);
    const n = r.numIncognitas;
    const opc = {
      separador: n,
      encabezados: Array.from({ length: n }, (_, j) => variableHTML(j)).concat('b')
    };

    let h = seccion('1. Matriz aumentada inicial [A | b]', tablaMatriz(r.inicial, opc));

    h += seccion('2. Operaciones de fila', r.pasos.length
      ? listaPasos(r.pasos, opc)
      : '<p>La matriz ya está en forma escalonada reducida: no hace falta ninguna operación.</p>');

    h += seccion('3. Forma escalonada reducida', tablaMatriz(r.final, { ...opc, pivotes: r.pivotes }) +
      `<p class="explicacion">rango(A) = ${r.rangoA}, rango([A | b]) = ${r.rangoAumentada}, número de incógnitas = ${n}.</p>`);

    let concl;
    if (r.tipo === 'unica') {
      concl = `<div class="mensaje ok"><strong>Solución única</strong>
        <p>Hay un pivote en cada columna de incógnitas (rango = ${n}), así que el sistema tiene exactamente una solución:</p>
        <ul class="solucion">${r.solucion.map((v, j) => `<li>${variableHTML(j)} = ${fracHTML(v)}</li>`).join('')}</ul></div>`;
    } else if (r.tipo === 'infinitas') {
      const libres = r.libres.map(variableHTML).join(', ');
      concl = `<div class="mensaje aviso"><strong>Infinitas soluciones</strong>
        <p>El sistema es compatible pero rango = ${r.rangoA} &lt; ${n} incógnitas, por lo que hay
        ${n - r.rangoA} variable${n - r.rangoA > 1 ? 's' : ''} libre${n - r.rangoA > 1 ? 's' : ''}: ${libres}.</p>
        <p>Las demás variables se expresan en función de ellas:</p>
        <ul class="solucion" style="flex-direction:column">${r.expresiones.map(e => `<li>${expresionHTML(e)}</li>`).join('')}</ul></div>`;
    } else {
      const i = r.filaInconsistente;
      const ceros = Array.from({ length: n }, (_, j) => `0${variableHTML(j)}`).join(' + ');
      concl = `<div class="mensaje error"><strong>Sin solución (sistema inconsistente)</strong>
        <p>La fila ${i + 1} quedó como ${ceros} = ${fracHTML(r.valor)}, es decir, <b>0 = ${fracHTML(r.valor)}</b>.</p>
        <p>Eso es imposible porque ${fracHTML(r.valor)} ≠ 0: ningún valor de las incógnitas cumple esa ecuación.
        (rango(A) = ${r.rangoA} ≠ rango([A | b]) = ${r.rangoAumentada}).</p></div>`;
    }
    return h + seccion('4. Conclusión', concl);
  }

  function renderDeterminante(d) {
    let h = '<p class="explicacion">Se lleva A a forma triangular superior. Reemplazar una fila por ella misma menos un múltiplo de otra ' +
      'no cambia el determinante; cada intercambio de filas le cambia el signo. No se escala ninguna fila.</p>';
    h += d.pasos.length ? listaPasos(d.pasos, {}) : '<p>La matriz ya es triangular superior: no hace falta ninguna operación.</p>';

    if (d.columnaSinPivote !== null) {
      const c = d.columnaSinPivote + 1;
      h += `<p>En la columna ${c} no queda ningún elemento distinto de cero desde la fila ${c} hacia abajo, ` +
        `así que la forma triangular tendrá un 0 en la diagonal.</p>`;
      h += tablaMatriz(d.triangular, {});
      h += `<p class="formula">det(A) = <b>0</b></p>`;
      return h;
    }
    h += '<p>Matriz triangular obtenida (diagonal resaltada):</p>';
    h += tablaMatriz(d.triangular, { pivotes: d.diagonal.map((_, i) => ({ fila: i, col: i })) });
    const producto = d.diagonal.map(factorHTML).join(' · ');
    h += `<p class="formula">det(A) = (−1)<sup>${d.intercambios}</sup> · ${producto} = <b>${fracHTML(d.det)}</b></p>`;
    h += `<p class="explicacion">Se hicieron ${d.intercambios} intercambio${d.intercambios === 1 ? '' : 's'} de filas, ` +
      `por eso el signo es ${d.intercambios % 2 ? 'negativo' : 'positivo'}.</p>`;
    return h;
  }

  function renderInversa(A) {
    const r = calcularInversa(A);
    const n = A.length;
    let h = seccion('1. Matriz A', tablaMatriz(r.determinante.inicial, {}));
    h += seccion('2. Determinante de A', renderDeterminante(r.determinante));

    if (!r.invertible) {
      return h + seccion('3. Conclusión', `<div class="mensaje error"><strong>La matriz NO es invertible</strong>
        <p>Como det(A) = 0, la matriz es singular: sus filas son linealmente dependientes y no existe A⁻¹.
        Por eso no se aplica Gauss-Jordan sobre [A | I].</p></div>`);
    }

    const opcAum = {
      separador: n,
      encabezados: Array.from({ length: 2 * n }, (_, j) => (j < n ? `A<sub>${j + 1}</sub>` : `I<sub>${j - n + 1}</sub>`))
    };
    h += seccion('3. Gauss-Jordan sobre [A | I]',
      `<p class="explicacion">Como det(A) = ${fracHTML(r.determinante.det)} ≠ 0, A es invertible. ` +
      'Se aplican operaciones de fila hasta que el lado izquierdo sea la identidad; el lado derecho será A⁻¹.</p>' +
      '<p><b>Matriz inicial [A | I]:</b></p>' + tablaMatriz(r.inicial, opcAum) +
      (r.pasos.length ? listaPasos(r.pasos, opcAum) : '<p>A ya es la identidad.</p>') +
      '<p><b>Resultado [I | A⁻¹]:</b></p>' + tablaMatriz(r.final, opcAum));

    h += seccion('4. Matriz inversa A⁻¹', tablaMatriz(r.inversa, {}));

    h += seccion('5. Verificación A · A⁻¹ = I',
      `<div class="lado-a-lado">${tablaMatriz(r.determinante.inicial, {})}<span>·</span>${tablaMatriz(r.inversa, {})}<span>=</span>${tablaMatriz(r.producto, {})}</div>` +
      (r.verificada
        ? '<div class="mensaje ok"><strong>✓ Verificado</strong><p>El producto es la matriz identidad, así que la inversa es correcta.</p></div>'
        : '<div class="mensaje error"><strong>El producto no es la identidad</strong></div>'));
    return h;
  }

  const EJEMPLOS_SISTEMAS = [
    { nombre: 'solución única (3×3)', m: 3, n: 3, valores: [['2', '1', '-1', '8'], ['-3', '-1', '2', '-11'], ['-2', '1', '2', '-3']] },
    { nombre: 'infinitas soluciones (3×3)', m: 3, n: 3, valores: [['1', '2', '-1', '3'], ['2', '4', '-2', '6'], ['1', '-1', '1', '0']] },
    { nombre: 'sin solución (3×3)', m: 3, n: 3, valores: [['1', '1', '1', '2'], ['2', '2', '2', '5'], ['1', '-1', '0', '0']] },
    { nombre: 'no cuadrado, 2 ecuaciones y 3 incógnitas', m: 2, n: 3, valores: [['1', '1', '1', '6'], ['2', '-1', '3', '9']] },
    { nombre: 'con fracciones y decimales (2×2)', m: 2, n: 2, valores: [['1/2', '1/3', '1'], ['0.25', '-1', '3/4']] }
  ];

  const EJEMPLOS_INVERSA = [
    { nombre: 'invertible con inversa entera', n: 3, valores: [['1', '2', '3'], ['0', '1', '4'], ['5', '6', '0']] },
    { nombre: 'invertible con inversa fraccionaria', n: 3, valores: [['2', '-1', '0'], ['-1', '2', '-1'], ['0', '-1', '2']] },
    { nombre: 'requiere intercambio de filas', n: 3, valores: [['0', '1', '2'], ['1', '0', '3'], ['4', '-3', '8']] },
    { nombre: 'singular (det = 0)', n: 3, valores: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']] }
  ];

  function configurarPestanas() {
    const pestanas = [...document.querySelectorAll('.pestana')];
    function activar(tab) {
      pestanas.forEach(t => {
        const activa = t === tab;
        t.classList.toggle('activa', activa);
        t.setAttribute('aria-selected', String(activa));
        t.tabIndex = activa ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !activa;
      });
    }
    pestanas.forEach((t, k) => {
      t.addEventListener('click', () => activar(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const sig = pestanas[(k + (e.key === 'ArrowRight' ? 1 : pestanas.length - 1)) % pestanas.length];
        activar(sig); sig.focus();
      });
    });
  }

  configurarPestanas();

  configurarModulo({
    prefijo: 's',
    entradasTamano: [$('s-filas'), $('s-cols')],
    dimensiones() {
      const m = leerTamano($('s-filas')), n = leerTamano($('s-cols'));
      return m && n ? { filas: m, cols: n + 1 } : null;
    },
    separador: cols => cols - 1,
    encabezado: (j, cols) => (j === cols - 1 ? 'b' : variableHTML(j)),
    ejemplos: EJEMPLOS_SISTEMAS,
    aplicarEjemplo(ej) { $('s-filas').value = ej.m; $('s-cols').value = ej.n; },
    resolver: renderSistema
  });

  configurarModulo({
    prefijo: 'i',
    entradasTamano: [$('i-n')],
    dimensiones() {
      const n = leerTamano($('i-n'));
      return n ? { filas: n, cols: n } : null;
    },
    separador: () => null,
    encabezado: j => `C${j + 1}`,
    ejemplos: EJEMPLOS_INVERSA,
    aplicarEjemplo(ej) { $('i-n').value = ej.n; },
    resolver: renderInversa
  });
})();
