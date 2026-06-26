import { jsPDF } from "jspdf";
import configJson from "../data/agreementConfig.json";
import type { AgreementConfig, AgreementFormData, GeneratedAgreement } from "../types/agreement";
import { formatDisplayDate } from "./date";
import { apartmentLabel, buildFilename, formatMoney, getApartment } from "./format";

const config = configJson as AgreementConfig;

const page = {
  width: 595.28,
  height: 841.89,
  marginX: 48,
  marginTop: 50,
  marginBottom: 54,
};

const terms = [
  {
    title: "Property and Use",
    body: [
      "The Landlord lets, and the Tenant takes on rent, the apartment/floor identified in the Agreement Details at M. Petty Rose, Handhuvarihigun, Kaafu Male, Maldives, together with the fixtures, fittings, keys, access items and common-area rights reasonably connected to it.",
      "The property shall be used only as a private residential apartment. The Tenant shall not use it for any unlawful, immoral, commercial, guesthouse, short-stay, sub-letting or shared-occupation purpose without the Landlord's prior written consent.",
    ],
  },
  {
    title: "Term",
    body: [
      "The tenancy shall run for the period stated in the Agreement Details unless ended earlier in accordance with this Agreement.",
      "Any extension or renewal must be agreed in writing by both parties before the expiry of the current term.",
    ],
  },
  {
    title: "Rent and Late Payment",
    body: [
      "The Tenant shall pay the monthly rent stated in the Agreement Details on or before the 10th day of each calendar month.",
      "Rent shall be paid in cash or by bank transfer to the Landlord's payment account stated in the Agreement Details, unless the Landlord gives written notice of a replacement payment method.",
      `If rent remains unpaid after the due date, the Tenant shall pay a late charge of MVR ${formatMoney(config.fixedFees.latePaymentDailyFee)} for each day that payment remains outstanding.`,
      "If rent or any other amount due remains unpaid for 15 days or more, the Landlord may terminate this Agreement, restrict services where legally permitted, and require the Tenant to vacate the premises. The Tenant remains responsible for all unpaid amounts, late charges, damage and utility bills up to the date the premises are properly handed over.",
    ],
  },
  {
    title: "Security Deposit / Hold Amount",
    body: [
      "On or before handover of the premises, the Tenant shall pay the security deposit / hold amount stated in the Agreement Details, together with any rent due for the first month.",
      "The security deposit is held as protection for the Landlord against unpaid rent, unpaid utility or service bills, missing items, cleaning costs, repair costs, replacement costs, repainting costs, reinstatement costs, damage to the premises or building, breach of this Agreement, and any other amount properly due from the Tenant.",
      "The Landlord may deduct from the security deposit any reasonable cost, loss or unpaid amount caused by the Tenant, the Tenant's family members, guests, workers, invitees or any person allowed into the premises by the Tenant.",
      "If the security deposit is not enough to cover the total cost or loss, the Tenant shall pay the remaining balance to the Landlord within 7 days after written notice with reasonable supporting details.",
      "Subject to deductions permitted under this Agreement, the remaining balance of the security deposit shall be returned within 10 days after the Tenant vacates, returns all keys/access items, clears all bills, and completes handover of the premises to the Landlord's reasonable satisfaction.",
    ],
  },
  {
    title: "Utilities, Bills and Records",
    body: [
      "The Tenant is responsible for all electricity, water, telephone, internet, cable TV and other utility or service charges used in or connected to the premises during the tenancy.",
      "The Tenant shall keep proof of payments and shall provide copies to the Landlord on request. The Tenant must not leave any unpaid utility, service, maintenance or other bill when vacating the premises.",
      "Any reconnection fee, penalty, administrative charge or other cost arising from non-payment or late payment of such bills shall be borne by the Tenant and may be deducted from the security deposit.",
    ],
  },
  {
    title: "Tenant's Care and Damage Responsibility",
    body: [
      "The Tenant shall keep the premises, fixtures, fittings, walls, floors, doors, windows, sanitaryware, electrical items, plumbing, appliances and any provided items in good, clean and usable condition.",
      "The Tenant is responsible for any damage, breakage, loss, blockage, misuse, abnormal wear, stains, holes, cracks, burns, water damage, pest issues caused by poor hygiene, or damage to common areas caused by the Tenant or any person connected with the Tenant.",
      "The Tenant shall promptly inform the Landlord of any defect, leakage, electrical issue, plumbing issue or damage. The Tenant shall not allow small defects to become larger damage through delay, misuse or neglect.",
      "Fair wear and tear from ordinary residential use is excluded. Damage caused by negligence, misuse, lack of care, unauthorised work or failure to report an issue is not fair wear and tear.",
    ],
  },
  {
    title: "Repairs, Maintenance and Alterations",
    body: [
      "The Tenant shall not alter, drill, cut, paint, partition, install, remove, replace, modify or attach anything to the premises, walls, floors, ceiling, doors, windows, electrical lines, water lines, cables, fittings or fixtures without the Landlord's prior written consent.",
      "Any approved alteration must be carried out safely and professionally. The Tenant shall bear the cost of removing or reinstating any alteration unless the Landlord agrees otherwise in writing.",
      "The Tenant shall bear routine upkeep and servicing costs connected with the Tenant's use, and all repair costs arising from the Tenant's negligence, misuse or breach of this Agreement.",
    ],
  },
  {
    title: "Inspection and Access",
    body: [
      "The Landlord may inspect the premises at a reasonable time after giving reasonable notice to the Tenant, except in an emergency where immediate access is necessary to protect life, property or the building.",
      "The Tenant shall not unreasonably refuse or delay access for inspection, repair, maintenance, meter reading, safety checks, showing the premises near the end of the tenancy, or other reasonable building-related purposes.",
    ],
  },
  {
    title: "Building Rules and Common Areas",
    body: [
      "The Tenant shall respect neighbours and shall not create nuisance, disturbance, excessive noise, obstruction, offensive smell, unsafe activity or any behaviour that affects the peaceful occupation of others.",
      "The Tenant shall keep common areas clean and must not leave rubbish bags, personal items or obstructions outside the apartment, on stairways, in corridors, in the lift area or in any ventilation/common area.",
      "The Tenant shall not use the lift to carry items likely to damage it or use common areas in a manner that may damage the building. Any damage to common areas or building facilities caused by the Tenant or persons connected with the Tenant shall be the Tenant's responsibility.",
    ],
  },
  {
    title: "Compliance with Law",
    body: [
      "The Tenant shall comply with the laws and regulations of the Republic of Maldives and shall not carry out or permit any unlawful or prohibited activity in the premises.",
      "Any serious unlawful activity, breach of law, breach of public order, or conduct inconsistent with the lawful residential use of the premises shall be treated as a material breach of this Agreement.",
    ],
  },
  {
    title: "No Subletting or Transfer",
    body: [
      "The Tenant shall not sublet, assign, license, share possession, transfer occupation or otherwise allow another person to occupy the premises as tenant without the Landlord's prior written consent.",
    ],
  },
  {
    title: "Notice and Early Termination",
    body: [
      "Either party wishing to end the tenancy before the end of the term shall give at least 1 month's prior written notice, unless the termination is due to a material breach allowing earlier termination under this Agreement.",
      "The Landlord may give a shorter notice, including up to 7 days' notice, where the Tenant causes serious nuisance, significant damage, unlawful activity, repeated breach, unpaid rent, or any condition that materially affects the Landlord, neighbours or the building.",
      "Termination does not release the Tenant from responsibility for unpaid rent, utilities, damage, cleaning, reinstatement, late charges or any other amount due up to the date of proper handover.",
    ],
  },
  {
    title: "Handover at the End of Tenancy",
    body: [
      "At the end of the tenancy, the Tenant shall return the premises vacant, clean, free of rubbish, free of personal belongings, with all keys/access items returned, and in the same good condition as received, subject only to fair wear and tear.",
      "The Tenant shall repair, replace, repaint, clean or reinstate anything damaged, removed, altered, stained, broken or changed during the tenancy, unless the Landlord agrees in writing to accept it as is.",
      "Any item fixed to or provided with the premises or building shall remain with the premises unless the Landlord agrees otherwise in writing. The Tenant may remove only the Tenant's personal movable belongings, provided no damage is caused.",
    ],
  },
  {
    title: "Set-Off and Deductions",
    body: [
      "The Landlord may set off and deduct any amount owed by the Tenant from the security deposit / hold amount, including rent, late charges, unpaid bills, repair costs, replacement costs, repainting, cleaning, reinstatement, missing keys/access items, damage to the premises, and damage to common areas or building facilities.",
      "The Landlord should, where reasonably possible, provide the Tenant with a short written breakdown of deductions. Failure to provide a breakdown immediately does not waive the Landlord's right to recover amounts properly due.",
    ],
  },
  {
    title: "Government Law or Rule Changes",
    body: [
      "If any applicable law, regulation or government requirement changes after this Agreement is signed and affects any term of this Agreement, the parties shall cooperate in good faith to adjust the affected term so that the Agreement remains lawful and enforceable as far as possible.",
    ],
  },
  {
    title: "Disputes",
    body: [
      "The parties shall first try to resolve any disagreement through discussion and good faith settlement.",
      "If the parties cannot resolve the matter amicably, either party may refer the dispute to the competent court or lawful authority in the Republic of Maldives.",
    ],
  },
  {
    title: "Entire Agreement",
    body: [
      "This Agreement contains the full understanding between the parties for the tenancy of the premises and replaces prior discussions or informal understandings on the same subject.",
      "Any amendment must be made in writing and signed or otherwise clearly accepted in writing by both parties.",
    ],
  },
];

