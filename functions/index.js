// Importa los módulos
const logger = require("firebase-functions/logger");
const axios = require("axios");
const cors = require("cors");
const express = require("express");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// --- ¡NUEVO! Importar Vertex AI (Gemini) --
const { VertexAI } = require('@google-cloud/vertexai');

// --- INICIALIZACIÓN DE SERVICIOS ---
initializeApp();
const db = getFirestore(); // Base de datos
const app = express(); // Servidor web
app.use(express.json());
app.use(cors({ origin: true }));


// --- ¡NUEVO! Configuración de Vertex AI ---
const vertex_ai = new VertexAI({ project: 'web-de-group', location: 'us-central1' });
const model = 'gemini-1.0-pro'; // Modelo de IA (Estándar y estable)

const generativeModel = vertex_ai.getGenerativeModel({
  model: model,
  generationConfig: {
    "temperature": 1,
    "topP": 0.95,
    "topK": 64,
    "maxOutputTokens": 8192,
  },
});


// --- CONFIGURACIÓN DE DOCUMENT AI (¡Existente!) ---
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const clientOptions = { apiEndpoint: 'us-documentai.googleapis.com' };
const client = new DocumentProcessorServiceClient(clientOptions);
const processorId = '773519c2b12aca46';
const projectId = 'web-de-group';
const location = 'us';
const docAIname = `projects/${projectId}/locations/${location}/processors/${processorId}`;
// --- FIN DE CONFIGURACIÓN ---


// === RUTA 1: PROCESADOR DE FACTURAS (¡Existente!) ===
const processReceiptLogic = async (request, response) => {
    // ... (Tu lógica de processReceipt... la copio sin cambios)
    const imageUrl = request.body.data?.imageUrl;
    if (!imageUrl) {
      logger.error("Llamada sin 'imageUrl'");
      return response.status(400).json({ data: { error: 'No se proporcionó "imageUrl".' } });
    }
    logger.info(`Procesando imagen (público): ${imageUrl}`);
    try {
      const [result] = await client.processDocument({
        name: docAIname, // <-- Corregido para usar la variable 'docAIname'
        rawDocument: {
          content: (await axios.get(imageUrl, { responseType: 'arraybuffer' })).data.toString('base64'),
          mimeType: 'image/jpeg',
        },
      });

      const { document } = result;
      const { entities } = document;
      const getEntity = (type) => entities.find(e => e.type === type)?.mentionText || null;
      
      const all_line_items = entities.filter(e => e.type === 'line_item');
      const descriptions = all_line_items
        .filter(item => item.properties && item.properties.some(p => p.type === 'line_item/description'))
        .map(item => item.properties.find(p => p.type === 'line_item/description').mentionText);
      const amounts = all_line_items
        .filter(item => item.properties && item.properties.some(p => p.type === 'line_item/amount'))
        .map(item => parseFloat(item.properties.find(p => p.type === 'line_item/amount').mentionText) || 0);

      const numItems = Math.min(descriptions.length, amounts.length);
      const items = [];
      for (let i = 0; i < numItems; i++) {
        items.push({ detail: descriptions[i] || 'Ítem', price: amounts[i] || 0 });
      }
      
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
};
app.post('/', processReceiptLogic); // La ruta raíz sigue siendo para facturas


// === ¡NUEVA RUTA! RUTA 2: ASESOR FINANCIERO ===
const getFinancialAdviceLogic = async (request, response) => {
  logger.info("Recibida solicitud de asesoría financiera.");
  
  try {
    // 1. Recolectar Contexto Interno
    const plansSnap = await db.collection('plannedMovements').where('status', '==', 'Planeado').get();
    const plans = plansSnap.docs.map(doc => doc.data());

    // (Podemos agregar 'registrosFinancieros' aquí también, pero empecemos simple)

    if (plans.length === 0) {
      return response.status(400).json({ data: { error: "No hay movimientos planificados para analizar." } });
    }

    // 2. Generar el Prompt para Gemini
    const prompt = `
      Eres un asesor financiero experto para una pequeña empresa (PYME) en Argentina, 
      con un estilo directo y práctico similar al de Robert Kiyosaki.
      
      Mi equipo ha cargado los siguientes planes, gastos futuros e inversiones:
      ${JSON.stringify(plans, null, 2)}

      Basándote SOLAMENTE en esta lista, por favor dame:
      1.  Una recomendación clara sobre qué plan priorizar (basado en 'projectedAmount' y 'priority').
      2.  Un consejo sobre cómo separar las ganancias para financiar estos planes.
      3.  Una advertencia o consejo general sobre esta planificación (estilo Kiyosaki).

      Responde en español y usa formato Markdown.
    `;

    // 3. Llamar a la IA
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    // 4. Devolver la Respuesta
    logger.info("Asesoría generada con éxito.");
    response.status(200).json({ data: { advice: aiResponse } });

  } catch (error) {
    logger.error("Error al generar asesoría:", error);
    response.status(500).json({ data: { error: 'Error al contactar la IA.' } });
  }
};
app.post('/getFinancialAdvice', getFinancialAdviceLogic);


// --- INICIO DEL SERVIDOR (Sin cambios) ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Servidor escuchando en el puerto ${port}`);
});