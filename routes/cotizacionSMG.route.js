const express = require("express");
const router = express.Router();
const smgController = require("../controllers/cotizacionControllerSMG.controller");
const { fork } = require("child_process");

router.post("/cobranzasSMG", smgController.runReportCobranzas);
router.post("/polizasSMG", (req, res) => {
  const fechaInicio = req.query.fechaInicio || null;

  const child = fork("./procesos/historicoRunnerSMG.js");

  child.send({ fechaInicio });

  res.status(202).json({
    message: "✅ Proceso de histórico SMG iniciado en segundo plano.",
    fechaInicio,
  });
});
router.post("/reprocesarPolizasSMG", smgController.reprocesarErrores);

module.exports = router;