const resolveAssetPath = (path: string): string => {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
};

const loadImage = async (path: string): Promise<string> => {
  const response = await fetch(resolveAssetPath(path));
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
};

const setText = (doc: jsPDF, size: number, style: "normal" | "bold" = "normal") => {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(28, 28, 28);
};

const headerFooter = (doc: jsPDF) => {
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i += 1) {
    doc.setPage(i);
    setText(doc, 8);
    doc.setTextColor(85, 91, 101);
    doc.text(`${config.property.name}, Handhuvarihigun | Residential Tenancy Agreement`, page.width - page.marginX, 34, {
      align: "right",
    });
    doc.text("Residential Tenancy Agreement", page.width / 2, page.height - 28, { align: "center" });
  }
};

type Cursor = { y: number };

const addPageIfNeeded = (doc: jsPDF, cursor: Cursor, needed = 48) => {
  if (cursor.y + needed > page.height - page.marginBottom) {
    doc.addPage();
    cursor.y = page.marginTop;
  }
};

const writeParagraph = (doc: jsPDF, cursor: Cursor, text: string, size = 10.4) => {
  setText(doc, size);
  const lines = doc.splitTextToSize(text, page.width - page.marginX * 2);
  addPageIfNeeded(doc, cursor, lines.length * 14 + 6);
  doc.text(lines, page.marginX, cursor.y);
  cursor.y += lines.length * 14 + 6;
};

