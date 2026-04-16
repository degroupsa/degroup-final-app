import React, { useRef } from 'react';
import styles from './TestimonialsSection.module.css';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight, FaEdit } from 'react-icons/fa';

const TestimonialsSection = ({ data, isAdmin, onEdit }) => {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -370 : 370, behavior: 'smooth' });
    }
  };

  // Si no hay data aún, mostramos array vacío
  const items = data?.items || [];

  return (
    <section className={styles.testimonialsSection}>
      <div className={styles.container}>
        
        {isAdmin && (
          <button className={styles.editButton} onClick={onEdit}>
            <FaEdit /> Editar Testimonios
          </button>
        )}

        <div className={styles.header}>
          <h2 className={styles.title}>{data?.title || "Lo que dicen nuestros clientes"}</h2>
          <p className={styles.subtitle}>{data?.subtitle || "El campo no frena, y nuestros equipos tampoco."}</p>
        </div>

        <div className={styles.carouselContainer}>
          <div className={styles.carouselArrows}>
            <button className={styles.scrollArrow} onClick={() => scroll('left')}><FaChevronLeft /></button>
            <button className={styles.scrollArrow} onClick={() => scroll('right')}><FaChevronRight /></button>
          </div>
          
          <div className={styles.grid} ref={scrollRef}>
            {items.map((testimonial, index) => (
              <div key={index} className={styles.card}>
                <FaQuoteLeft className={styles.quoteIcon} />
                
                <div className={styles.stars}>
                  {[...Array(Number(testimonial.rating) || 5)].map((_, i) => (
                    <FaStar key={i} className={styles.starIcon} />
                  ))}
                </div>
                
                <p className={styles.text}>"{testimonial.text}"</p>
                
                <div className={styles.authorInfo}>
                  <div className={styles.avatar}>
                    {testimonial.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className={styles.name}>{testimonial.name}</h4>
                    <span className={styles.role}>{testimonial.role}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <p style={{textAlign: 'center', width: '100%', color: '#6c757d'}}>Aún no hay testimonios cargados.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;