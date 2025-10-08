import React from 'react';
import styles from './Testimonials.module.css';
import { FaQuoteLeft } from 'react-icons/fa'; // Importamos el icono de comillas

// Mock data para los testimonios
const mockTestimonials = [
  {
    id: 1,
    quote:
      'En nuestro caso, el Terrashield 600 está colocado en una sembradora Giorgi de granos gruesos y Funcionó muy bien. Me llamó mucho la atención el cómo se adapta muy bien a la sembradora, sin necesidad de soldar o perforar algo. Respecto al equipo de DE Group, muy buena predisposición a consultas/dudas, abiertos a sugerencias, etc. En resumen general, funcionó muy bien y la protección que le da a las cubiertas se nota. Esta campaña se han colocado cubiertas nuevas y se nota un maltrato mucho menor por parte de los distintos rastrojos.',
    author: 'Sebastian Peresin',
    location: "Villa Trinidad, Santa Fé",
  },
  {
    id: 2,
    quote: 
      'Buen equipo. Construcción sencilla, de alta calidad y Fácil vinculación con el tractor. Los chicos de la empresa, siempre muy atentos a responder cualquier consulta Antes y Después de la compra.',
    author: 'Claudio Collino',
    location: 'Campo López, Córdoba',
  },
  {
    id: 3,
    quote:
      'Excelente atención y asesoramiento. Entienden las necesidades reales del productor. Un producto local que compite con cualquiera de afuera.',
    author: 'Ana M. Silvestri',
    location: 'Casilda, Santa Fe',
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
