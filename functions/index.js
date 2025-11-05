// Importa los módulos
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const cors = require("cors")({ origin: true }); // Habilita CORS

// --- CONFIGURACIÓN DE DOCUMENT AI ---
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const client = new DocumentProcessorServiceClient();

// !! REEMPLAZA ESTOS VALORES !!
const projectId = 'web-de-group'; // Tu Project ID
const location = 'us-central1'; // Región de la función
const processorId = '[ID_PRIVADO_DEL_USUARIO]'; // El ID de tu "Expense Parser"

const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
// --- FIN DE CONFIGURACIÓN ---


// Usamos onRequest en lugar de onCall
exports.processReceipt = onRequest((request, response) => {
  
  // Envolvemos la función en 'cors' para evitar errores en el navegador
  cors(request, response, async () => {

    // Verificamos que sea una llamada POST
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    // Obtenemos la URL (ahora viene en request.body.data)
    const imageUrl = request.body.data?.imageUrl;
    if (!imageUrl) {
      logger.error("Llamada sin 'imageUrl'");
      response.status(400).json({ data: { error: 'No se proporcionó "imageUrl".' } });
      return;
    }

    logger.info(`Procesando imagen (público): ${imageUrl}`);

    try {
      // --- LÓGICA REAL DE DOCUMENT AI (idéntica a antes) ---
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      const encodedImage = imageBuffer.toString('base64');

      const [result] = await client.processDocument({
        name: name,
        rawDocument: {
          content: encodedImage,
          mimeType: 'image/jpeg',
        },
      });

      const { document } = result;
      const getEntity = (type) => document.entities.find(e => e.type === type)?.mentionText || null;
      const items = document.entities
        .filter(e => e.type === 'line_item')
        .map(item => {
          const detail = item.properties.find(p => p.type === 'line_item_description')?.mentionText || 'Ítem';
          const price = parseFloat(item.properties.find(p => p.type === 'line_item_amount')?.mentionText) || 0;
          return { detail, price };
        });

      const processedData = {
        concept: getEntity('supplier_name') || 'Concepto General',
        amount: parseFloat(getEntity('total_amount')) || 0,
        items: items
      };

      logger.info("Documento procesado con éxito.");
      // Devolvemos el resultado envuelto en un objeto 'data'
      response.status(200).json({ data: processedData });

    } catch (error) {
      logger.error("Error procesando el documento:", error);
      response.status(500).json({ data: { error: 'Error al procesar el documento con IA.' } });
    }
  });
});