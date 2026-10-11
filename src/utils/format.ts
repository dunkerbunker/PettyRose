import type { AgreementConfig, AgreementLanguage, ApartmentConfig, ApartmentNumber } from "../types/agreement";

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const sanitizeFilenamePart = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || "tenant";
};

export const buildFilename = (apartmentNumber: ApartmentNumber, tenantName: string, language: AgreementLanguage = "en"): string =>
  `${apartmentNumber}-${sanitizeFilenamePart(tenantName)}-agreement${language === "dv" ? "-dhivehi" : ""}.pdf`;

export const ordinalFloor = (floor: number): string => {
  const suffix = floor === 1 ? "st" : floor === 2 ? "nd" : floor === 3 ? "rd" : "th";
  return `${floor}${suffix} Floor`;
};

export const apartmentLabel = (apartment: ApartmentConfig): string =>
  `Apartment ${apartment.floor}-${apartment.unit}, ${ordinalFloor(apartment.floor)}`;

export const getApartment = (
  config: AgreementConfig,
  apartmentNumber: ApartmentNumber,
): ApartmentConfig => {
  const apartment = config.apartments.find((item) => item.apartmentNumber === apartmentNumber);
  if (!apartment) {
    throw new Error(`Unknown apartment number: ${apartmentNumber}`);
  }
  return apartment;
};
