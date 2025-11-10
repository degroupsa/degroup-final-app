// Importa los módulos
const logger = require("firebase-functions/logger");
const axios = require("axios"); // Ya lo teníamos, perfecto
const cors = require("cors");
const express = require("express");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// --- Importar Vertex AI (Gemini) ---
const { VertexAI } = require('@google-cloud/vertexai');

// --- INICIALIZACIÓN DE SERVICIOS ---
initializeApp();
const db = getFirestore(); // Base de datos
const app = express(); // Servidor web
app.use(express.json());
app.use(cors({ origin: true }));


// --- Configuración de Vertex AI ---
const vertex_ai = new VertexAI({ 
  project: 'web-de-group', 
  location: 'us-central1'
});
const model = 'gemini-2.0-flash'; // El modelo que sabemos que funciona

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
    // ... (Tu lógica de processReceiptLogic - colapsada por brevedad) ...
    const imageUrl = request.body.data?.imageUrl;
    if (!imageUrl) {
      logger.error("Llamada sin 'imageUrl'");
      return response.status(400).json({ data: { error: 'No se proporcionó "imageUrl".' } });
    }
    logger.info(`Procesando imagen (público): ${imageUrl}`);
    try {
      const [result] = await client.processDocument({
        name: docAIname,
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


// === RUTA 2: ASESOR FINANCIERO (A DEMANDA) ===
const getFinancialAdviceLogic = async (request, response) => {
  logger.info("Recibida solicitud de asesoría financiera INTELIGENTE.");
  
  try {
    // --- 1. RECOLECTAR TODO EL CONTEXTO ---
    const plansSnap = await db.collection('plannedMovements').where('status', '==', 'Planeado').get();
    const checksSnap = await db.collection('pendingChecks').where('status', '!=', 'cobrado').get();
    const payablesSnap = await db.collection('pendingPayables').get();

    const plans = plansSnap.docs.map(doc => doc.data());
    const pendingChecks = checksSnap.docs.map(doc => doc.data());
    const fixedExpenses = payablesSnap.docs.map(doc => doc.data());
    
    if (plans.length === 0) {
      return response.status(400).json({ data: { error: "No hay movimientos planificados para analizar." } });
    }

    // --- 2. CALCULAR EL FLUJO DE FONDOS (Tu lógica de 12 meses) ---
    const monthlySummary = [];
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(y, m + i, 1);
      const monthStart = new Date(y, m + i, 1);
      const monthEnd = new Date(y, m + i + 1, 0, 23, 59, 59);

      const ingresosEsteMes = pendingChecks
        .filter(check => {
          if (!check.fechaCobro || !check.fechaCobro.toDate) return false;
          const checkDate = check.fechaCobro.toDate();
          return checkDate >= monthStart && checkDate <= monthEnd;
        })
        .reduce((sum, check) => sum + check.monto, 0);

      const gastosEsteMes = fixedExpenses
        .filter(expense => {
          if (!expense.startDate || !expense.startDate.toDate) return false;
          const expStart = expense.startDate.toDate();
          const expEnd = (expense.endDate && expense.endDate.toDate) ? expense.endDate.toDate() : null;
          return expStart <= monthEnd && (expEnd === null || expEnd >= monthStart);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const netoEsteMes = ingresosEsteMes - gastosEsteMes;
      
      monthlySummary.push({
        mes: monthDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
        ingresos: ingresosEsteMes,
        gastosFijos: gastosEsteMes,
        neto: netoEsteMes
      });
    }
    
    // --- 3. GENERAR EL SUPER-PROMPT ---
    const prompt = `
      Eres un asesor financiero experto para una pequeña empresa (PYME) en Argentina, 
      con un estilo directo y práctico similar al de Robert Kiyosaki.
      
      Mi situación financiera actual es la siguiente:

      --- MI FLUJO DE FONDOS (Próximos 12 meses) ---
      (Muestra los ingresos por cheques vs. los gastos fijos mensuales)
      ${JSON.stringify(monthlySummary, null, 2)}
      --- FIN DEL FLUJO DE FONDOS ---

      --- MIS PROYECTOS E INVERSIONES PLANEADAS ---
      (Esto es en lo que quiero gastar el dinero "neto" disponible)
      ${JSON.stringify(plans, null, 2)}
      --- FIN DE MIS PROYECTOS ---

      Basándote en este panorama COMPLETO (el flujo de fondos y los proyectos), por favor dame:
      1.  Una recomendación clara sobre qué plan/proyecto priorizar.
      2.  Analiza mi flujo de fondos. ¿Cuándo es el mejor mes para hacer la inversión más grande (basado en mi "neto" positivo)?
      3.  Una advertencia o consejo general sobre esta planificación (estilo Kiyosaki).

      Responde en español y usa formato Markdown.
    `;

    // 4. Llamar a la IA
    logger.info(`Llamando al modelo ${model} con contexto completo...`);
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    // 5. Devolver la Respuesta
    logger.info("Asesoría INTELIGENTE generada con éxito.");
    response.status(200).json({ data: { advice: aiResponse } });

  } catch (error) {
    logger.error("Error al generar asesoría:", error.message);
    logger.error("Detalles del error de IA:", JSON.stringify(error, null, 2));
    response.status(500).json({ data: { error: 'Error al contactar la IA. Revisa los logs.' } });
  }
};
app.post('/getFinancialAdvice', getFinancialAdviceLogic);


// === ¡NUEVA RUTA! RUTA 3: ASESOR DIARIO (PROACTIVO) ===
const runDailyAdviceLogic = async (request, response) => {
  logger.info("Recibida solicitud de CONSEJO DIARIO.");
  
  try {
    // --- 1. OBTENER DATOS EXTERNOS (DÓLAR) ---
    // Usamos axios para llamar a la API gratuita DolarApi.com
    let dolarData;
    try {
      const dolarResponse = await axios.get('https://dolarapi.com/v1/dolares');
      // Filtramos solo los que nos interesan para no gastar tokens
      dolarData = dolarResponse.data.map(d => ({
        tipo: d.nombre,
        compra: d.compra,
        venta: d.venta
      }));
    } catch (apiError) {
      logger.error("Error al llamar a DolarApi.com:", apiError.message);
      // No fallamos la solicitud, solo le decimos a la IA que no hay datos del dólar
      dolarData = "No se pudieron obtener las cotizaciones del dólar hoy.";
    }

    // --- 2. OBTENER DATOS INTERNOS (Cheques y Gastos) ---
    // No necesitamos el flujo de 12 meses, solo el contexto general
    const checksSnap = await db.collection('pendingChecks').where('status', '!=', 'cobrado').get();
    const payablesSnap = await db.collection('pendingPayables').get();

    const pendingChecks = checksSnap.docs.map(doc => doc.data());
    const fixedExpenses = payablesSnap.docs.map(doc => doc.data());

    // --- 3. GENERAR EL PROMPT DIARIO ---
    const prompt = `
      Eres un asesor financiero experto para una pequeña empresa (PYME) en Argentina.
      Hoy es ${new Date().toLocaleDateString('es-AR')}.

      --- CONTEXTO DE MERCADO (HOY) ---
      ${JSON.stringify(dolarData, null, 2)}
      --- FIN CONTEXTO DE MERCADO ---

      --- MI SITUACIÓN INTERNA ---
      Tengo ${pendingChecks.length} cheques pendientes de cobro.
      Tengo ${fixedExpenses.length} gastos fijos programados.
      --- FIN SITUACIÓN INTERNA ---

      Basado en las cotizaciones del dólar de HOY y mi situación, dame:
      1.  Un (1) consejo o advertencia MUY corta y accionable para el día.
      2.  La recomendación debe ser directa y relevante para una PYME.
      
      Ejemplo de respuesta (si el dólar sube): 
      "El Dólar Blue subió. Si tenés que pagar a proveedores en dólares, esperá a una corrección. Si tenés cheques para cobrar, hacelo y cubrite."

      Ejemplo de respuesta (si el dólar baja):
      "El MEP/Blue está en baja. Buen día para cubrirse, comprar dólares para futuros pagos de importación o adelantar pagos dolarizados."
      
      Responde en español y usa formato Markdown. Sé breve.
    `;

    // 4. Llamar a la IA
    logger.info(`Llamando a ${model} para el consejo diario...`);
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    // 5. Devolver la Respuesta
    logger.info("Consejo diario generado con éxito.");
    response.status(200).json({ data: { dailyAdvice: aiResponse } });

  } catch (error) {
    logger.error("Error al generar consejo diario:", error.message);
    logger.error("Detalles del error de IA:", JSON.stringify(error, null, 2));
    response.status(500).json({ data: { error: 'Error al contactar la IA. Revisa los logs.' } });
  }
};
app.post('/runDailyAdvice', runDailyAdviceLogic); // ¡Registramos la nueva ruta!


// --- INICIO DEL SERVIDOR (Sin cambios) ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Servidor escuchando en el puerto ${port}`);
});