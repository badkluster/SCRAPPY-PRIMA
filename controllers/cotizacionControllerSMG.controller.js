const axios = require("axios");
const fs = require("fs");
const csv = require("csv-parser");
const { uploadFileAWSInternal } = require("../services/aws");
const config = require("../config");
const path = require("path");

const puppeteer = require("puppeteer");
require("dotenv").config();

const ASEGURADORA = "SMG";
const LAST_RUN_FILE = path.join(__dirname, "..", "dataJSON", "lastRun.json");

const parseFecha = (str) => {
  if (!str || !str.includes("/")) return null;
  const [d, m, y] = str.split("/").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
};

function readLastRunDate() {
  try {
    if (fs.existsSync(LAST_RUN_FILE)) {
      const data = JSON.parse(fs.readFileSync(LAST_RUN_FILE, "utf-8"));
      return new Date(data.lastRun);
    }
  } catch (err) {
    console.warn("No se pudo leer lastRun.json, usando fecha por defecto.");
  }
  return null;
}

function writeLastRunDate(date) {
  fs.writeFileSync(
    LAST_RUN_FILE,
    JSON.stringify({ lastRun: date.toISOString() }, null, 2),
    "utf-8"
  );
}

const generarPolizaBase = (p) => ({
  filaId: p["NSolicCia"],
  numeroPoliza: p["NroPol"],
  numeroPolizaEndoso: `${p["NroPol"]}-${p["NroEndoso"] || 0}`,
  observaciones: p["DscObservaciones"] || null,
  codigoAgente: p["NProd"],
  fechaEmision: parseFecha(p["FecEmision"]),
  vigenciaDesde: parseFecha(p["FecVigDesde"]),
  vigenciaHasta: parseFecha(p["FecVigHasta"]),
  tipoEndoso: p["CodTipoEndo"],
  tipoEndosoTexto: p["DscTipoEndo"],
  asegurado: p["DscCliente"],
  asegurado_dni: p["NroDocumento"],
  aseguradoCelular: p["DscTelefCelular"] || null,
  domicilio: p["DscDomicilio"],
  aseguradoEmail: p["DscEmail"],
  formaDePago: p["DscFormaPago"],
  riesgo_marca: p["DscMarca"],
  riesgo_modelo: p["DscModelo"],
  riesgo_patente: p["Patente"],
  riesgo_anio: p["AnioVehiculo"],
  cobertura: p["DscCobertura"],
  sumaAsegurada: p["SumaAsegurada"],
  premio: p["ImpPremio"],
  deuda: null,
  prima: p["ImpPrima"],
  polizaPack: false,
  polizaExceptuadaCaucion: false,
  impOriginal: false,
  impCopiaProductor: false,
  impCopiaOrganizador: false,
  codigoRamo: Number(p["CodRamo"]) || 0,
  acciones: null,
  idCotizacionMultiCotizador: p["NCotiz"],
  propuestaUrl: null,
  certificadoUrl: null,
  docUrl: null,
  aseguradora: ASEGURADORA,
  //////////////////////////////

  fechaEnvio: parseFecha(p["FecEnvio"]),
  descripcionPlan: p["DscPlan"],
  codigoTipoNegocio: p["CodTipoNegocio"],
  descripcionTipoNegocio: p["DscTipoNegocio"],
  codigoCampania: p["CodCampania"],
  descripcionCampania: p["DscCampania"],
  numeroPolizaRenov: p["NroPolRenov"],
  codigoRefacturacion: p["CodRefacturacion"],
  descripcionRefacturacion: p["DscRefacturacion"],
  codigoMoneda: p["CodMoneda"],
  descripcionMoneda: p["DscMoneda"],
  porcentajeAjuste: p["PrcAjuste"],
  porcentajeRecargoFinanciero: p["PrcRecFin"],
  importeRecargoFinanciero: p["ImpRecFin"],
  importeImpuesto: p["ImpImpuesto"],
  porcentajeIVA: p["PrcTotIva"],
  importeIVA: p["ImpTotIva"],
  cantidadCuotas: p["NCtas"],
  importePrimeraCuota: p["ImpPrimera"],
  fechaPrimeraCuota: parseFecha(p["FechPrimera"]),
  codigoProvinciaRiesgo: p["CodPrvRiesgo"],
  descripcionProvinciaRiesgo: p["DscPrvRiesgo"],
  codigoCliente: p["CodCliente"],
  fechaNacimiento: parseFecha(p["FecNacimiento"]),
  tipoDocumento: p["CodTipoDoc"],
  descripcionTipoDocumento: p["DscTipoDoc"],
  condicionIVA: p["DscCondIva"],
  localidad: p["DscLocalidad"],
  provincia: p["DscProvincia"],
  codigoPostal: p["CodPostal"],
  CUIT: p["CUIT"],
  nroItem: p["NroItem"],
  codigoExtrad: p["CodExtrad"],
  tipoVehiculo: p["DscTipoVehiculo"],
  codigoTipoVehiculo: p["CodTipoVehiculo"],
  carroceria: p["CodCarroceria"],
  marcaCeroKm: p["MarcaCeroKm"] === "S",
  chasis: p["Chasis"],
  motor: p["Motor"],
  origen: p["Origen"],
  codigoUso: p["CodUso"],
  uso: p["DscUso"],
  titular: p["DscTitular"],
  primaVehiculo: p["ImpPrimaVehiculo"],
  alarma: p["DscAlarma"],
  acreedorPrendario: p["DscAcreedorPrendario"],
  tomadorLeasing: p["DscTomadorLeasing"],
  productor: p["Productor"],
  codigoAjustePrima: p["CodAjustePrima"],
  coeficienteAjustePrima: p["CoefAjustePrima"],
  fechaProximaFacturacion: parseFecha(p["FecProxFact"]),
  codigoLimiteRC: p["prd_Cod_Limite_rc"],
  importeLimiteRC: p["prd_imp_limite_rc"],
  vencimientoAgente: parseFecha(p["VtoAgente"]),
  vencimientoConvenio: parseFecha(p["VtoConvenio"]),
  usuarioEmisor: p["Prd_UsuarioEmisor"]?.trim() || null,
});

