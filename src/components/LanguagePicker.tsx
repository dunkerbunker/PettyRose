import { Check, ChevronDown, Languages } from "lucide-react";
import { useState } from "react";
import type { AgreementLanguage } from "../types/agreement";
import { Drawer } from "./Drawer";

export function LanguagePicker({ value, onChange }: { value: AgreementLanguage; onChange: (language: AgreementLanguage) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="apartment-trigger language-trigger" type="button" aria-label="Agreement language"
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Languages size={19} />
      <span><strong>{value === "en" ? "English" : <span lang="dv" dir="rtl">ދިވެހި</span>}</strong><small>{value === "en" ? "English agreement" : "Dhivehi agreement"}</small></span>
      <ChevronDown size={18} />
    </button>
    {open && <Drawer label="Choose language" title="Agreement language" onClose={() => setOpen(false)}>
      <div className="language-options" role="radiogroup" aria-label="Agreement languages">
        {(["en", "dv"] as const).map((language) => <button key={language} type="button" role="radio"
          className={`language-option ${value === language ? "language-option--active" : ""}`} aria-checked={value === language}
          aria-label={language === "en" ? "English" : "Dhivehi"} onClick={() => { onChange(language); setOpen(false); }}>
          <span><strong>{language === "en" ? "English" : <span lang="dv" dir="rtl">ދިވެހި</span>}</strong><small>{language === "en" ? "Write the agreement in English" : "Write the agreement in Dhivehi"}</small></span>
          <span className="language-option__check">{value === language && <Check size={20} />}</span>
        </button>)}
      </div>
    </Drawer>}
  </>;
}
