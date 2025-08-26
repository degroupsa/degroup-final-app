// src/hooks/useGoogleMaps.js
import { useEffect, useState } from 'react';

// Variable para evitar que el script se cargue varias veces
let scriptLoading = false;

const useGoogleMaps = (apiKey) => {
  // Estado para saber si la API está lista para usarse
  const [isLoaded, setIsLoaded] = useState(window.google && window.google.maps);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // Si ya está cargado, no hacemos nada más.
    if (isLoaded) {
      return;
    }

    // Si el script ya se está cargando, esperamos a que termine.
    if (scriptLoading) {
      return;
    }

    // Si no hay clave de API, detenemos y mostramos un error.
    if (!apiKey) {
        console.error("Falta la clave de API de Google Maps.");
        setLoadError(new Error("Falta la clave de API de Google Maps."));
        return;
    }
    
    scriptLoading = true;
    const callbackName = 'googleMapsApiLoaded';

    // Creamos una función global que Google llamará cuando todo esté listo.
    window[callbackName] = () => {
      setIsLoaded(true);
      scriptLoading = false;
      delete window[callbackName]; // Limpiamos para no dejar basura
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    
    script.onerror = () => {
      setLoadError(new Error("Error al cargar el script de Google Maps."));
      scriptLoading = false;
      delete window[callbackName];
    };

    document.head.appendChild(script);

  }, [apiKey, isLoaded]);

  return { isLoaded, loadError };
};

export default useGoogleMaps;
