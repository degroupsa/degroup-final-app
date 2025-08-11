import React from 'react';
import { 
  FaCheckCircle, FaRegCircle, FaSpinner,
  FaClipboardCheck, FaIndustry, FaWrench, FaBroom,
  FaPaintBrush, FaTools, FaSearch, FaShippingFast, FaFlagCheckered
} from 'react-icons/fa';
import styles from './Timeline.module.css';

const PRODUCTION_STEPS = [
  'Pendiente', 'En Planta', 'Corte y Plegado', 'Soldadura del Equipo', 
  'Preparación para Pintura', 'Pintura Inicial', 'Pintura Final', 
  'Control de Calidad Inicial', 'Ensamble del Equipo', 'Control de Calidad Final', 
  'Preparación para la Entrega', 'Listo para Retirar'
];

const iconMap = {
  'pendiente': <FaClipboardCheck />, 'planta': <FaIndustry />, 'corte': <FaWrench />,
  'soldadura': <FaWrench />, 'preparación para pintura': <FaBroom />, 'pintura inicial': <FaPaintBrush />,
  'pintura final': <FaPaintBrush />, 'calidad inicial': <FaSearch />, 'ensamble': <FaTools />,
  'calidad final': <FaSearch />, 'preparación para la entrega': <FaShippingFast />, 'listo para retirar': <FaFlagCheckered />,
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

const Timeline = ({ history, currentStatus }) => {
  const currentStepIndex = PRODUCTION_STEPS.indexOf(currentStatus);
  const progressPercent = (currentStepIndex / (PRODUCTION_STEPS.length - 1)) * 100;

  return (
    <div className={styles.timelineContainer}>
      <div 
        className={styles.timeline} 
        style={{ '--progress-percent': `${progressPercent}%` }} // Pasamos el progreso al CSS
      >
        <div className={styles.progressLine} />
        {PRODUCTION_STEPS.map((step, index) => {
          const historyEntry = (history || []).find(h => h.stepName === step);
          const isCompleted = !!historyEntry;
          const isCurrent = (step === currentStatus);
          
          const statusClass = isCompleted ? styles.completed : isCurrent ? styles.current : styles.pending;
          const stepIcon = getStepIcon(step);

          return (
            <div key={index} className={`${styles.timelineItem} ${statusClass}`}>
              <div className={styles.iconContainer}>
                <div className={styles.iconBackground}>
                  {isCurrent ? <FaSpinner /> : (isCompleted ? <FaCheckCircle /> : stepIcon)}
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