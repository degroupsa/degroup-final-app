import React from 'react';
import { 
  FaCheckCircle, FaRegCircle, FaSpinner,
  FaClipboardCheck, FaIndustry, FaWrench, FaBroom,
  FaPaintBrush, FaTools, FaSearch, FaShippingFast, FaFlagCheckered
} from 'react-icons/fa';
import styles from './Timeline.module.css';

// --- LISTA DE ETAPAS OFICIAL Y UNIFICADA ---
const PRODUCTION_STEPS = [
  'Pedido Recibido',
  'Ingreso a Planta',
  'Corte y Plegado',
  'En Planta',
  'Soldadura del Equipo', 
  'Limpieza', 
  'Pintado', 
  'Armado', 
  'Control de Calidad', 
  'Finalizado'
];

const iconMap = {
  'recibido': <FaClipboardCheck />, 'planta': <FaIndustry />, 'corte': <FaWrench />,
  'soldadura': <FaWrench />, 'limpieza': <FaBroom />,
  'pintado': <FaPaintBrush />, 'armado': <FaTools />, 'calidad': <FaSearch />,
  'finalizado': <FaFlagCheckered />, 'entrega': <FaShippingFast />,
};

const getStepIcon = (step) => {
  const stepLower = step.toLowerCase();
  for (const key in iconMap) {
    if (stepLower.includes(key)) {
      return iconMap[key];
    }
  }
  return <FaRegCircle />;
};

const Timeline = ({ history, currentStatus, productionSteps }) => {
  const stepsToUse = productionSteps || PRODUCTION_STEPS;
  const currentStepIndex = stepsToUse.indexOf(currentStatus);
  const progressPercent = (currentStepIndex / (stepsToUse.length - 1)) * 100;

  return (
    <div className={styles.timelineContainer}>
      <div 
        className={styles.timeline}
        style={{ '--progress-percent': `${progressPercent}%` }}
      >
        <div className={styles.progressLine} />
        {stepsToUse.map((step, index) => {
          const historyEntry = (history || []).find(h => h.stepName === step);
          const isCompleted = !!historyEntry;
          const isCurrent = (step === currentStatus);
          
          const statusClass = isCompleted ? styles.completed : isCurrent ? styles.current : styles.pending;
          const stepIcon = getStepIcon(step);

          return (
            <div key={index} className={`${styles.timelineItem} ${statusClass}`}>
              <div className={styles.iconContainer}>
                <div className={styles.iconBackground}>
                  {isCurrent ? <FaSpinner className={styles.spinnerIcon} /> : (isCompleted ? <FaCheckCircle /> : stepIcon)}
                </div>
              </div>
              <div className={styles.contentContainer}>
                <span className={styles.stepName}>{step}</span>
                {isCompleted && historyEntry.updatedAt && (
                  <span className={styles.stepDate}>
                    {new Date(historyEntry.updatedAt.seconds * 1000).toLocaleDateString('es-AR')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;