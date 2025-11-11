// Importa los módulos
const logger = require("firebase-functions/logger");
const axios = require("axios"); 
const cors = require("cors");
const express = require("express");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { VertexAI } = require('@google-cloud/vertexai');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

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
const clientOptions = { apiEndpoint: 'us-documentai.googleapis.com' };
const client = new DocumentProcessorServiceClient(clientOptions);
const processorId = '773519c2b12aca46';
const projectId = 'web-de-group';
const location = 'us';
const docAIname = `projects/${projectId}/locations/${location}/processors/${processorId}`;

// === ¡NUEVO! FUNCIÓN HELPER CENTRALIZADA DE FLUJO DE FONDOS ===
/**
 * Calcula el flujo de fondos neto de 12 meses.
 * Esta función es el "cerebro" que usan ambas rutas de IA.
 */
const calculateCashFlow = async () => {
  logger.info("Iniciando cálculo de flujo de fondos...");
  
  // 1. Obtener todas las colecciones financieras
  const checksSnap = await db.collection('pendingChecks').where('status', '!=', 'cobrado').get();
  const payablesSnap = await db.collection('pendingPayables').get(); // Gastos Fijos (Alquiler, etc.)
  
  // ¡CORREGIDO! Usamos la colección 'accountsPayable' que existe en tu dashboard
  const accountsPayableSnap = await db.collection('accountsPayable').where('status', '==', 'pendiente').get(); // Cuentas por Pagar (Proveedores)

  const pendingChecks = checksSnap.docs.map(doc => doc.data());
  const fixedExpenses = payablesSnap.docs.map(doc => doc.data());
  const variableExpenses = accountsPayableSnap.docs.map(doc => doc.data());

  // 2. Calcular los 12 meses
  const monthlySummary = [];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(y, m + i, 1);
    const monthStart = new Date(y, m + i, 1);
    const monthEnd = new Date(y, m + i + 1, 0, 23, 59, 59);

    // A. Sumar ingresos (cheques) para este mes
    const ingresosEsteMes = pendingChecks
      .filter(check => check.fechaCobro && check.fechaCobro.toDate && check.fechaCobro.toDate() >= monthStart && check.fechaCobro.toDate() <= monthEnd)
      .reduce((sum, check) => sum + check.monto, 0);

    // B. Sumar gastos fijos para este mes
    const gastosFijosEsteMes = fixedExpenses
      .filter(expense => {
        if (!expense.startDate || !expense.startDate.toDate) return false;
        const expStart = expense.startDate.toDate();
        const expEnd = (expense.endDate && expense.endDate.toDate) ? expense.endDate.toDate() : null;
        return expStart <= monthEnd && (expEnd === null || expEnd >= monthStart);
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // C. Sumar gastos variables (Cuentas por Pagar) para este mes
    const gastosVariablesEsteMes = variableExpenses
      .filter(payable => {
        if (!payable.fechaVencimiento || !payable.fechaVencimiento.toDate) return false;
        const dueDate = payable.fechaVencimiento.toDate();
        return dueDate >= monthStart && dueDate <= monthEnd;
      })
      .reduce((sum, payable) => {
        const total = payable.montoTotal || 0;
        const pagado = payable.montoPagado || 0;
        return sum + (total - pagado); // Suma solo lo restante
      }, 0);
    
    // D. Calcular Total
    const totalGastos = gastosFijosEsteMes + gastosVariablesEsteMes;
    const netoEsteMes = ingresosEsteMes - totalGastos;
    
    monthlySummary.push({
      mes: monthDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
      ingresos: ingresosEsteMes,
      gastosFijos: gastosFijosEsteMes,
      gastosVariables: gastosVariablesEsteMes,
      neto: netoEsteMes
    });
  }
  
  // Devuelve todo el contexto
  return { monthlySummary, pendingChecks, fixedExpenses, variableExpenses };
};

// --- Helper para la ruta de Chat: Obtener Contexto Financiero ---
const getFinancialContext = async () => {
  const { monthlySummary, variableExpenses } = await calculateCashFlow();
  const plansSnap = await db.collection('plannedMovements').where('status', '==', 'Planeado').get();
  const plans = plansSnap.docs.map(doc => doc.data());
  return { monthlySummary, variableExpenses, plans };
};

// --- Helper para la ruta de Chat: Correr Búsqueda de Innovación ---
const runInnovationSearch = async (apiKey) => {
  const queries = [
    "a que apunta la innovación actual en argentina?",
    "Productos innovadores metalúrgicos para el agro argentina",
    "Accesorios metalúrgicos para drones agrícolas",
    "problemas agricultura de precisión argentina",
    "nuevos implementos agrícolas 2025",
    "startups AgTech Argentina"
  ];
  const serperUrl = 'https://google.serper.dev/search';
  const headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' };
  
  logger.info(`Iniciando ${queries.length} búsquedas en Serper...`);
  
  const searchPromises = queries.map(q => 
    axios.post(serperUrl, JSON.stringify({ q }), { headers })
  );
  
  let searchContext = "";
  try {
    const searchResults = await Promise.all(searchPromises);
    logger.info("Búsquedas en Serper completadas.");
    
    let snippets = [];
    searchResults.forEach((result, index) => {
      snippets.push(`\n--- Resultados de Búsqueda para: "${queries[index]}" ---`);
      if (result.data && result.data.organic) {
        result.data.organic.slice(0, 3).forEach(item => {
          snippets.push(`Título: ${item.title}\nResumen: ${item.snippet}\nFuente: ${item.link}\n`);
        });
      }
    });
    searchContext = snippets.join('\n');

  } catch (error) {
      logger.error("Error al llamar a Serper:", error.message);
      if (error.response && error.response.status === 403) {
        throw new Error("Clave de API de Búsqueda (Serper) inválida o expirada.");
      } else if (error.response && error.response.status === 402) {
        throw new Error("Límite de búsqueda gratuita (Serper) excedido.");
      } else {
        throw new Error("No se pudo contactar al servicio de búsqueda.");
      }
  }
  return searchContext;
};

// === RUTA 1: PROCESADOR DE FACTURAS (Sin cambios) ===
const processReceiptLogic = async (request, response) => {
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
app.post('/', processReceiptLogic);

// === RUTA 2: ASESOR FINANCIERO (A DEMANDA) ===
const getFinancialAdviceLogic = async (request, response) => {
  logger.info("Recibida solicitud de asesoría financiera INTELIGENTE.");
  
  try {
    const { monthlySummary, variableExpenses } = await calculateCashFlow();
    const plansSnap = await db.collection('plannedMovements').where('status', '==', 'Planeado').get();
    const plans = plansSnap.docs.map(doc => doc.data());
    
    if (plans.length === 0) {
      return response.status(400).json({ data: { error: "No hay movimientos planificados para analizar." } });
    }
    
    const prompt = `
      Eres un asesor financiero experto para una pequeña empresa (PYME) en Argentina, 
      con un estilo directo y práctico similar al de Robert Kiyosaki.
      
      Mi situación financiera actual es la siguiente:

      --- MI FLUJO DE FONDOS (Próximos 12 meses) ---
      (Ingresos por cheques vs. Gastos Fijos y Cuentas por Pagar)
      ${JSON.stringify(monthlySummary, null, 2)}
      --- FIN DEL FLUJO DE FONDOS ---

      --- MIS CUENTAS POR PAGAR (Proveedores) ---
      (Estas son las deudas variables que componen el flujo de fondos)
      ${JSON.stringify(variableExpenses, null, 2)}
      --- FIN CUENTAS POR PAGAR ---

      --- MIS PROYECTOS E INVERSIONES PLANEADAS ---
      (Esto es en lo que quiero gastar el dinero "neto" disponible)
      ${JSON.stringify(plans, null, 2)}
      --- FIN DE MIS PROYECTOS ---

      Basándote en este panorama COMPLETO, por favor dame:
      1.  **Análisis de Flujo de Fondos:** ¿Cuándo es el mejor mes para hacer la inversión más grande (basado en mi "neto" positivo)?
      2.  **Gestión de Deuda:** Viendo mis cuentas por pagar, ¿cuál debería priorizar? ¿Aconsejas pagar total o parcialmente alguna?
      3.  **Prioridad de Proyectos:** Viendo el flujo de fondos y las deudas, ¿qué proyecto debo priorizar?
      4.  **Advertencia (Estilo Kiyosaki):** Un consejo general sobre esta planificación.

      Responde en español y usa formato Markdown.
    `;

    logger.info(`Llamando al modelo ${model} con contexto completo...`);
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    logger.info("Asesoría INTELIGENTE generada con éxito.");
    response.status(200).json({ data: { advice: aiResponse } });

  } catch (error) {
    logger.error("Error al generar asesoría:", error.message);
    response.status(500).json({ data: { error: 'Error al contactar la IA. Revisa los logs.' } });
  }
};
app.post('/getFinancialAdvice', getFinancialAdviceLogic);


// === RUTA 3: ASESOR DIARIO (PROACTIVO) - ¡ACTUALIZADA! ===
const runDailyAdviceLogic = async (request, response) => {
  logger.info("Recibida solicitud de CONSEJO DIARIO (GUARDIÁN).");
  
  try {
    // 1. OBTENER DATOS EXTERNOS (DÓLAR)
    let dolarData;
    try {
      const dolarResponse = await axios.get('https://dolarapi.com/v1/dolares');
      dolarData = dolarResponse.data.map(d => ({
        tipo: d.nombre,
        compra: d.compra,
        venta: d.venta
      }));
    } catch (apiError) {
      logger.error("Error al llamar a DolarApi.com:", apiError.message);
      dolarData = "No se pudieron obtener las cotizaciones del dólar hoy.";
    }

    // 2. OBTENER FLUJO DE FONDOS COMPLETO
    const { monthlySummary, variableExpenses } = await calculateCashFlow();
    
    // Chequear si hay peligro
    const deudasUrgentes = variableExpenses.filter(deuda => {
        if (!deuda.fechaVencimiento || !deuda.fechaVencimiento.toDate) return false;
        const diasDif = (deuda.fechaVencimiento.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return diasDif <= 7 && diasDif >= 0; // Vence en los próximos 7 días
    });

    // 3. GENERAR EL PROMPT DEL GUARDIÁN
    const prompt = `
      Eres un "Guardián Financiero" experto para una PYME en Argentina. Tu misión es priorizar el peligro.
      Hoy es ${new Date().toLocaleDateString('es-AR')}.

      --- MI FLUJO DE FONDOS (Próximos 12 meses) ---
      ${JSON.stringify(monthlySummary, null, 2)}
      --- FIN DEL FLUJO DE FONDOS ---

      --- MIS DEUDAS URGENTES (Vencen en 7 días) ---
      ${deudasUrgentes.length > 0 ? JSON.stringify(deudasUrgentes, null, 2) : "No hay deudas urgentes."}
      --- FIN DEUDAS URGENTES ---

      --- CONTEXTO DE MERCADO (HOY) ---
      ${JSON.stringify(dolarData, null, 2)}
      --- FIN CONTEXTO DE MERCADO ---

      **Instrucciones Clave (Priorizadas):**
      1.  **PRIORIDAD 1 (FLUJO DE FONDOS):** Revisa el flujo de fondos. Si detectas un "neto" negativo en los próximos 3-4 meses, lanza una **¡ALERTA DE FLUJO DE FONDOS!** sobre ese mes.
      2.  **PRIORIDAD 2 (DEUDAS URGENTES):** Si no hay alerta de flujo, revisa las deudas urgentes. Si hay alguna, lanza una **¡ALERTA DE VENCIMIENTO!** y aconseja pagarla.
      3.  **PRIORIDAD 3 (CONSEJO DE DÓLAR):** Si no hay alertas, dame un consejo normal sobre el dólar de hoy.

      Responde en español y usa formato Markdown. Sé directo y breve.
    `;

    // 4. Llamar a la IA
    logger.info(`Llamando a ${model} para el consejo del guardián...`);
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    // 5. Devolver la Respuesta
    logger.info("Consejo del guardián generado con éxito.");
    response.status(200).json({ data: { dailyAdvice: aiResponse } });

  } catch (error) {
    logger.error("Error al generar consejo diario:", error.message);
    response.status(500).json({ data: { error: 'Error al contactar la IA. Revisa los logs.' } });
  }
};
app.post('/runDailyAdvice', runDailyAdviceLogic); 


// === RUTA 4: RADAR DE INNOVACIÓN (I+D) ===
const runInnovationReportLogic = async (request, response) => {
  logger.info("Recibida solicitud de REPORTE DE INNOVACIÓN.");

  try {
    const apiKey = request.body.apiKey; 
    if (!apiKey) {
      return response.status(400).json({ data: { error: "No se proporcionó la clave de API (apiKey)." } });
    }
    
    // Llamamos al helper de búsqueda
    const searchContext = await runInnovationSearch(apiKey);

    // 5. Generar el Super-Prompt para Gemini
    const prompt = `
      Eres un Director de I+D (Investigación y Desarrollo) experto en metalúrgica para el agro en Argentina.
      Acabo de realizar las siguientes búsquedas en Google en tiempo real:
      
      --- INICIO DE DATOS DE BÚSQUEDA ---
      ${searchContext}
      --- FIN DE DATOS DE BÚSQUEDA ---
      
      Analiza estos artículos y resúmenes. Basado *únicamente* en esta información fresca de hoy, dame un reporte de innovación que incluya:
      1.  **Tendencia Principal:** ¿Cuál es la tendencia tecnológica más fuerte que detectas en el agro argentino?
      2.  **Problemas No Resueltos:** ¿Qué problemas parecen tener los productores (basado en las búsquedas)?
      3.  **Oportunidades de Producto:** Dame 3 ideas de productos o accesorios (ej: "un carro para drones", "un nuevo tipo de tolva") que una metalúrgica podría diseñar y fabricar para solucionar esos problemas. Sé específico.
      
      Responde en español y usa formato Markdown.
    `;

    // 6. Llamar a la IA
    logger.info(`Llamando a ${model} para el reporte de innovación...`);
    const result = await generativeModel.generateContent(prompt);
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    // 7. Devolver la Respuesta
    logger.info("Reporte de innovación generado con éxito.");
    response.status(200).json({ data: { report: aiResponse } });

  } catch (error) {
    logger.error("Error al generar reporte de innovación:", error.message);
    if (error.message.includes("Clave de API")) {
      response.status(403).json({ data: { error: 'Clave de API de Búsqueda inválida o expirada.' } });
    } else if (error.message.includes("Límite de búsqueda")) {
       response.status(402).json({ data: { error: 'Límite de búsqueda gratuita excedido.' } });
    } else {
      logger.error("Detalles del error de IA/Búsqueda:", JSON.stringify(error, null, 2));
      response.status(500).json({ data: { error: 'Error al contactar la IA o el servicio de búsqueda.' } });
    }
  }
};
app.post('/runInnovationReport', runInnovationReportLogic);


// === ¡NUEVA RUTA CEREBRO! RUTA 5: CHATBOT ASESOR ===
const chatLogic = async (request, response) => {
  const { message, history, apiKey } = request.body;
  logger.info(`Recibida solicitud de CHAT: ${message}`);

  try {
    // --- 1. Definir el "Cerebro" de la IA ---
    const systemPrompt = `
      Eres un Co-piloto experto para una PYME metalúrgica del agro en Argentina.
      Tu nombre es "Co-piloto DE Group".
      Eres directo, práctico y analítico (estilo Robert Kiyosaki).
      Tienes tres habilidades especiales:
      1.  **Analista Financiero:** Puedes acceder al flujo de fondos interno de la empresa.
      2.  **Investigador de I+D:** Puedes buscar en Google tendencias de innovación.
      3.  **Asesor de Negocios:** Puedes guiar al usuario con preguntas para analizar nuevas ideas.
      
      **Instrucciones de Intención:**
      -   Si el usuario te pide un consejo financiero o sobre un proyecto (ej: "analizá mi flujo de fondos", "priorizá mis proyectos", "pagá esta deuda"), 
          SIEMPRE debes responder *únicamente* con la palabra: "CONTEXTO_FINANCIERO".
      -   Si el usuario te pide investigar algo (ej: "investigá innovación", "qué hay de nuevo en drones", "buscá oportunidades"), 
          SIEMPRE debes responder *únicamente* con la palabra: "CONTEXTO_INNOVACION".
      -   Si el usuario pregunta por un nuevo negocio ("abrir otro local", "invertir en otro rubro"),
          tu trabajo es hacerle preguntas de seguimiento para entender la idea.
          Ejemplo: "Interesante. Para analizarlo, necesito más datos: ¿Cuál es la inversión inicial? ¿Cuál es el retorno de inversión esperado? ¿Cuánto tiempo tuyo demandará?"
      -   Para cualquier otra charla, solo responde la pregunta.
    `;

    // --- 2. Analizar la Intención del Usuario (Usando a Gemini) ---
    logger.info("Determinando intención...");
    const chat = generativeModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Entendido. Soy el Co-piloto DE Group. ¿En qué te puedo ayudar hoy?" }] },
        // Añadimos el historial real de la conversación
        ...history.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      ]
    });
    
    // Enviamos el mensaje del usuario para que la IA lo clasifique
    let result = await chat.sendMessage(message);
    let aiResponse = result.response.candidates[0].content.parts[0].text;
    
    // --- 3. Reaccionar a la Intención ---

    // Intención 1: Análisis Financiero
    if (aiResponse === "CONTEXTO_FINANCIERO") {
      logger.info("Intención detectada: Análisis Financiero.");
      const { monthlySummary, variableExpenses } = await calculateCashFlow();
      const plansSnap = await db.collection('plannedMovements').where('status', '==', 'Planeado').get();
      const plans = plansSnap.docs.map(doc => doc.data());

      const finalPrompt = `
        Este es el contexto financiero completo:
        FLUJO DE FONDOS 12 MESES: ${JSON.stringify(monthlySummary, null, 2)}
        CUENTAS POR PAGAR (DEUDAS): ${JSON.stringify(variableExpenses, null, 2)}
        PROYECTOS PLANEADOS: ${JSON.stringify(plans, null, 2)}

        Pregunta original del usuario: "${message}"

        Por favor, responde a la pregunta original del usuario basándote en este contexto.
      `;
      result = await chat.sendMessage(finalPrompt);
      aiResponse = result.response.candidates[0].content.parts[0].text;
    }

    // Intención 2: Investigación (I+D)
    else if (aiResponse === "CONTEXTO_INNOVACION") {
      logger.info("Intención detectada: Investigación I+D.");
      if (!apiKey) {
        // Si no hay API key, le respondemos amablemente.
        aiResponse = "Para investigar en la web, por favor ingresa tu Clave de API de Búsqueda (Serper.dev) en el campo de abajo y vuelve a preguntar.";
      } else {
        try {
          const searchContext = await runInnovationSearch(apiKey);
          const innovationPrompt = `
            Este es el contexto de búsqueda (resultados de Google en tiempo real):
            ${searchContext}

            Pregunta original del usuario: "${message}"
            
            Basado en los resultados de la búsqueda, responde al usuario y
            sugiere 3 ideas de productos metalúrgicos innovadores.
          `;
          
          result = await chat.sendMessage(innovationPrompt);
          aiResponse = result.response.candidates[0].content.parts[0].text;
        } catch (searchError) {
           logger.error("Error en la búsqueda de Serper:", searchError.message);
           aiResponse = `Lo siento, ocurrió un error al investigar: ${searchError.message}`;
        }
      }
    }

    // Intención 3: Charla General (la respuesta ya está en aiResponse)
    else {
      logger.info("Intención detectada: Charla General / Nuevo Negocio.");
    }

    // 4. Devolver la respuesta final
    logger.info("Respuesta de Chat generada.");
    return response.status(200).json({ data: { reply: aiResponse } });

  } catch (error) {
    logger.error("Error en la lógica de Chat:", error.message);
    logger.error("Detalles del error:", JSON.stringify(error, null, 2));
    response.status(500).json({ data: { error: 'Error en el cerebro del Chatbot. Revisa los logs.' } });
  }
};
app.post('/chat', chatLogic); // ¡Registramos la nueva ruta CEREBRO!


// --- INICIO DEL SERVIDOR (Sin cambios) ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Servidor escuchando en el puerto ${port}`);
});