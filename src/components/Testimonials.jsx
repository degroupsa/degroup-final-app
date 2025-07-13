import React from 'react';
import styles from './Testimonials.module.css';
import { FaQuoteLeft } from 'react-icons/fa'; // Importamos el icono de comillas

// Mock data para los testimonios
const mockTestimonials = [
  {
    id: 1,
    quote:
      'Desde que instalamos los pisapalos Terrashield en la sembradora, la uniformidad en la emergencia del cultivo es notable. Un antes y un después.',
    author: 'Juan C. Bertaina',
    location: "Establecimiento 'La Perseverancia', Armstrong",
  },
  {
    id: 2,
    quote:
      'La robustez y el diseño simple de los productos de DE Group se notan en el día a día. Menos tiempo en mantenimiento y más tiempo produciendo.',
    author: 'Familia Gagliardi',
    location: 'Campo en Marcos Juárez, Córdoba',
  },
  {
    id: 3,
    quote:
      'Excelente atención y asesoramiento. Entienden las necesidades del productor de la zona. Un producto local que compite con cualquiera de afuera.',
    author: 'Ana M. Silvestri',
    location: 'Productora en Cañada de Gómez, Santa Fe',
  },
];

function Testimonials() {
  return (
    <section className={styles.testimonialsSection}>
      <h2>Opiniones de Nuestros Clientes</h2>
      <div className={styles.grid}>
        {mockTestimonials.map((testimonial) => (
          <div key={testimonial.id} className={styles.testimonialCard}>
            <FaQuoteLeft className={styles.quoteIcon} />
            <p className={styles.testimonialText}>"{testimonial.quote}"</p>
            <p className={styles.author}>
              {testimonial.author}
              <span>{testimonial.location}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;
