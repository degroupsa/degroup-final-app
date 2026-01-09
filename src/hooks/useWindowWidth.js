import { useState, useEffect } from 'react';

function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    // Limpia el listener cuando el componente se desmonta
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowWidth;
}

export default useWindowWidth;