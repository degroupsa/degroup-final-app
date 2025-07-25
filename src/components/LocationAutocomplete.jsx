import React, { useRef, useEffect } from 'react';

function LocationAutocomplete({ isLoaded, onPlaceSelect, styles }) {
  const inputRef = useRef(null);

  useEffect(() => {
    // Se activa solo cuando el script de Google ha cargado
    if (isLoaded && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["(cities)"],
          componentRestrictions: { country: "ar" },
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          // Llama a la función del padre con la dirección seleccionada
          onPlaceSelect(place.formatted_address);
        }
      });
    }
  }, [isLoaded, onPlaceSelect]);

  return (
    <input 
      ref={inputRef}
      type="text" 
      placeholder="Busca tu ciudad..." 
      required 
      className={styles.locationInput} // Usa los estilos del padre
    />
  );
}

// Usamos React.memo para evitar que se redibuje innecesariamente
export default React.memo(LocationAutocomplete);