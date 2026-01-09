import React from 'react';
import { 
  FaCheckCircle, FaRegCircle, FaSpinner,
  FaClipboardCheck, FaIndustry, FaWrench, FaBroom,
  FaPaintBrush, FaTools, FaSearch, FaShippingFast, FaFlagCheckered,
  FaFire, FaShower, FaBox, FaSprayCan // <-- ÍCONO AÑADIDO
} from 'react-icons/fa';
import styles from './Timeline.module.css';

const PRODUCTION_STEPS = [
  'Pendiente', 'En Planta', 'Corte y Plegado', 'Proceso de Soldadura', 
  'Proceso de Limpieza', 'Pintura Inicial', 'Pintura Final', 
  'Control de Calidad Inicial', 'Ensamble del Equipo', 'Control de Calidad Final', 
  'Embalaje del Equipo', 'Listo para Retirar'
];

const iconMap = {
  'pendiente': <FaClipboardCheck />,
  'planta': <FaIndustry />,
  'corte': <FaWrench />,
  'soldadura': <FaFire />,
  'limpieza': <FaSprayCan />, // <-- ICONO CAMBIADO
  'pintura': <FaPaintBrush />,
  'calidad': <FaSearch />,
  'ensamble': <FaTools />,
  'embalaje': <FaBox />,
  'entrega': <FaShippingFast />,
  'retirar': <FaFlagCheckered />,
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