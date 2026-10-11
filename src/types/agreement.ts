export type ApartmentNumber = `${2 | 3 | 4 | 5 | 6}${"A" | "B"}`;
export type TermPreset = "6m" | "1y" | "2y" | "custom";
export type AgreementLanguage = "en" | "dv";

export type PartyDetails = {
  name: string;
  idCardNo: string;
};

export type ApartmentConfig = {
  apartmentNumber: ApartmentNumber;
  floor: number;
  unit: string;
  monthlyRent: number;
};

export type AgreementConfig = {
  property: {
    name: string;
    baseAddress: string;
  };
  landlord: PartyDetails & {
    paymentAccount: string;
    paymentAccountDhivehi: string;
    signaturePath: string;
  };
  witnesses: {
    landlord: PartyDetails & {
      signaturePath: string;
    };
    tenant: {
      label: string;
    };
  };
  apartments: ApartmentConfig[];
  fixedFees: {
    latePaymentDailyFee: number;
  };
  constants: {
    rentDueDay: number;
    unpaidTerminationDays: number;
    securityDepositReturnDays: number;
    noticePeriodMonths: number;
  };
};

export type AgreementFormData = {
  language: AgreementLanguage;
  tenantName: string;
  tenantIdCardNo: string;
  apartmentNumber: ApartmentNumber;
  startDate: string;
  endDate: string;
  termPreset: TermPreset;
  monthlyRent: number;
  securityDeposit: number;
  signingDate: string;
};

export type GeneratedAgreement = {
  blob: Blob;
  url: string;
  filename: string;
  language: AgreementLanguage;
  /** Native-shaped page images also provide a preview when PDF.js is unavailable. */
  previewPages?: string[];
};
