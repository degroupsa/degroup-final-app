import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Este componente no renderiza nada visual, solo contiene lógica.
function ScrollToTop() {
  // Extrae el "pathname" (ej: "/productos", "/contacto") de la URL actual.
  const { pathname } = useLocation();

  // Este "useEffect" se ejecuta cada vez que el "pathname" cambia.
  useEffect(() => {
    // Esta es la forma más robusta de asegurar el scroll hacia arriba.
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // "instant" es importante para que sea inmediato
    });
  }, [pathname]); // La dependencia [pathname] asegura que se ejecute solo al cambiar de página.

  return null; // No devuelve ningún elemento visual.
}

export default ScrollToTop;