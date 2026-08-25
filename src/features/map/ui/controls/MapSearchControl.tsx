import { Search, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/shared/providers";
import { formatCoordinate, parseCoordinate } from "../../model/coordinates";
import type { LngLat } from "../../model/geodesy";

interface MapSearchControlProps {
  onSelect: (point: LngLat) => void;
}

/**
 * The canon's search accepts place, address or coordinates. No geocoding
 * service is wired to this console, so only coordinates resolve — and the
 * field says so rather than returning an empty list and letting the operator
 * assume the place does not exist.
 */
export function MapSearchControl({ onSelect }: MapSearchControlProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const parsed = query.trim() ? parseCoordinate(query) : null;
  const showResults = isFocused && query.trim().length > 0;

  const submit = () => {
    if (parsed) {
      onSelect(parsed.point);
      setIsFocused(false);
    }
  };

  return (
    <div className="nt-mapsearch">
      <div className="nt-mapsearch__field">
        <span aria-hidden="true" className="nt-mapsearch__icon">
          <Search strokeWidth={1.5} />
        </span>
        <input
          aria-label={t("map.searchLabel")}
          className="nt-mapsearch__input"
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={t("map.searchPlaceholder")}
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label={t("map.searchClear")}
            className="nt-mapsearch__clear"
            onClick={() => setQuery("")}
            type="button"
          >
            <X aria-hidden="true" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div aria-live="polite" className="nt-mapsearch__results">
          {parsed ? (
            <button className="nt-mapsearch__item" onClick={submit} type="button">
              <span className="nt-mapsearch__name">
                {parsed.notation === "dms" ? t("map.searchCoordinateDms") : t("map.searchCoordinate")}
              </span>
              <span className="nt-mapsearch__coord">{formatCoordinate(parsed.point)}</span>
            </button>
          ) : (
            <div className="nt-mapsearch__item">
              <span className="nt-mapsearch__name">{t("map.searchNoGeocoder")}</span>
              <span className="nt-mapsearch__coord">{t("map.searchCoordinateHint")}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
