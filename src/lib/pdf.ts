import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { quoteTotals, money } from "./finance";
import type { Quote, Bakery } from "./types";
import { imageUrl } from "./data";
const palettes = {
  delicado: {
    accent: "#A44D68",
    bg: "#FCF0F3",
    title: "Feito com carinho para você",
  },
  elegante: {
    accent: "#5D4438",
    bg: "#F4EEE5",
    title: "Uma ocasião especial merece cuidado",
  },
  moderno: {
    accent: "#315B55",
    bg: "#EAF3EF",
    title: "Sua próxima celebração começa aqui",
  },
};
export interface PdfFonts {
  normal: string;
  bold: string;
  serif: string;
}
let fontPromise: Promise<PdfFonts> | undefined;
function loadFonts() {
  return (fontPromise ??= (async () => {
    const files = ["DoceSans.ttf", "DoceSans-Bold.ttf", "DoceSerif-Bold.ttf"];
    const values = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(`/fonts/${file}`);
        if (!response.ok)
          throw new Error("Não foi possível carregar as fontes do PDF.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      }),
    );
    return { normal: values[0], bold: values[1], serif: values[2] };
  })().catch((e) => {
    fontPromise = undefined;
    throw e;
  }));
}
export async function makePdf(q: Quote, b: Bakery, providedFonts?: PdfFonts) {
  const doc = new jsPDF({ format: "a4", compress: true });
  const fonts = providedFonts ?? (await loadFonts());
  doc.addFileToVFS("DoceSans.ttf", fonts.normal);
  doc.addFont("DoceSans.ttf", "Doce", "normal");
  doc.addFileToVFS("DoceSans-Bold.ttf", fonts.bold);
  doc.addFont("DoceSans-Bold.ttf", "Doce", "bold");
  doc.addFileToVFS("DoceSerif-Bold.ttf", fonts.serif);
  doc.addFont("DoceSerif-Bold.ttf", "DoceSerif", "bold");
  const palette = palettes[q.template];
  const totals = quoteTotals(q.items, q.discount, q.discount_type, q.delivery);
  const width = 170;
  const safe = (s: string) =>
    Array.from(s)
      .filter((c) => c.charCodeAt(0) >= 32 || c === "\n" || c === "\t")
      .join("");
  const header = (first: boolean) => {
    doc.setFillColor(palette.bg);
    doc.rect(0, 0, 210, first ? 66 : 31, "F");
    doc.setTextColor(palette.accent);
    doc.setDrawColor(b.color);
    doc.setLineWidth(1);
    doc.line(20, first ? 54 : 29, 65, first ? 54 : 29);
    if (q.template === "delicado" && first) {
      doc.setDrawColor("#E1B9C6");
      doc.circle(196, 7, 15, "S");
      doc.circle(191, 10, 15, "S");
    }
    doc.setFont(q.template === "elegante" ? "DoceSerif" : "Doce", "bold");
    doc.setFontSize(first ? 23 : 14);
    doc.text(safe(b.name || "Minha confeitaria"), 20, first ? 27 : 18, {
      maxWidth: 140,
    });
    if (first) {
      doc.setFont("Doce", "normal");
      doc.setFontSize(10);
      doc.text(safe(palette.title), 20, 39);
      doc.text(
        safe([b.whatsapp, b.instagram, b.city].filter(Boolean).join(" | ")),
        20,
        49,
        { maxWidth: width },
      );
    }
    doc.setFontSize(9);
    doc.text(
      `PROPOSTA ${q.id.slice(0, 8).toUpperCase()}`,
      190,
      first ? 59 : 25,
      { align: "right" },
    );
  };
  header(true);
  if (b.logo_path) {
    const blob = await fetch(await imageUrl(b.logo_path)).then((r) => {
      if (!r.ok) throw new Error("Não foi possível carregar o logotipo.");
      return r.blob();
    });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const ratio = bitmap.width / bitmap.height;
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      167,
      14,
      Math.min(25, 25 * ratio),
      Math.min(25, 25 / ratio),
    );
    bitmap.close();
  }
  doc.setTextColor("#463B37");
  doc.setFontSize(10);
  const issued = q.created_at
    ? new Date(q.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  let y = 77;
  const text = (value: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("Doce", bold ? "bold" : "normal");
    const lines: string[] = doc.splitTextToSize(safe(value), width);
    for (const line of lines) {
      if (y > 268) {
        doc.addPage();
        header(false);
        y = 42;
      }
      doc.setFontSize(size);
      doc.setFont("Doce", bold ? "bold" : "normal");
      doc.setTextColor("#463B37");
      doc.text(line, 20, y);
      y += size * 0.47 + 1;
    }
    y += 3;
  };
  text(`Preparado para ${q.customer}`, 15, true);
  text(
    `Emissão: ${issued}  |  Validade: ${new Date(q.validity + "T12:00:00").toLocaleDateString("pt-BR")}`,
  );
  if (q.whatsapp) text(`Contato: ${q.whatsapp}`);
  if (q.event_date)
    text(`Evento: ${q.event_date.split("-").reverse().join("/")}`);
  if (q.delivery_date)
    text(`Entrega: ${q.delivery_date.split("-").reverse().join("/")}`);
  if (q.address) text(`Local: ${q.address}`);
  autoTable(doc, {
    startY: y + 2,
    margin: { left: 20, right: 20, top: 39, bottom: 25 },
    head: [["Produto / descrição", "Qtd.", "Unitário", "Subtotal"]],
    body: q.items.map((i, index) => [
      `${i.name}${i.description ? "\n" + i.description : ""}`,
      i.quantity,
      money(i.price),
      money(totals.subtotals[index]),
    ]),
    theme: q.template === "moderno" ? "plain" : "striped",
    headStyles: {
      fillColor: palette.accent,
      textColor: "#FFFFFF",
      fontSize: 10,
      cellPadding: 4,
    },
    styles: {
      font: "Doce",
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: "#463B37",
    },
    columnStyles: {
      0: { cellWidth: 83 },
      1: { cellWidth: 17, halign: "right" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    rowPageBreak: "avoid",
    willDrawPage: () => {
      if (doc.getNumberOfPages() > 1) header(false);
    },
    didDrawPage: (hook) => {
      y = hook.cursor?.y ?? y;
    },
  });
  y += 12;
  text(`Subtotal: ${money(totals.subtotal)}`);
  text(
    `Desconto: ${money(totals.discount)}   |   Entrega: ${money(q.delivery)}`,
  );
  text(`TOTAL: ${money(totals.total)}`, 18, true);
  if (q.deposit !== "0") text(`Entrada: ${money(q.deposit)}`);
  if (q.payment) text("Pagamento: " + q.payment);
  if (q.notes) text("Observações: " + q.notes);
  if (q.message) text(q.message, 11);
  for (let n = 1; n <= doc.getNumberOfPages(); n++) {
    doc.setPage(n);
    doc.setDrawColor(palette.accent);
    doc.line(20, 281, 190, 281);
    doc.setFontSize(8);
    doc.setFont("Doce", "normal");
    doc.setTextColor("#70635F");
    doc.text(safe(b.name || "Proposta comercial"), 20, 288);
    doc.text(`${n} / ${doc.getNumberOfPages()}`, 190, 288, { align: "right" });
  }
  return doc;
}
