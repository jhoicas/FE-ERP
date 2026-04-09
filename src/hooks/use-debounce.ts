import { useEffect, useState } from "react";

/**
 * Custom hook para debouncear un valor.
 * Útil para optimizar llamadas a API que se disparan frecuentemente.
 *
 * @template T - Tipo del valor a debouncer
 * @param value - El valor a debouncer
 * @param delay - Delay en milisegundos (default: 500ms)
 * @returns El valor debouncedo
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * // debouncedSearch se actualiza solo después de 300ms sin cambios en searchTerm
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura el timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el timeout anterior si el valor cambia antes del delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook para manejar búsquedas en tablas con debounce.
 * Mantiene un estado local para actualización inmediata en el input,
 * y un valor debouncedo para queries al backend.
 *
 * @param initialSearch - Valor inicial de búsqueda (default: '')
 * @param debounceDelay - Delay en milisegundos (default: 500ms)
 * @returns Objeto con searchTerm, setSearchTerm y debouncedSearchTerm
 *
 * @example
 * const { searchTerm, setSearchTerm, debouncedSearchTerm } = useTableSearch('', 300);
 *
 * // Renderizar input
 * <input
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 *   placeholder="Buscar..."
 * />
 *
 * // Usar debouncedSearchTerm en queries
 * const { data } = useQuery({
 *   queryKey: ['search', debouncedSearchTerm],
 *   queryFn: () => apiSearch(debouncedSearchTerm),
 * });
 */
export function useTableSearch(
  initialSearch: string = "",
  debounceDelay: number = 500
) {
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const debouncedSearchTerm = useDebounce<string>(searchTerm, debounceDelay);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
  };
}
