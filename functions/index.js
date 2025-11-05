// Importa los módulos necesarios
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios"); // Para descargar la imagen

// --- CONFIGURACIÓN DE DOCUMENT AI ---
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const client = new DocumentProcessorServiceClient();

// !! REEMPLAZA ESTOS VALORES !!
const projectId = 'web-de-group'; // Tu Project ID
const location = 'us-central1'; // Región de la función
const processorId = '[ID_PRIVADO_DEL_USUARIO]'; // El ID de tu "Expense Parser"

const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
// --- FIN DE CONFIGURACIÓN ---


exports.processReceipt = onCall(async (request) => {

  // 1. Verificación de autenticación
  if (!request.auth) {
    logger.error("Intento de llamada no autenticada.");
    throw new HttpsError('unauthenticated', 'Debes estar logueado.');
  }

  // 2. Obtenemos la URL de la imagen
  const imageUrl = request.data.imageUrl;
  if (!imageUrl) {
    logger.error("Llamada sin 'imageUrl'");
    throw new HttpsError('invalid-argument', 'No se proporcionó "imageUrl".');
  }

  logger.info(`Usuario ${request.auth.uid} procesando imagen...`);

  try {
    // --- LÓGICA REAL DE DOCUMENT AI ---
    
    // 1. Descargar la imagen de Firebase Storage
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    // 2. Preparar la imagen para Document AI (convertir a base64)
    const encodedImage = imageBuffer.toString('base64');

    const [result] = await client.processDocument({
      name: name,
      rawDocument: {
        content: encodedImage,
        mimeType: 'image/jpeg', // Asumimos jpeg o png.
      },
    });

    // 3. Procesar el resultado
    const { document } = result;
    
    // Función helper para buscar entidades
    const getEntity = (type) => document.entities.find(e => e.type === type)?.mentionText || null;
    
    // Mapear los ítems
    const items = document.entities
      .filter(e => e.type === 'line_item')
      .map(item => {
        const detail = item.properties.find(p => p.type === 'line_item_description')?.mentionText || 'Ítem';
        const price = parseFloat(item.properties.find(p => p.type === 'line_item_amount')?.mentionText) || 0;
        return { detail, price }; 
      });

    // 4. Devolver los datos al frontend
    const processedData = {
      concept: getEntity('supplier_name') || 'Concepto General',
      amount: parseFloat(getEntity('total_amount')) || 0,
      items: items
    };

    logger.info("Documento procesado con éxito.");
    return processedData;

  } catch (error) {
    logger.error("Error procesando el documento:", error);
    throw new HttpsError('internal', 'Error al procesar el documento con IA.');
  }
});