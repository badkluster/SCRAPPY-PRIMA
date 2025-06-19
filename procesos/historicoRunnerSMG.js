// procesos/historicoRunner.js
const {
  obtenerTodasLasPolizasHistoricas,
} = require("../controllers/cotizacionControllerSMG.controller");

process.on("message", async (params) => {
  try {
    console.log("▶️ Iniciando child process con fecha:", params.fechaInicio);
    await obtenerTodasLasPolizasHistoricas(
      { query: { fechaInicio: params.fechaInicio } },
      { status: () => ({ json: () => {} }) }
    );
    console.log("✅ Proceso completado en child process.");
  } catch (error) {
    console.error("❌ Error en child process:", error.message);
  } finally {
    process.exit();
  }
});
