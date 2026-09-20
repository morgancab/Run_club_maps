import { useEffect, useRef, useState } from 'react';

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
}

interface AddressAutocompleteFieldProps {
  label: string;
  placeholder?: string;
  helperText?: string;
  onSelect: (suggestion: AddressSuggestion) => void;
}

// Recherche d'adresse "as you type" via le proxy Nominatim (api/geocode).
// Composant contrôlé en interne : le parent reçoit uniquement le résultat
// sélectionné (lat/lng/ville), jamais le texte brut tapé par l'utilisateur.
export default function AddressAutocompleteField({
  label,
  placeholder,
  helperText,
  onSelect,
}: AddressAutocompleteFieldProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (query.trim().length < 3 || selected) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(false);
        }}
        className="w-full rounded-md border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      {helperText && !selected && !loading && suggestions.length === 0 && (
        <p className="mt-1 text-[11px] text-concrete">{helperText}</p>
      )}
      {selected && (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-accent">Nouvelle adresse sélectionnée</p>
      )}
      {!selected && loading && <p className="mt-1 text-[11px] text-concrete">Recherche…</p>}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-ink-line bg-paper shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  setQuery(suggestion.displayName);
                  setSelected(true);
                  setSuggestions([]);
                  onSelect(suggestion);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper-soft"
              >
                {suggestion.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
