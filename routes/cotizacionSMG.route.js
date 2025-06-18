const express = require("express");
const router = express.Router();
const smgController = require("../controllers/cotizacionControllerSMG.controller");

router.post("/cobranzasSMG", smgController.runReportCobranzas);
router.post("/polizasSMG", smgController.obtenerTodasLasPolizasHistoricas);
router.post("/reprocesarPolizasSMG", smgController.reprocesarErrores);

module.exports = router;