async function descargarYSubirPoliza({
  usuario,
  password,
  productores,
  cod_ramo,
  nro_pol,
  nro_endoso,
  copia = 0,
}) {
  const url = `${config.URL_API_NET_SMG}/exportar/poliza/impresion`;

  const params = {
    usuario,
    password,
    productores,
    cod_ramo,
    nro_pol,
    nro_endoso,
    copia,
  };
  const response = await axios.get(url, {
    params,
    responseType: "arraybuffer",
    headers: { Accept: "application/pdf" },
  });

  const pdfBuffer = Buffer.from(response.data);
  const fileName = `poliza_${nro_pol}_${nro_endoso}.pdf`;
  return uploadFileAWSInternal(fileName, pdfBuffer);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function procesarIntervalo(desde, hasta, acumuladas) {
  const agentes =
    typeof config.SMG_AGENTES === "string"
      ? config.SMG_AGENTES.split(",")
      : config.SMG_AGENTES;
  const tiposOp = ["AU", "OR"];

  for (const tipo of tiposOp) {
    const params = {
      fec_desde: formatDate(desde),
      fec_hasta: formatDate(hasta),
      agentes: agentes.join(","),
      tipo_op: tipo,
    };

    console.log(
      `Procesando intervalo ${params.fec_desde} - ${params.fec_hasta} tipo ${tipo}`
    );

    const response = await axios.get(
      `${config.URL_API_NET_SMG}/exportar/libros`,
      {
        params,
        responseType: "stream",
      }
    );

    const filas = [];
    await new Promise((res, rej) => {
      response.data
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => filas.push(row))
        .on("end", res)
        .on("error", rej);
    });

    const fileNameCrudo = `polizas_crudo_${params.fec_desde}_${params.fec_hasta}_${tipo}-SMG.json`;
    const filePathCrudo = path.join(
      __dirname,
      "..",
      "dataJSON",
      "polizasObtenidas",
      fileNameCrudo
    );
    fs.mkdirSync(path.dirname(filePathCrudo), { recursive: true });

    fs.writeFileSync(filePathCrudo, JSON.stringify(filas, null, 2));
    console.log(`Guardado JSON crudo: ${fileNameCrudo}`);

    const polizasBase = filas.map(generarPolizaBase);

    for (let i = 0; i < filas.length; i++) {
      const endosoNro = filas[i]["NroEndoso"] || 0;
      const ramoNro = filas[i]["CodRamo"] || 0;

      try {
        const url = await descargarYSubirPoliza({
          usuario: config.SMG_USER,
          password: config.SMG_PASS,
          productores: filas[i]["NProd"],
          cod_ramo: ramoNro,
          nro_pol: filas[i]["NroPol"],
          nro_endoso: endosoNro,
        });
        polizasBase[i].docUrl = url;
        console.log(`✔️ Subida poliza ${filas[i]["NroPol"]}`);
      } catch (err) {
        console.error(
          `Error ${filas[i]["NroPol"]}-${endosoNro}: ${err.message}`
        );
      }
    }

    await enviarPolizasBackend(polizasBase);
    const filePath = path.join(
      __dirname,
      "..",
      "dataJSON",
      "polizasTotales",
      "polizas_totales-SMG.json"
    );
    acumuladas.push(...polizasBase);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    fs.writeFileSync(filePath, JSON.stringify(acumuladas, null, 2));
    console.log(`Guardadas ${acumuladas.length} pólizas en total`);
  }
}

