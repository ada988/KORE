"use client";

/**
 * Lightweight file-to-text extractors.
 * Uses the browser's native capabilities where possible, avoiding ~500 KB
 * dependencies like PDF.js and foliate-js. Trade-off: simpler extraction,
 * occasional misses. For heavy PDFs, user can copy-paste instead.
 */

export type ImportedFile = {
  title: string;
  body: string;
  sourceType: "pdf" | "epub" | "txt";
};

export async function importFile(file: File): Promise<ImportedFile> {
  const name = file.name;
  const ext = name.toLowerCase().split(".").pop() ?? "";

  if (ext === "txt" || ext === "md" || file.type.startsWith("text/")) {
    const text = await file.text();
    return {
      title: stripExt(name),
      body: cleanText(text),
      sourceType: "txt",
    };
  }

  if (ext === "pdf" || file.type === "application/pdf") {
    return await importPdf(file);
  }

  if (ext === "epub" || file.type === "application/epub+zip") {
    return await importEpub(file);
  }

  throw new Error("unsupported_format");
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * PDF import via lazy-loaded PDF.js.
 * Note: loads pdfjs-dist from esm.sh at runtime (no bundled cost for users
 * who never import a PDF). Slow first time, fine after.
 */
async function importPdf(file: File): Promise<ImportedFile> {
  // Dynamic import of pdfjs-dist via CDN
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((item: { str?: string }) => item.str ?? "")
      .join(" ");
    pages.push(text);
  }
  return {
    title: stripExt(file.name),
    body: cleanText(pages.join("\n\n")),
    sourceType: "pdf",
  };
}

let pdfjsPromise: Promise<{ getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> } }> | null = null;

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }>;
};

async function loadPdfJs(): Promise<{ getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> } }> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
    const mod = await dynImport("https://esm.sh/pdfjs-dist@4.7.76/legacy/build/pdf.mjs") as {
      getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
      GlobalWorkerOptions: { workerSrc: string };
    };
    mod.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/legacy/build/pdf.worker.mjs";
    return mod;
  })();
  return pdfjsPromise;
}

/**
 * EPUB import — simple ZIP unpacking + HTML-strip of every spine document.
 * Uses browser-native DecompressionStream where available (Chrome/Edge/Safari),
 * falls back to a tiny JSZip CDN import for Firefox.
 */
async function importEpub(file: File): Promise<ImportedFile> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);

  // Find OPF file via META-INF/container.xml
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("invalid_epub");
  const containerXml = await containerFile.async("text");
  const opfPath = /full-path=["']([^"']+)["']/i.exec(containerXml)?.[1];
  if (!opfPath) throw new Error("invalid_epub");

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error("invalid_epub");
  const opfXml = await opfFile.async("text");
  const title = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opfXml)?.[1]?.trim() ?? stripExt(file.name);

  // Extract spine order
  const spineIds: string[] = [];
  const spineRegex = /<itemref[^>]*idref=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = spineRegex.exec(opfXml)) !== null) {
    if (m[1]) spineIds.push(m[1]);
  }

  // Map id → href
  const manifest = new Map<string, string>();
  const itemRegex = /<item[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi;
  while ((m = itemRegex.exec(opfXml)) !== null) {
    if (m[1] && m[2]) manifest.set(m[1], m[2]);
  }

  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const chunks: string[] = [];
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;
    const full = opfDir + href;
    const f = zip.file(full);
    if (!f) continue;
    const html = await f.async("text");
    const text = stripHtml(html);
    if (text.length > 20) chunks.push(text);
  }

  return {
    title: decodeEntities(title),
    body: cleanText(chunks.join("\n\n")),
    sourceType: "epub",
  };
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

type JsZipInstance = {
  loadAsync: (data: File | ArrayBuffer | Blob) => Promise<{
    file: (path: string) => { async: (type: "text") => Promise<string> } | null;
  }>;
};

let jszipPromise: Promise<JsZipInstance> | null = null;

async function loadJsZip(): Promise<JsZipInstance> {
  if (jszipPromise) return jszipPromise;
  jszipPromise = (async () => {
    const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
    const mod = await dynImport("https://esm.sh/jszip@3.10.1") as { default?: JsZipInstance } & JsZipInstance;
    return mod.default ?? mod;
  })();
  return jszipPromise;
}
