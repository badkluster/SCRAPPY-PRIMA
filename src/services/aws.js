const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const config = require("../config");

// Crear el cliente de S3 con la configuración necesaria
const s3 = new S3Client({
  region: config.REGION,
  credentials: {
    accessKeyId: config.ID,
    secretAccessKey: config.SECRET,
  },
});

// Función para subir un archivo a S3
exports.uploadFileAWSInternal = async (namePdf, pdfBuffer) => {
  const uploadParams = {
    Bucket: config.IMAGES, // Nombre del bucket en S3
    Key: namePdf, // Nombre del archivo en S3
    Body: pdfBuffer, // El buffer del archivo
    ContentType: "application/pdf", // Tipo de archivo
  };

  try {
    // Crear el comando para subir el archivo
    const command = new PutObjectCommand(uploadParams);
    const result = await s3.send(command); // Ejecutar el comando usando s3.send
    // console.log("PDF subido exitosamente a S3:", result);
    // Retorna la URL del archivo subido
    return `https://${uploadParams.Bucket}.s3.amazonaws.com/${uploadParams.Key}`;
  } catch (error) {
    console.error("Error subiendo el PDF a S3:", error);
    throw error;
  }
};
