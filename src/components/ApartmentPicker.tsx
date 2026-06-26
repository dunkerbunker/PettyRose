import { Building2, Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type { AgreementConfig, ApartmentNumber } from "../types/agreement";
import { apartmentLabel, formatMoney, getApartment } from "../utils/format";

type ApartmentPickerProps = {
  config: AgreementConfig;
  value: ApartmentNumber;
  onChange: (value: ApartmentNumber) => void;
};

export function ApartmentPicker({ config, value, onChange }: ApartmentPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedApartment = getApartment(config, value);

  return (
    <>
      <button className="apartment-trigger" type="button" onClick={() => setOpen(true)}>
        <Building2 size={19} />
        <span>
          <strong>{value}</strong>
          <small>{apartmentLabel(selectedApartment)}</small>
        </span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="sheet-shell" role="dialog" aria-modal="true" aria-label="Choose apartment">
          <button className="sheet-backdrop" type="button" aria-label="Close apartment picker" onClick={() => setOpen(false)} />
          <section className="bottom-sheet apartment-sheet">
            <div className="sheet-grabber" />
            <header className="sheet-header">
              <div>
                <p>Apartment</p>
                <strong>Choose premises</strong>
              </div>
              <button className="icon-button" type="button" aria-label="Close apartment picker" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="apartment-options">
              {config.apartments.map((apartment) => {
                const isSelected = apartment.apartmentNumber === value;
                return (
                  <button
                    className={`apartment-option ${isSelected ? "apartment-option--active" : ""}`}
                    key={apartment.apartmentNumber}
                    type="button"
                    onClick={() => {
                      onChange(apartment.apartmentNumber);
                      setOpen(false);
                    }}
                  >
                    <span className="apartment-option__unit">{apartment.apartmentNumber}</span>
                    <span className="apartment-option__meta">
                      <strong>{apartmentLabel(apartment)}</strong>
                      <small>MVR {formatMoney(apartment.monthlyRent)} monthly rent</small>
                    </span>
                    <span className="apartment-option__check">{isSelected && <Check size={18} />}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
