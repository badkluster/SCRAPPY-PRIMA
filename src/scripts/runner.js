const prompt = require("prompt-sync")({ sigint: true });
const {
  obtenerTodasLasPolizasHistoricas,
  reprocesarErrores,
  runReportCobranzas,
} = require("./procesos");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=========================================");
  console.log("Bienvenido al Procesador de Polizas SMG");
  console.log("=========================================\n");

  while (true) {
    console.log("\n¿Qué desea hacer?");
    console.log("1️⃣  Correr proceso histórico completo");
    console.log("2️⃣  Reprocesar intervalos fallidos");
    console.log("3️⃣  Obtener cobranzas");
    console.log("4️⃣  Salir\n");

    const opcion = prompt("Ingrese una opción (1/2/3/4): ");

    switch (opcion.trim()) {
      case "1":
        console.log("\n🛫 Iniciando proceso histórico completo...\n");
        try {
          await obtenerTodasLasPolizasHistoricas();
        } catch (error) {
          console.error(`❌ Error al procesar histórico: ${error.message}`);
        }
        break;

      case "2":
        console.log("\n🔁 Iniciando reprocesamiento de errores...\n");
        try {
          await reprocesarErrores();
        } catch (error) {
          console.error(`❌ Error al reprocesar errores: ${error.message}`);
        }
        break;

      case "3":
        console.log("\n🔁 Iniciando obtencion de cobranzas...\n");
        try {
          await runReportCobranzas();
        } catch (error) {
          console.error(`❌ Error al obtener cobranzas: ${error.message}`);
        }
        break;

      case "4":
        console.log("\n👋 Saliendo. ¡Hasta luego!\n");
        process.exit(0);

      default:
        console.log("⚠️ Opción inválida. Por favor ingrese 1, 2 o 3.\n");
    }
  }
}

module.exports = main;
