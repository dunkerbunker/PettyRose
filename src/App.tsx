import { Coins, FileCheck2, IdCard, Loader2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApartmentPicker } from "./components/ApartmentPicker";
import { BottomActionBar } from "./components/BottomActionBar";
import { DateField } from "./components/DateField";
import { Field } from "./components/Field";
import { PillGroup } from "./components/PillGroup";
import { PreviewModal } from "./components/PreviewModal";
import configJson from "./data/agreementConfig.json";
import type {
  AgreementConfig,
  AgreementFormData,
  ApartmentNumber,
  GeneratedAgreement,
  TermPreset,
} from "./types/agreement";
import { endDateForTerm, todayInputValue } from "./utils/date";
import { formatMoney, getApartment } from "./utils/format";
import { generateAgreementPdf } from "./utils/pdf";

const config = configJson as AgreementConfig;

type Errors = Partial<Record<keyof AgreementFormData, string>>;

const createInitialForm = (): AgreementFormData => {
  const startDate = todayInputValue();
  const apartment = getApartment(config, "2B");
  return {
    tenantName: "",
    tenantIdCardNo: "",
    apartmentNumber: "2B",
    startDate,
    endDate: endDateForTerm(startDate, "1y"),
    termPreset: "1y",
    monthlyRent: apartment.monthlyRent,
    securityDeposit: apartment.monthlyRent,
    signingDate: startDate,
  };
};

const termOptions: Array<{ label: string; value: TermPreset }> = [
  { label: "6 months", value: "6m" },
  { label: "1 year", value: "1y" },
  { label: "2 years", value: "2y" },
  { label: "Custom", value: "custom" },
];

const depositOptions = [
  { label: "1x", value: "1" },
  { label: "2x", value: "2" },
  { label: "3x", value: "3" },
];

function validate(form: AgreementFormData): Errors {
  const errors: Errors = {};
  if (!form.tenantName.trim()) errors.tenantName = "Tenant name is required.";
  if (!form.tenantIdCardNo.trim()) errors.tenantIdCardNo = "ID card number is required.";
  if (!form.startDate) errors.startDate = "Start date is required.";
  if (!form.endDate) errors.endDate = "End date is required.";
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    errors.endDate = "End date must be after the start date.";
  }
  if (!form.signingDate) errors.signingDate = "Signing date is required.";
  if (!Number.isFinite(form.monthlyRent) || form.monthlyRent <= 0) errors.monthlyRent = "Enter a valid rent.";
  if (!Number.isFinite(form.securityDeposit) || form.securityDeposit < 0) {
    errors.securityDeposit = "Enter a valid deposit.";
  }
  return errors;
}

