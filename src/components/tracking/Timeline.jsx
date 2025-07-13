import React from 'react';
import { FaCheckCircle, FaRegCircle, FaSpinner } from 'react-icons/fa';
import './Timeline.css';

const Timeline = ({ history, currentStatus, productionSteps }) => {
  return (
    <div className="timeline">
      {productionSteps.map((step, index) => {
        const historyEntry = history.find(h => h.stepName === step);
        const isCompleted = !!historyEntry;
        const isCurrent = (step === currentStatus);

        let statusIcon;
        if (isCompleted) {
          statusIcon = <FaCheckCircle className="icon completed" />;
        } else if (isCurrent) {
          statusIcon = <FaSpinner className="icon current" />;
        } else {
          statusIcon = <FaRegCircle className="icon pending" />;
        }

        return (
          <div key={index} className={`timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
            <div className="timeline-icon-container">
              {statusIcon}
              {index < productionSteps.length - 1 && <div className="timeline-connector"></div>}
            </div>
            <div className="timeline-content">
              <span className="step-name">{step}</span>
              {isCompleted && (
                <span className="step-date">
                  {new Date(historyEntry.updatedAt.seconds * 1000).toLocaleDateString('es-AR')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;