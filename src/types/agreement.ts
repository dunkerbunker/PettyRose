export type ApartmentNumber = "2A" | "2B" | "3A" | "3B";
export type TermPreset = "6m" | "1y" | "2y" | "custom";

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
};
