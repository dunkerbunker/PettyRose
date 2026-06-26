import type { AgreementConfig, ApartmentConfig, ApartmentNumber } from "../types/agreement";

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const sanitizeFilenamePart = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || "tenant";
};

export const buildFilename = (apartmentNumber: ApartmentNumber, tenantName: string): string =>
  `${apartmentNumber}-${sanitizeFilenamePart(tenantName)}-agreement.pdf`;

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