async function obtenerTodasLasPolizasHistoricas(req, res) {
  const queryFecha = req?.query?.fechaInicio
    ? new Date(req.query.fechaInicio)
    : null;

  console.log("🔍 Iniciando proceso histórico de pólizas...");

  // 2. Si no hay fecha en query, usar la guardada en JSON (lastRun), si no, usar fija
  const lastRun = readLastRunDate();
  const defaultStart = new Date("2025-06-17");

  const inicioGeneral = queryFecha || lastRun || defaultStart;
  const finGeneral = new Date(); // Hasta hoy

  const acumuladas = [];
  const errores = [];

  const intervaloDias = 30; // Intervalo de 30 días

  let desde = new Date(inicioGeneral);

  console.log(
    `🚀 Iniciando proceso histórico desde ${inicioGeneral
      .toISOString()
      .slice(0, 10)} hasta ${finGeneral.toISOString().slice(0, 10)}...`
  );

  while (desde <= finGeneral) {
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + intervaloDias);

    if (hasta > finGeneral) {
      hasta.setTime(finGeneral.getTime());
    }

    const intervaloLabel = [
      `${desde.toISOString().slice(0, 10)} - ${hasta
        .toISOString()
        .slice(0, 10)}`,
    ];

    console.log(`➡️ Procesando intervalo ${intervaloLabel}...`);

    try {
      await procesarIntervaloConReintentos(desde, hasta, acumuladas);
      console.log(`✅ Intervalo ${intervaloLabel} procesado correctamente.`);
    } catch (error) {
      console.error(
        `❌ Intervalo ${intervaloLabel} falló después de reintentos.`
      );
      errores.push({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        error: error.message,
      });
    }

    // Avanzamos al siguiente intervalo
    desde.setDate(desde.getDate() + intervaloDias + 1);
  }

  // Guardamos fecha de ejecución sólo si terminó todo
  writeLastRunDate(new Date());

  console.log("\n📊 Resumen del proceso:");
  console.log(
    `- Intervalos exitosos: ${
      Math.ceil(
        (finGeneral - inicioGeneral) / (1000 * 60 * 60 * 24 * intervaloDias)
      ) - errores.length
    }`
  );
  console.log(`- Intervalos con error: ${errores.length}`);

  if (errores.length > 0) {
    console.log("\n⚠️ Intervalos con problemas:");
    errores.forEach((e, idx) => {
      console.log(
        `${idx + 1}. Desde ${e.desde.slice(0, 10)} hasta ${e.hasta.slice(
          0,
          10
        )} ➔ Error: ${e.error}`
      );
    });

    guardarErroresEnJson(errores);
  }

  console.log("\n✅ Proceso finalizado.");

  res.status(200).json({ message: "Proceso finalizado." });
}

function guardarErroresEnJson(errores) {
  const filePath = path.join(
    __dirname,
    "..",
    "dataJSON",
    "erroresIntervalos",
    "errores-intervalos-SMG.json"
  );
  try {
    fs.writeFileSync(filePath, JSON.stringify(errores, null, 2));
    console.log(
      `📁 Archivo errores-intervalos.json guardado con ${errores.length} errores.`
    );
  } catch (e) {
    console.error("❌ No se pudo guardar el archivo de errores:", e.message);
  }
}