const writeSectionTitle = (doc: jsPDF, cursor: Cursor, title: string) => {
  addPageIfNeeded(doc, cursor, 32);
  setText(doc, 14, "bold");
  doc.text(title, page.marginX, cursor.y);
  cursor.y += 24;
};

const detailRow = (
  doc: jsPDF,
  x: number,
  y: number,
  labelWidth: number,
  valueWidth: number,
  label: string,
  value: string,
  rowHeight = 24,
) => {
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, labelWidth, rowHeight, "F");
  setText(doc, 8.6, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + 7, y + 15);
  doc.setFillColor(244, 244, 244);
  doc.rect(x + labelWidth, y, valueWidth, rowHeight, "F");
  setText(doc, 9.2);
  const lines = doc.splitTextToSize(value, valueWidth - 12);
  doc.text(lines, x + labelWidth + 7, y + 15);
};

const drawCover = (doc: jsPDF, data: AgreementFormData, premises: string) => {
  const heroX = page.marginX;
  const heroY = 68;
  doc.setFillColor(0, 0, 0);
  doc.rect(heroX, heroY, page.width - page.marginX * 2, 205, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text("RESIDENTIAL", page.width / 2, heroY + 78, { align: "center" });
  doc.text("TENANCY AGREEMENT", page.width / 2, heroY + 112, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(config.property.name, page.width / 2, heroY + 144, { align: "center" });
  doc.text("Handhuvarihigun, Kaafu Male, Maldives", page.width / 2, heroY + 166, { align: "center" });

  const tableY = heroY + 228;
  const left = page.marginX + 8;
  const labelWidth = 152;
  const valueWidth = page.width - page.marginX * 2 - labelWidth - 16;
  detailRow(doc, left, tableY, labelWidth, valueWidth, "Landlord", `${config.landlord.name} | ID Card No. ${config.landlord.idCardNo}`, 34);
  detailRow(doc, left, tableY + 34, labelWidth, valueWidth, "Tenant", `${data.tenantName} | ID Card No. ${data.tenantIdCardNo}`, 34);
  detailRow(doc, left, tableY + 68, labelWidth, valueWidth, "Apartment / Floor", premises, 34);
};

const drawDetails = (doc: jsPDF, cursor: Cursor, data: AgreementFormData, premises: string) => {
  writeSectionTitle(doc, cursor, "Agreement Details");
  setText(doc, 11, "bold");
  doc.text("Landlord Details", page.marginX, cursor.y);
  doc.text("Tenant Details", 286, cursor.y);
  cursor.y += 14;
  detailRow(doc, page.marginX, cursor.y, 96, 126, "Name", config.landlord.name);
  detailRow(doc, 286, cursor.y, 112, 136, "Name", data.tenantName);
  cursor.y += 24;
  detailRow(doc, page.marginX, cursor.y, 96, 126, "ID Card No.", config.landlord.idCardNo);
  detailRow(doc, 286, cursor.y, 112, 136, "ID Card No.", data.tenantIdCardNo);
  cursor.y += 44;

  writeSectionTitle(doc, cursor, "Contract Details");
  const labelWidth = 250;
  const valueWidth = page.width - page.marginX * 2 - labelWidth;
  const rows = [
    ["Date of Agreement", formatDisplayDate(data.signingDate)],
    ["Apartment / Floor", premises],
    ["Building Address", config.property.baseAddress],
    ["Term", `From ${formatDisplayDate(data.startDate)} to ${formatDisplayDate(data.endDate)}`],
    ["Monthly Rent", `MVR ${formatMoney(data.monthlyRent)} payable on or before the ${config.constants.rentDueDay}th day of each month`],
    ["Security Deposit / Hold Amount", `MVR ${formatMoney(data.securityDeposit)}`],
    ["Payment Account", config.landlord.paymentAccount],
  ];

  rows.forEach(([label, value]) => {
    const valueLines = doc.splitTextToSize(value, valueWidth - 12);
    const rowHeight = Math.max(24, valueLines.length * 12 + 10);
    detailRow(doc, page.marginX, cursor.y, labelWidth, valueWidth, label, value, rowHeight);
    cursor.y += rowHeight;
  });
  cursor.y += 18;
};

const signatureCell = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  role: string,
  details: Array<[string, string]>,
  signature?: string,
) => {
  const isWitnessSignature = role.includes("Witness") && Boolean(signature);
  const cellHeight = 252;
  const signatureDividerY = y + 166;
  const detailStartY = y + 186;

  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, width, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(role.toUpperCase(), x + width / 2, y + 23, { align: "center" });
  doc.setDrawColor(180);
  doc.rect(x, y, width, cellHeight);
  doc.line(x, y + 38, x + width, y + 38);
  doc.line(x, signatureDividerY, x + width, signatureDividerY);
  doc.line(x, detailStartY + 20, x + width, detailStartY + 20);
  doc.line(x, detailStartY + 48, x + width, detailStartY + 48);

  setText(doc, 9);
  doc.text("Signature:", x + 9, y + 83);
  if (signature) {
    doc.addImage(
      signature,
      "PNG",
      x + (isWitnessSignature ? 20 : 72),
      y + (isWitnessSignature ? 43 : 55),
      isWitnessSignature ? 210 : 82,
      isWitnessSignature ? 143 : 61,
    );
  }
  details.forEach(([label, value], index) => {
    doc.text(`${label}: ${value}`, x + 9, detailStartY + index * 28);
  });
};

const drawSignatures = (
  doc: jsPDF,
  cursor: Cursor,
  data: AgreementFormData,
  landlordSignature: string,
  witnessSignature: string,
) => {
  writeSectionTitle(doc, cursor, "Execution");
  writeParagraph(
    doc,
    cursor,
    "The parties confirm that they have read and understood this Agreement, and sign it voluntarily in the presence of the witnesses named below.",
    10.4,
  );
  addPageIfNeeded(doc, cursor, 580);

  const col = (page.width - page.marginX * 2) / 2;
  signatureCell(doc, page.marginX, cursor.y, col, "Landlord", [
    ["Name", config.landlord.name],
    ["ID Card No.", config.landlord.idCardNo],
    ["Date", formatDisplayDate(data.signingDate)],
  ], landlordSignature);
  signatureCell(doc, page.marginX + col, cursor.y, col, "Tenant", [
    ["Name", data.tenantName],
    ["ID Card No.", data.tenantIdCardNo],
    ["Date", formatDisplayDate(data.signingDate)],
  ]);
  cursor.y += 274;

  signatureCell(doc, page.marginX, cursor.y, col, "Witness for Landlord", [
    ["Name", config.witnesses.landlord.name],
    ["ID Card No.", config.witnesses.landlord.idCardNo],
    ["Date", formatDisplayDate(data.signingDate)],
  ], witnessSignature);
  signatureCell(doc, page.marginX + col, cursor.y, col, "Witness for Tenant", [
    ["Name", ""],
    ["ID Card No.", ""],
    ["Date", formatDisplayDate(data.signingDate)],
  ]);
};

export const generateAgreementPdf = async (data: AgreementFormData): Promise<GeneratedAgreement> => {
  const apartment = getApartment(config, data.apartmentNumber);
  const premises = apartmentLabel(apartment);
  const [landlordSignature, witnessSignature] = await Promise.all([
    loadImage(config.landlord.signaturePath),
    loadImage(config.witnesses.landlord.signaturePath),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  drawCover(doc, data, premises);
  doc.addPage();
  const cursor: Cursor = { y: page.marginTop + 24 };
  drawDetails(doc, cursor, data, premises);

  writeSectionTitle(doc, cursor, "Terms and Conditions");
  writeParagraph(
    doc,
    cursor,
    'This Residential Tenancy Agreement (the "Agreement") is made between the Landlord and the Tenant identified above. The parties agree as follows:',
  );

  terms.forEach((term, index) => {
    addPageIfNeeded(doc, cursor, 42);
    setText(doc, 10.8, "bold");
    doc.text(`${index + 1}. ${term.title}`, page.marginX, cursor.y);
    cursor.y += 16;
    term.body.forEach((paragraph) => writeParagraph(doc, cursor, paragraph, 10.1));
  });

  drawSignatures(doc, cursor, data, landlordSignature, witnessSignature);
  headerFooter(doc);

  const blob = doc.output("blob");
  return {
    blob,
    url: URL.createObjectURL(blob),
    filename: buildFilename(data.apartmentNumber, data.tenantName),
  };
};
