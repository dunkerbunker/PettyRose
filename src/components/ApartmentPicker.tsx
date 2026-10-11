import { Building2, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { AgreementConfig, ApartmentNumber } from "../types/agreement";
import { apartmentLabel, formatMoney, getApartment } from "../utils/format";
import { Drawer } from "./Drawer";

type ApartmentPickerProps = { config: AgreementConfig; value: ApartmentNumber; onChange: (value: ApartmentNumber) => void };

export function ApartmentPicker({ config, value, onChange }: ApartmentPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedApartment = getApartment(config, value);
  return <>
    <button className="apartment-trigger" type="button" aria-label={`Choose apartment, ${value}`}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Building2 size={19} /><span><strong>{value}</strong><small>{apartmentLabel(selectedApartment)}</small></span><ChevronDown size={18} />
    </button>
    {open && <Drawer label="Choose apartment" title="Choose premises" onClose={() => setOpen(false)}>
      <div className="apartment-options" role="radiogroup" aria-label="Apartments">
        {config.apartments.map((apartment) => <button
          className={`apartment-option ${apartment.apartmentNumber === value ? "apartment-option--active" : ""}`}
          key={apartment.apartmentNumber} type="button" role="radio" aria-checked={apartment.apartmentNumber === value}
          onClick={() => { onChange(apartment.apartmentNumber); setOpen(false); }}>
          <span className="apartment-option__unit">{apartment.apartmentNumber}</span>
          <span className="apartment-option__meta"><strong>{apartmentLabel(apartment)}</strong><small>MVR {formatMoney(apartment.monthlyRent)} monthly rent</small></span>
          <span className="apartment-option__check">{apartment.apartmentNumber === value && <Check size={18} />}</span>
        </button>)}
      </div>
    </Drawer>}
  </>;
}