async function reprocesarErrores() {
  const erroresPath = path.join(
    __dirname,
    "..",
    "dataJSON",
    "erroresIntervalos",
    "errores_intervalos_smg.json"
  );
  fs.writeFileSync(erroresPath, JSON.stringify(errores, null, 2), "utf-8");
  console.log(`\n💾 Errores guardados en: ${erroresPath}`);

  if (!fs.existsSync(erroresPath)) {
    console.log(
      "✅ No hay errores para reprocesar. El archivo errores-intervalos.json no existe."
    );
    return;
  }

  const erroresData = JSON.parse(fs.readFileSync(erroresPath, "utf8"));

  if (erroresData.length === 0) {
    console.log(
      "✅ El archivo errores-intervalos.json está vacío. No hay intervalos pendientes."
    );
    return;
  }

  const erroresPendientes = [];

  for (let i = 0; i < erroresData.length; i++) {
    const { desde, hasta } = erroresData[i];
    const intervaloLabel = [`${desde.slice(0, 10)} - ${hasta.slice(0, 10)}`];

    try {
      await procesarIntervaloConReintentos(new Date(desde), new Date(hasta));
    } catch (error) {
      erroresPendientes.push({
        desde,
        hasta,
        error: error.message,
      });
    }
  }

  // Actualizamos el archivo con los intervalos que sigan fallando
  guardarErroresEnJson(erroresPendientes);
}

async function enviarPolizasBackend(polizas) {
  try {
    console.log("Enviando lote al backend...", polizas);
    await axios.post(config.BACKEND_URL + "/receiveAndCreatePolizas", polizas);
    console.log("Lote enviado exitosamente.");
  } catch (error) {
    console.error("Error al enviar el lote al backend:", error.message);
  }
}

// 👉 Intenta procesar un intervalo hasta maxReintentos veces
async function procesarIntervaloConReintentos(
  desde,
  hasta,
  acumuladas,
  intentos = 3
) {
  let intento = 0;
  while (intento < intentos) {
    try {
      await procesarIntervalo(desde, hasta, acumuladas);
      return; // Éxito, salimos de la función
    } catch (error) {
      intento++;
      console.warn(
        `⚠️ Intento ${intento} fallido para el intervalo ${desde
          .toISOString()
          .slice(0, 10)} - ${hasta.toISOString().slice(0, 10)}: ${
          error.message
        }`
      );
      if (intento >= intentos) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, 2000)); // Espera antes de reintentar
    }
  }
}

