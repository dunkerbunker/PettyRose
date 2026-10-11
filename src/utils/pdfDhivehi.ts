import { jsPDF } from "jspdf";
import { dhivehi as dv, dhivehiDate, dhivehiTerms } from "../data/dhivehiAgreement";
import type { AgreementConfig, AgreementFormData, GeneratedAgreement } from "../types/agreement";
import { buildFilename, formatMoney, getApartment } from "./format";

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT = WIDTH - MARGIN * 2;
const SCALE = 2.5; // 180 dpi; bounded to one working canvas, including on mobile.
const FONT = '"Agreement Thaana", sans-serif';
let fontPromise: Promise<void> | undefined;

const loadFont = () => {
  if (!fontPromise) {
    fontPromise = (async () => {
      const font = new FontFace("Agreement Thaana", `url(${import.meta.env.BASE_URL}fonts/NotoSansThaana.ttf)`, { weight: "100 900" });
      const loaded = await font.load();
      document.fonts.add(loaded);
    })().catch((error: unknown) => {
      fontPromise = undefined; // A failed request must not poison subsequent retries.
      throw error;
    });
  }
  return fontPromise;
};

const loadSignature = (path: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Could not load the agreement signature."));
  image.src = `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
});

/**
 * Native canvas text layout handles Thaana vowel positioning and mixed RTL/LTR
 * values correctly. jsPDF's built-in text shaper only handles Arabic; emitting
 * that text directly corrupts Thaana. These high-resolution pages are embedded
 * losslessly, so readers need neither an installed font nor a shaping engine.
 * Dhivehi PDF text is rasterized (not selectable/searchable).
 */
export const generateDhivehiPdf = async (data: AgreementFormData, config: AgreementConfig): Promise<GeneratedAgreement> => {
  const [, landlordSignature, witnessSignature] = await Promise.all([
    loadFont(), loadSignature(config.landlord.signaturePath), loadSignature(config.witnesses.landlord.signaturePath),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(WIDTH * SCALE);
  canvas.height = Math.ceil(HEIGHT * SCALE);
  canvas.lang = "dv";
  canvas.dir = "rtl";
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas is unavailable.");
  const ctx = context;
  ctx.scale(SCALE, SCALE);
  ctx.direction = "rtl";
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({ title: dv.title, subject: dv.property, author: config.landlord.name });
  // jsPDF's setLanguage whitelist omits Dhivehi; use the PDF catalog directly.
  const internal = doc.internal as typeof doc.internal & { write: (value: string) => void };
  internal.events.subscribe("putCatalog", () => internal.write("/Lang (dv)"));
  const previewPages: string[] = [];
  let y = 65;
  let pageNumber = 0;
  const font = (size: number, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px ${FONT}`; };
  const text = (value: string, x: number, top: number, size = 10.5, bold = false, align: CanvasTextAlign = "right") => {
    font(size, bold);
    ctx.fillStyle = "#1c1c1c";
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, x, top);
  };
  const wrap = (value: string, width: number, size = 10.5, bold = false) => {
    font(size, bold);
    const lines: string[] = [];
    let line = "";
    // Split long unbroken values by base character + following combining marks.
    for (const word of value.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const cluster of word.match(/\P{M}\p{M}*|\p{M}+/gu) ?? []) {
        if (line && ctx.measureText(line + cluster).width > width) { lines.push(line); line = ""; }
        line += cluster;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };
  const clear = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    text(dv.property, WIDTH - MARGIN, 32, 8);
    ctx.strokeStyle = "#d5d5d5";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(MARGIN, 42); ctx.lineTo(WIDTH - MARGIN, 42); ctx.stroke();
    y = 65;
  };
  const finish = () => {
    pageNumber += 1;
    text(`${dv.title} | ${pageNumber}`, WIDTH / 2, HEIGHT - 28, 8, false, "center");
    // JPEG previews stay lightweight; the exported document uses lossless PNG.
    previewPages.push(canvas.toDataURL("image/jpeg", 0.9));
    if (pageNumber > 1) doc.addPage();
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, WIDTH, HEIGHT, undefined, "FAST");
  };
  const ensure = (height: number) => {
    if (y + height > HEIGHT - 58) { finish(); clear(); }
  };
  const paragraph = (value: string, size = 10.5, bold = false) => {
    const lines = wrap(value, CONTENT, size, bold);
    const lineHeight = size * 1.8;
    // Keep short paragraphs together; long ones can continue on the next page.
    ensure(Math.min(lines.length, 3) * lineHeight + 8);
    for (const line of lines) {
      ensure(lineHeight);
      text(line, WIDTH - MARGIN, y, size, bold);
      y += lineHeight;
    }
    y += 9;
  };
  const heading = (value: string) => {
    ensure(70);
    paragraph(value, 14, true);
    y += 2;
  };
  const row = (label: string, value: string) => {
    const labelWidth = 180;
    const values = wrap(value, CONTENT - labelWidth - 20);
    const labels = wrap(label, labelWidth - 18, 10, true);
    const height = Math.max(values.length, labels.length) * 19 + 16;
    ensure(height + 6);
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(WIDTH - MARGIN - labelWidth, y - 14, labelWidth, height);
    ctx.strokeStyle = "#b8b8b8";
    ctx.strokeRect(MARGIN, y - 14, CONTENT, height);
    ctx.strokeRect(WIDTH - MARGIN - labelWidth, y - 14, labelWidth, height);
    labels.forEach((line, index) => text(line, WIDTH - MARGIN - 9, y + index * 19, 10, true));
    values.forEach((line, index) => text(line, WIDTH - MARGIN - labelWidth - 9, y + index * 19));
    y += height;
  };

  const apartment = getApartment(config, data.apartmentNumber);
  const premises = `އެޕާޓްމެންޓު ${data.apartmentNumber}، ${apartment.floor} ވަނަ ފްލޯރު`;
  clear();
  y = 160;
  const titleLines = wrap(dv.title, CONTENT - 40, 24, true);
  titleLines.forEach((line) => { text(line, WIDTH / 2, y, 24, true, "center"); y += 48; });
  y += 25;
  text(dv.property, WIDTH / 2, y, 15, false, "center");
  y += 32;
  text(dv.address, WIDTH / 2, y, 11, false, "center");
  y += 90;
  row(dv.landlord, `${config.landlord.name} | ${dv.id}: ${config.landlord.idCardNo}`);
  row(dv.tenant, `${data.tenantName} | ${dv.id}: ${data.tenantIdCardNo}`);
  row(dv.apartment, premises);
  finish(); clear();

  heading(dv.details);
  row(dv.landlord, `${config.landlord.name} | ${config.landlord.idCardNo}`);
  row(dv.tenant, `${data.tenantName} | ${data.tenantIdCardNo}`);
  y += 30;
  heading(dv.contract);
  row(dv.signingDate, dhivehiDate(data.signingDate));
  row(dv.apartment, premises);
  row(dv.buildingAddress, dv.address);
  row(dv.term, `${dhivehiDate(data.startDate)} އިން ${dhivehiDate(data.endDate)} އަށް`);
  row(dv.rent, `${formatMoney(data.monthlyRent)} ރުފިޔާ؛ ކޮންމެ މަހެއްގެ ${config.constants.rentDueDay} ވަނަ ދުވަހު ނުވަތަ އޭގެ ކުރިން ދައްކަންވާނެ`);
  row(dv.deposit, `${formatMoney(data.securityDeposit)} ރުފިޔާ`);
  row(dv.account, config.landlord.paymentAccountDhivehi);
  y += 32;
  heading(dv.terms);
  paragraph(dv.intro);
  for (const [index, term] of dhivehiTerms(config).entries()) {
    ensure(88); // Keep each heading with the first lines of its clause.
    paragraph(`${index + 1}. ${term.title}`, 11.5, true);
    term.body.forEach((body) => paragraph(body));
    // Yield between sections so the generation indicator remains responsive.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  finish(); clear();
  heading(dv.execution);
  paragraph(dv.confirmation);
  y += 15;
  const signatureDetails = (name: string, id: string) =>
    [`${dv.name}: ${name}`, `${dv.id}: ${id}`, `${dv.date}: ${dhivehiDate(data.signingDate)}`]
      .map((value) => wrap(value, CONTENT / 2 - 24, 9));
  const signatureHeight = (name: string, id: string) =>
    Math.max(235, 174 + signatureDetails(name, id).reduce((height, lines) => height + lines.length * 16 + 3, 0) + 10);
  const signatureCell = (x: number, top: number, height: number, role: string, name: string, id: string, signature?: HTMLImageElement) => {
    const width = CONTENT / 2;
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(x, top, width, 35);
    ctx.strokeStyle = "#b8b8b8";
    ctx.strokeRect(x, top, width, height);
    text(role, x + width / 2, top + 23, 10, true, "center");
    text(`${dv.signature}:`, x + width - 12, top + 59, 10);
    if (signature) {
      const ratio = Math.min((width - 70) / signature.naturalWidth, 75 / signature.naturalHeight);
      const sw = signature.naturalWidth * ratio;
      const sh = signature.naturalHeight * ratio;
      ctx.drawImage(signature, x + (width - sw) / 2, top + 70 + (75 - sh) / 2, sw, sh);
    }
    ctx.beginPath(); ctx.moveTo(x + 12, top + 152); ctx.lineTo(x + width - 12, top + 152); ctx.stroke();
    let detailY = top + 174;
    for (const lines of signatureDetails(name, id)) {
      lines.forEach((line) => { text(line, x + width - 12, detailY, 9); detailY += 16; });
      detailY += 3;
    }
  };
  // RTL column order; preserve the same signatures, names, and identifiers.
  const partiesHeight = Math.max(signatureHeight(config.landlord.name, config.landlord.idCardNo), signatureHeight(data.tenantName, data.tenantIdCardNo));
  const witnessesHeight = Math.max(signatureHeight(config.witnesses.landlord.name, config.witnesses.landlord.idCardNo), signatureHeight("", ""));
  ensure(partiesHeight);
  signatureCell(MARGIN + CONTENT / 2, y, partiesHeight, dv.landlord, config.landlord.name, config.landlord.idCardNo, landlordSignature);
  signatureCell(MARGIN, y, partiesHeight, dv.tenant, data.tenantName, data.tenantIdCardNo);
  y += partiesHeight + 20;
  ensure(witnessesHeight);
  signatureCell(MARGIN + CONTENT / 2, y, witnessesHeight, dv.landlordWitness, config.witnesses.landlord.name, config.witnesses.landlord.idCardNo, witnessSignature);
  signatureCell(MARGIN, y, witnessesHeight, dv.tenantWitness, "", "");
  finish();
  canvas.width = 0; canvas.height = 0;
  const blob = doc.output("blob");
  return { blob, url: URL.createObjectURL(blob), filename: buildFilename(data.apartmentNumber, data.tenantName, "dv"), language: "dv", previewPages };
};
