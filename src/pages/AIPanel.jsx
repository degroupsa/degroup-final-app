import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config.js'; // Asegúrate que la extensión .js esté
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AIPanel.module.css'; // Apunta al CSS unificado
import { FaTrash, FaPlus, FaBrain, FaSearch, FaKey, FaPaperPlane, FaUser, FaRobot } from 'react-icons/fa'; // Íconos para el chat

// Helper para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
};

// URL de nuestro backend
const cloudRunUrl = 'https://processreceipt-505795840819.us-central1.run.app';

function AIPanel() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- Estados del Formulario de Planes ---
  const [newPlan, setNewPlan] = useState({
    description: '',
    projectedAmount: '',
    priority: 'Media',
    type: 'Gasto Futuro',
  });

  // --- Estados de la IA ---
  // Módulo 1: Consejo Diario
  const [dailyAdvice, setDailyAdvice] = useState('');
  const [isDailyLoading, setIsDailyLoading] = useState(true);
  
  // Módulo 2: Asesoría a Demanda
  const [onDemandAdvice, setOnDemandAdvice] = useState('');
  const [isOnDemandLoading, setIsOnDemandLoading] = useState(false);
  
  // Módulo 3: Radar de Innovación
  const [innovationReport, setInnovationReport] = useState('');
  const [isInnovationLoading, setIsInnovationLoading] = useState(false);
  const [apiKey, setApiKey] = useState(''); // Clave de Serper (compartida)

  // --- ¡NUEVO! Módulo 4: Chat Asesor ---
  const [chatMessages, setChatMessages] = useState([]); // Historial del chat
  const [chatNewMessage, setChatNewMessage] = useState(''); // El texto que el usuario está escribiendo
  const [isChatLoading, setIsChatLoading] = useState(false); 
  const chatEndRef = useRef(null); // Ref para auto-scroll


  // --- Carga Inicial: Planes y Consejo del Día ---
  useEffect(() => {
    // Carga los planes
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const plansQuery = query(collection(db, 'plannedMovements'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(plansQuery);
        setPlans(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error al cargar planes:", error);
        toast.error("No se pudieron cargar los planes.");
      }
      setLoading(false);
    };

    // Carga el consejo diario (Guardián)
    const fetchDailyAdvice = async () => {
      setIsDailyLoading(true);
      setDailyAdvice('');
      const dailyUrl = `${cloudRunUrl}/runDailyAdvice`;
      try {
        const response = await fetch(dailyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.data?.error || 'Error en la respuesta de la IA');
        }
        setDailyAdvice(result.data.dailyAdvice);
      } catch (error) {
        console.error("Error al cargar consejo diario:", error);
        setDailyAdvice('No se pudo cargar el consejo de hoy. Revisa los logs.');
      } finally {
        setIsDailyLoading(false);
      }
    };

    fetchPlans();
    fetchDailyAdvice();
  }, []); // El array vacío asegura que se ejecute solo una vez

  // --- Auto-scroll al final del chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);


  // --- (Handlers del formulario de planes - Sin cambios) ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (!newPlan.description || !newPlan.projectedAmount) {
      return toast.error('Completa la descripción y el monto.');
    }
    toast.loading('Guardando plan...');
    try {
      await addDoc(collection(db, 'plannedMovements'), {
        ...newPlan,
        projectedAmount: Number(newPlan.projectedAmount),
        status: 'Planeado',
        createdAt: serverTimestamp(),
      });
      toast.dismiss();
      toast.success('Plan guardado.');
      setNewPlan({
        description: '',
        projectedAmount: '',
        priority: 'Media',
        type: 'Gasto Futuro',
      });
      fetchPlans(); 
    } catch (error) {
      toast.dismiss();
      toast.error('Error al guardar el plan.');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este plan?')) return;
    toast.loading('Eliminando...');
    try {
      await deleteDoc(doc(db, 'plannedMovements', id));
      toast.dismiss();
      toast.success('Plan eliminado.');
      fetchPlans(); 
    } catch (error) {
      toast.dismiss();
      toast.error('Error al eliminar.');
    }
  };
  // --- (Fin Handlers de planes) ---


  // --- Handler Asesoría a Demanda (Flujo de Fondos) ---
  const handleGetOnDemandAdvice = async () => {
    setIsOnDemandLoading(true);
    setOnDemandAdvice('');
    
    const adviceUrl = `${cloudRunUrl}/getFinancialAdvice`;
    try {
      const response = await fetch(adviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) 
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.data?.error || 'Error en la respuesta de la IA');
      }
      setOnDemandAdvice(result.data.advice);
    } catch (error) {
      console.error("Error al llamar a la IA (Demanda):", error);
      toast.error(`Error de IA: ${error.message}`);
      setOnDemandAdvice('No se pudo obtener la recomendación. Revisa los logs.');
    } finally {
      setIsOnDemandLoading(false);
    }
  };

  // --- Handler Radar de Innovación (I+D) ---
  const handleRunInnovationReport = async () => {
    if (!apiKey) {
      toast.error("Por favor, ingresa tu Clave de API de Búsqueda (Serper.dev).");
      return;
    }
    
    setIsInnovationLoading(true);
    setInnovationReport('');
    toast.loading('Investigando tendencias en vivo... (Esto puede tardar 30s)');

    const innovationUrl = `${cloudRunUrl}/runInnovationReport`;

    try {
      const response = await fetch(innovationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey }) 
      });
      
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) throw new Error('Clave de API de Búsqueda inválida o expirada.');
        if (response.status === 402) throw new Error('Límite de búsqueda gratuita excedido.');
        throw new Error(result.data?.error || 'Error en la respuesta del servidor');
      }

      setInnovationReport(result.data.report);
      toast.dismiss();
      toast.success("Reporte de Innovación generado.");

    } catch (error) {
      toast.dismiss();
      console.error("Error al generar reporte de innovación:", error);
      toast.error(`Error de I+D: ${error.message}`);
      setInnovationReport('No se pudo generar el reporte. Revisa la consola y tu Clave de API.');
    } finally {
      setIsInnovationLoading(false);
    }
  };
  
  // --- ¡NUEVO! Handler para el Chat Asesor ---
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatNewMessage.trim()) return;

    const lowerMessage = chatNewMessage.toLowerCase();
    if ((lowerMessage.includes('investiga') || lowerMessage.includes('innovación') || lowerMessage.includes('oportunidades')) && !apiKey) {
      toast.error("Para investigar, por favor ingresa tu Clave de API de Serper.");
      return;
    }

    const userMessage = { sender: 'user', text: chatNewMessage };
    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory); 
    setChatNewMessage(''); 
    setIsChatLoading(true); 

    const chatUrl = `${cloudRunUrl}/chat`;

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatNewMessage,
          history: newHistory.slice(0, -1), // Envía el historial SIN el último mensaje
          apiKey: apiKey,   
        }) 
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.data?.error || 'Error en la respuesta de la IA');
      }

      const aiMessage = { sender: 'ai', text: result.data.reply };
      setChatMessages(prev => [...prev, aiMessage]); 

    } catch (error) {
      console.error("Error al chatear con la IA:", error);
      toast.error(`Error de IA: ${error.message}`);
      const errorMessage = { sender: 'ai', text: `Lo siento, ocurrió un error: ${error.message}` };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };


  return (
    <div className={styles.panelContainer}>
      <h1 className={styles.header}>Co-piloto Financiero de IA</h1>
      
      <div className={styles.grid}>
        {/* --- Columna 1: Carga de Planes (Sin cambios) --- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Planificador de Movimientos</h2>
          <form onSubmit={handleSubmitPlan}>
            <div className={styles.formGroup}>
              <label>Descripción</label>
              <input
                type="text"
                name="description"
                value={newPlan.description}
                onChange={handleInputChange}
                placeholder="Ej: Comprar nueva soldadora TIG"
              />
            </div>
            {/* ... (resto del formulario de planes colapsado) ... */}
            <div className={styles.formGroup}>
              <label>Monto Proyectado</label>
              <input type="number" name="projectedAmount" value={newPlan.projectedAmount} onChange={handleInputChange} placeholder="Ej: 3000000" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Prioridad</label>
                <select name="priority" value={newPlan.priority} onChange={handleInputChange}>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Tipo</label>
                <select name="type" value={newPlan.type} onChange={handleInputChange}>
                  <option value="Gasto Futuro">Gasto Futuro</option>
                  <option value="Inversión Proyecto">Inversión Proyecto</option>
                  <option value="Ahorro">Ahorro</option>
                </select>
              </div>
            </div>
            <button type="submit" className={styles.submitButton}>
              <FaPlus /> Agregar Plan
            </button>
          </form>
          
          <hr className={styles.divider} />

          <h3 className={styles.listTitle}>Planes Cargados</h3>
          <div className={styles.planList}>
            {loading ? <p>Cargando planes...</p> : plans.length === 0 ? <p>No hay planes cargados.</p> : (
              plans.map(plan => (
                <div key={plan.id} className={`${styles.planItem} ${styles[plan.priority.toLowerCase()]}`}>
                  <div className={styles.planDetails}>
                    <span className={styles.planDescription}>{plan.description}</span>
                    <span className={styles.planAmount}>{formatCurrency(plan.projectedAmount)}</span>
                  </div>
                  <button onClick={() => handleDeletePlan(plan.id)} className={styles.deleteButton}>
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Columna 2: Módulos de IA (REDISEÑADA con 4 secciones) --- */}
        <div className={styles.card}>
          
          {/* --- 1. Consejo Diario (Automático) --- */}
          <h2 className={styles.cardTitle}>Consejo del Día</h2>
          <div className={styles.aiAdviceArea} style={{marginBottom: '1rem', minHeight: '100px'}}>
            {isDailyLoading && <div className={styles.spinner}></div>}
            {dailyAdvice ? (
              <pre className={styles.aiText}>{dailyAdvice}</pre>
            ) : (
              !isDailyLoading && <p className={styles.aiPlaceholder}>No se pudo cargar el consejo de hoy.</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* --- 2. Asesoría a Demanda (Botón) --- */}
          <h2 className={styles.cardTitle}>Análisis Rápido</h2>
          <button 
            className={styles.aiButton} 
            onClick={handleGetOnDemandAdvice} 
            disabled={isOnDemandLoading || plans.length === 0} 
            title={plans.length === 0 ? "Debes cargar al menos un plan para pedir consejo" : "Analizar flujo de fondos"}
          >
            <FaBrain /> {isOnDemandLoading ? 'Analizando...' : 'Analizar mi Flujo de Fondos'}
          </button>
          {onDemandAdvice && ( // Solo muestra el área si hay respuesta
            <div className={styles.aiAdviceArea} style={{marginBottom: '1rem'}}>
              {isOnDemandLoading && <div className={styles.spinner}></div>}
              <pre className={styles.aiText}>{onDemandAdvice}</pre>
            </div>
          )}

          <hr className={styles.divider} />
          
          {/* --- 3. Radar de Innovación --- */}
          <h2 className={styles.cardTitle}>Radar de Innovación (I+D)</h2>
          <button 
            className={`${styles.aiButton} ${styles.innovationButton}`} 
            onClick={handleRunInnovationReport} 
            disabled={isInnovationLoading || !apiKey}
            title={!apiKey ? "Ingresa una clave de API para buscar" : "Buscar oportunidades en vivo"}
          >
            <FaSearch /> {isInnovationLoading ? 'Investigando...' : 'Buscar Oportunidades'}
          </button>
          {innovationReport && ( // Solo muestra el área si hay respuesta
             <div className={styles.aiAdviceArea} style={{marginBottom: '1rem'}}>
              {isInnovationLoading && <div className={styles.spinner}></div>}
              <pre className={styles.aiText}>{innovationReport}</pre>
            </div>
          )}
         
          <hr className={styles.divider} />

          {/* --- ¡NUEVO! 4. Chat Asesor --- */}
          <h2 className={styles.cardTitle}>Asesor Interactivo</h2>
          <p className={styles.aiChatSubtitle}>
            Hacé preguntas complejas. (Ej: "Quiero abrir un local nuevo", "cuándo me conviene comprar la soldadora?", "investigá sobre...")
          </p>
          
          <div className={styles.chatHistory} style={{height: '300px', marginBottom: '1rem'}}>
            {/* Mensaje inicial del chat */}
            {chatMessages.length === 0 && !isChatLoading && (
              <p className={styles.aiPlaceholder} style={{textAlign: 'center', margin: 'auto'}}>Inicia una conversación...</p>
            )}

            {chatMessages.map((msg, index) => (
              <div key={index} className={`${styles.chatMessage} ${msg.sender === 'user' ? styles.userMessage : styles.aiMessage}`}>
                <span className={styles.messageIcon}>{msg.sender === 'user' ? <FaUser /> : <FaRobot />}</span>
                <pre className={styles.messageText}>{msg.text}</pre>
              </div>
            ))}
            {isChatLoading && (
              <div className={`${styles.chatMessage} ${styles.aiMessage}`}>
                <span className={styles.messageIcon}><FaRobot /></span>
                <div className={styles.spinner}></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className={styles.chatInputArea} onSubmit={handleSendChatMessage}>
            <input
              type="text"
              value={chatNewMessage}
              onChange={(e) => setChatNewMessage(e.target.value)}
              placeholder={isChatLoading ? "IA está pensando..." : "Escribe tu consulta aquí..."}
              disabled={isChatLoading}
            />
            <button type="submit" disabled={isChatLoading || !chatNewMessage.trim()}>
              <FaPaperPlane />
            </button>
          </form>

          {/* Campo para la Clave de API (compartido) */}
          <div className={styles.apiKeyFormGroup} style={{ marginTop: '1.5rem' }}>
            <label htmlFor="apiKeyInput">
              <FaKey /> Clave de API (I+D y Chat)
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pega tu clave de Serper.dev aquí"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://serper.dev/api-key" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.apiKeyHelpLink}
            >
              Obtener clave de búsqueda gratis
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AIPanel;