async function obtenerCobranzas(browser, idFila) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  const url = `https://oficina.smg.com.ar/Dijkstra/Cartera/DetalleCobranza/${idFila}`;
  console.log(`→ Abriendo detalle de cobranzas: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
  await page.waitForSelector("table:nth-of-type(2) tbody", { timeout: 60000 });

  const cobranzas = await page.evaluate(() => {
    const tabla = document.querySelector("table:nth-of-type(2) tbody");
    if (!tabla) return [];
    const limpiarMonto = (m) =>
      parseFloat(
        m.replace("$", "").replace(/\./g, "").replace(",", ".").trim() || 0
      );
    return Array.from(tabla.querySelectorAll("tr")).map((fila) => {
      const cols = fila.querySelectorAll("td");
      return {
        cuota: cols[0]?.textContent.trim(),
        fechaVto: cols[1]?.textContent.trim() || null,
        premio: cols[2]?.textContent.trim()
          ? limpiarMonto(cols[2].textContent)
          : null,
        fechaImpCob: cols[3]?.textContent.trim() || null,
        fechaRealPago: cols[4]?.textContent.trim() || null,
        origen: cols[5]?.textContent.trim(),
        saldo: cols[6]?.textContent.trim()
          ? limpiarMonto(cols[6].textContent)
          : null,
        estado: cols[7]?.textContent.trim(),
        fechaVtoAgente: cols[8]?.textContent.trim() || null,
        recibo: cols[9]?.textContent.trim(),
        pagoOnline: cols[10]?.textContent.trim(),
      };
    });
  });

  await page.close();
  console.log(`→ ${cobranzas.length} cobranzas extraídas para ${idFila}`);
  return cobranzas;
}

async function runReportCobranzas() {
  console.log("🚀 Iniciando runReportCobranzas...");

  if (!process.env.SMG_USER || !process.env.SMG_PASS) {
    throw new Error("Faltan SMG_USER o SMG_PASS en el .env");
  }

  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 180000,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);

  try {
    // — LOGIN —
    await page.goto("https://oficina.smg.com.ar/", {
      waitUntil: "networkidle2",
    });
    await page.type("#ctl00_cphBarra_login_UserName", config.SMG_USER);
    await page.type("#ctl00_cphBarra_login_Password", config.SMG_PASS);
    await Promise.all([
      page.click("#ctl00_cphBarra_login_Login"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    console.log("✔ Login exitoso");

    // — SECCIÓN PÓLIZAS —
    await page.goto(
      "https://oficina.smg.com.ar/Dijkstra/Cartera/PolizaEndoso",
      { waitUntil: "networkidle2" }
    );

    // — FILTROS AGENTES —
    await page.waitForSelector("#linkArbolAgentes", { visible: true });
    await page.click("#linkArbolAgentes");
    await page.waitForFunction(
      () => !document.querySelector(".ui-blockui")?.offsetParent,
      { timeout: 60000 }
    );
    await page.evaluate(() => {
      document.querySelectorAll("li.jstree-node").forEach((item) => {
        if (item.getAttribute("esfinal") === "false") {
          item.querySelector("i.jstree-checkbox")?.click();
        }
      });
      document
        .querySelectorAll("button")
        .forEach((b) => b.textContent.trim() === "Aceptar" && b.click());
    });

    // — BUSCAR PÓLIZAS —
    await Promise.all([
      page.click("#btnBuscar"),
      page.waitForFunction(
        () => document.querySelectorAll("#list tbody tr").length > 1,
        { timeout: 60000 }
      ),
    ]);

    // — PAGINACIÓN RESILIENTE —
    const totalPages = await page.evaluate(() => {
      const span = document.querySelector("#sp_1_pager");
      return span ? parseInt(span.textContent.trim(), 10) : 1;
    });
    console.log(`🗂 Páginas totales: ${totalPages}`);

    const reporteDatos = [];
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      console.log(`– Leyendo página ${currentPage}/${totalPages}`);
      const datos = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#list tbody tr[id]")).map(
          (fila) => ({
            idFila: fila.getAttribute("id"),
            numeroPoliza: fila
              .querySelector("td[aria-describedby$='_nro_pol']")
              ?.textContent.trim(),
          })
        )
      );
      reporteDatos.push(...datos);

      if (currentPage < totalPages) {
        // Intentos de click + espera (2 reintentos)
        const prevHTML = await page.evaluate(
          () => document.querySelector("#list tbody").innerHTML
        );
        let success = false;
        for (let attempt = 1; attempt <= 2 && !success; attempt++) {
          try {
            await page.click("#next_pager");
            await page.waitForFunction(
              (old) => document.querySelector("#list tbody").innerHTML !== old,
              { timeout: 60000 },
              prevHTML
            );
            success = true;
          } catch (e) {
            console.warn(
              `⚠️ Timeout o fallo al avanzar página (intento ${attempt}/2).`
            );
            if (attempt === 2) {
              console.error("❌ No se pudo avanzar, abortando paginación.");
              break;
            }
          }
        }
        if (!success) break;
      }
    }
    console.log(`✔ Total de pólizas detectadas: ${reporteDatos.length}`);

    // — EXTRAER COBRANZAS —
    const results = [];
    for (const { idFila, numeroPoliza } of reporteDatos) {
      const cobranzas = await obtenerCobranzas(browser, idFila);
      results.push({ idFila, numeroPoliza, cobranzas });
    }

    console.log("🎉 Cobranzas obtenidas:");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("❌ Error en runReportCobranzas:", err);
  } finally {
    await browser.close();
    console.log("🛑 Navegador cerrado");
  }
}

module.exports = {
  obtenerTodasLasPolizasHistoricas,
  reprocesarErrores,
  runReportCobranzas,
};
