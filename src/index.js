const main = require("./scripts/runner");
require("dotenv").config();

(async () => {
  try {
    await main();
  } catch (error) {
    console.error("Error ejecutando el reporte:", error);
  }
})();