function App() {
  const [form, setForm] = useState<AgreementFormData>(createInitialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [agreement, setAgreement] = useState<GeneratedAgreement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  const selectedApartment = useMemo(
    () => getApartment(config, form.apartmentNumber),
    [form.apartmentNumber],
  );
  const canNativeShare = useMemo(() => {
    if (!agreement) return false;
    const file = new File([agreement.blob], agreement.filename, { type: "application/pdf" });
    return Boolean(navigator.canShare?.({ files: [file] }));
  }, [agreement]);

  useEffect(() => {
    return () => {
      if (agreement?.url) URL.revokeObjectURL(agreement.url);
    };
  }, [agreement]);

  const updateForm = <K extends keyof AgreementFormData>(key: K, value: AgreementFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleApartmentChange = (apartmentNumber: ApartmentNumber) => {
    const apartment = getApartment(config, apartmentNumber);
    setForm((current) => ({
      ...current,
      apartmentNumber,
      monthlyRent: apartment.monthlyRent,
      securityDeposit: apartment.monthlyRent,
    }));
  };

  const handleStartDate = (startDate: string) => {
    setForm((current) => ({
      ...current,
      startDate,
      endDate: current.termPreset === "custom" ? current.endDate : endDateForTerm(startDate, current.termPreset),
    }));
    setErrors((current) => ({ ...current, startDate: undefined, endDate: undefined }));
  };

  const handleTerm = (termPreset: TermPreset) => {
    setForm((current) => ({
      ...current,
      termPreset,
      endDate: termPreset === "custom" ? current.endDate : endDateForTerm(current.startDate, termPreset),
    }));
  };

  const handleGenerate = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsGenerating(true);
    try {
      if (agreement?.url) URL.revokeObjectURL(agreement.url);
      const generated = await generateAgreementPdf(form);
      setAgreement(generated);
      setPreviewZoom(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAgreement = () => {
    if (!agreement) return;
    const anchor = document.createElement("a");
    anchor.href = agreement.url;
    anchor.download = agreement.filename;
    anchor.click();
  };

  const handleShare = async () => {
    if (!agreement) return;
    const file = new File([agreement.blob], agreement.filename, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Residential Tenancy Agreement",
        text: `${form.apartmentNumber} tenancy agreement for ${form.tenantName}`,
        files: [file],
      });
      return;
    }
    downloadAgreement();
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">PR</div>
        <div>
          <p>{config.property.name}</p>
          <h1>Agreement Generator</h1>
        </div>
      </header>

      <main className="screen">
        <section className="status-strip">
          <div>
            <span>Apartment</span>
            <strong>{form.apartmentNumber}</strong>
          </div>
          <div>
            <span>Rent</span>
            <strong>MVR {formatMoney(form.monthlyRent)}</strong>
          </div>
          <div>
            <span>Fee</span>
            <strong>MVR {formatMoney(config.fixedFees.latePaymentDailyFee)}</strong>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span>01</span>
            <h2>Tenant</h2>
          </div>
          <Field label="Tenant full name" error={errors.tenantName}>
            <div className="input-shell">
              <UserRound size={19} />
              <input
                autoComplete="name"
                placeholder="Full legal name"
                value={form.tenantName}
                onChange={(event) => updateForm("tenantName", event.target.value)}
              />
            </div>
          </Field>
          <Field label="Tenant ID card number" error={errors.tenantIdCardNo}>
            <div className="input-shell">
              <IdCard size={19} />
              <input
                autoCapitalize="characters"
                placeholder="A000000"
                value={form.tenantIdCardNo}
                onChange={(event) => updateForm("tenantIdCardNo", event.target.value)}
              />
            </div>
          </Field>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span>02</span>
            <h2>Premises</h2>
          </div>
          <Field label="Apartment" hint={`${selectedApartment.floor} floor`}>
            <ApartmentPicker config={config} value={form.apartmentNumber} onChange={handleApartmentChange} />
          </Field>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span>03</span>
            <h2>Term</h2>
          </div>
          <PillGroup label="Term length" options={termOptions} value={form.termPreset} onChange={handleTerm} scrollable />
          <div className="date-grid">
            <DateField label="Start date" value={form.startDate} error={errors.startDate} onChange={handleStartDate} />
            <DateField
              label="End date"
              value={form.endDate}
              error={errors.endDate}
              onChange={(value) => {
                setForm((current) => ({ ...current, endDate: value, termPreset: "custom" }));
                setErrors((current) => ({ ...current, endDate: undefined }));
              }}
            />
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span>04</span>
            <h2>Payment</h2>
          </div>
          <Field label="Monthly rent" error={errors.monthlyRent}>
            <div className="input-shell">
              <Coins size={19} />
              <span className="currency-prefix">MVR</span>
              <input
                inputMode="numeric"
                value={String(form.monthlyRent)}
                onChange={(event) => updateForm("monthlyRent", Number(event.target.value.replace(/\D/g, "")))}
              />
            </div>
          </Field>
          <Field label="Security deposit" error={errors.securityDeposit}>
            <div className="input-shell">
              <FileCheck2 size={19} />
              <span className="currency-prefix">MVR</span>
              <input
                inputMode="numeric"
                value={String(form.securityDeposit)}
                onChange={(event) => updateForm("securityDeposit", Number(event.target.value.replace(/\D/g, "")))}
              />
            </div>
          </Field>
          <PillGroup
            label="Deposit multiplier"
            options={depositOptions}
            value={String(Math.round(form.securityDeposit / Math.max(form.monthlyRent, 1)))}
            onChange={(value) => updateForm("securityDeposit", Number(value) * form.monthlyRent)}
          />
        </section>

        <section className="panel panel--last">
          <div className="section-heading">
            <span>05</span>
            <h2>Signing</h2>
          </div>
          <DateField
            label="Signing date"
            value={form.signingDate}
            error={errors.signingDate}
            onChange={(value) => updateForm("signingDate", value)}
          />
        </section>
      </main>

      <BottomActionBar mode="edit" disabled={isGenerating} onPrimary={handleGenerate} />
      {isGenerating && (
        <div className="loading-shade" aria-live="polite">
          <Loader2 size={22} />
          <span>Generating PDF</span>
        </div>
      )}
      {agreement && (
        <PreviewModal
          agreement={agreement}
          fallback={!canNativeShare}
          zoom={previewZoom}
          onZoom={setPreviewZoom}
          onShare={handleShare}
          onClose={() => setAgreement(null)}
        />
      )}
    </div>
  );
}

export default App;
