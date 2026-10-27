import { it, expect } from "vitest";
import { makePdf } from "../src/lib/pdf";
import { emptyBakery } from "../src/lib/data";
import type { Quote } from "../src/lib/types";
// Subpath avoids pdf-parse's CLI example executing during import.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
for (const template of ["delicado", "elegante", "moderno"] as const)
  it(`exporta PDF ${template} multipágina com português e totais`, async () => {
    const quote: Quote = {
      id: "a1234567-quote",
      customer: "João e Conceição",
      whatsapp: "",
      event_date: "",
      delivery_date: "2026-12-10",
      address: "Rua das Flores",
      status: "rascunho",
      discount: "10",
      discount_type: "fixed",
      delivery: "5",
      validity: "2026-12-01",
      payment: "Pix, 50% de entrada",
      deposit: "0",
      notes: "Conservar refrigerado. ".repeat(80),
      message: "Obrigada pela confiança!",
      template,
      items: Array.from({ length: 65 }, (_, n) => ({
        product_id: null,
        name: `Doce ${n + 1}`,
        description: "Chocolate e avelã",
        price: "10",
        quantity: "2",
      })),
    };
    const doc = await makePdf(
      quote,
      {
        ...emptyBakery,
        name: "Confeitaria Açúcar",
      },
      {
        normal: readFileSync("public/fonts/DoceSans.ttf").toString("base64"),
        bold: readFileSync("public/fonts/DoceSans-Bold.ttf").toString("base64"),
        serif: readFileSync("public/fonts/DoceSerif-Bold.ttf").toString(
          "base64",
        ),
      },
    );
    const buffer = Buffer.from(doc.output("arraybuffer"));
    const parsed = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    }).promise;
    let text = "";
    for (let p = 1; p <= parsed.numPages; p++) {
      const content = await (await parsed.getPage(p)).getTextContent();
      text += content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
    }
    const result = { numpages: parsed.numPages, text };
    mkdirSync("artifacts/pdfs", { recursive: true });
    writeFileSync(`artifacts/pdfs/${template}.pdf`, buffer);
    await parsed.cleanup();
    expect(result.numpages).toBeGreaterThan(2);
    expect(result.text).toContain("João e Conceição");
    expect(result.text).toContain("Doce 65");
    expect(result.text).toContain("1.295,00");
    expect(result.text).toContain("Obrigada pela confiança!");
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
