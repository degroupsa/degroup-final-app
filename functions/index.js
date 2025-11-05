// Importa los módulos
const logger = require("firebase-functions/logger");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const express = require("express"); // Importar Express

// --- CONFIGURACIÓN DE DOCUMENT AI ---
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const client = new DocumentProcessorServiceClient();

// !! REEMPLAZA ESTOS VALORES !!
const projectId = 'web-de-group'; // Tu Project ID
const location = 'us-central1'; // Región de la función
const processorId = '[ID_PRIVADO_DEL_USUARIO]'; // El ID de tu "Expense Parser"

const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
// --- FIN DE CONFIGURACIÓN ---

// Esta es la LÓGICA de la función que ya teníamos
const processReceiptLogic = async (request, response) => {
  // Envolvemos la función en 'cors'
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
      // --- LÓGICA REAL DE DOCUMENT AI ---
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

      // ... (Procesar resultado) ...
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
      response.status(200).json({ data: processedData });

    } catch (error) {
      logger.error("Error procesando el documento:", error);
      response.status(500).json({ data: { error: 'Error al procesar el documento con IA.' } });
    }
  });
};

// --- CÓDIGO NUEVO DEL SERVIDOR ---
const app = express();
app.use(express.json()); // Middleware para parsear JSON

// La función ahora responde en la RUTA RAÍZ ("/") del servicio
app.post('/', processReceiptLogic);

// Cloud Run nos da un puerto en la variable de entorno PORT (o usamos 8080)
const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Servidor escuchando en el puerto ${port}`);
});