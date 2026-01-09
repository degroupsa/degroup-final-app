import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Solo hacemos scroll al tope si la navegación NO fue por
    // los botones de atrás/adelante del navegador (POP).
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]); // Ahora también depende del tipo de navegación

  return null; // Este componente sigue sin renderizar nada.
}

export default ScrollToTop;