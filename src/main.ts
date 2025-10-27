import {
  convert_canvas_to_luma as convertCanvasToLuma,
  DecodeHintDictionary,
  DecodeHintTypes,
  decode_multi as decodeMulti,
} from "rxing-wasm";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const input = document.getElementById("Input") as HTMLInputElement;
const output = document.getElementById("Output") as HTMLPreElement;
const button = document.getElementById("Button") as HTMLButtonElement;
const canvasesContainer = document.getElementById("CanvasContainer") as HTMLDivElement;
const canvases = canvasesContainer.getElementsByTagName("canvas");
const hints = new DecodeHintDictionary();

// hints.set_hint(DecodeHintTypes.PossibleFormats, "itf");
// hints.set_hint(DecodeHintTypes.PossibleFormats, "qrcode");
hints.set_hint(DecodeHintTypes.TryHarder, "true");

function clearOutput() {
  output.textContent = "";
}

function setOutput(content: string) {
  output.textContent = content;
  output.style.color = "black";
}

function setError(content: string) {
  output.textContent = content;
  output.style.color = "red";
}

function deleteAllCanvas() {
  canvasesContainer.replaceChildren();
}

function appendNewCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  canvasesContainer.appendChild(canvas);

  return canvas;
}

function decodeFromCanvas(canvas: HTMLCanvasElement): string[] {
  const luma8Data = convertCanvasToLuma(canvas);

  try {
    const barcodes = decodeMulti(luma8Data, canvas.width, canvas.height, hints);

    console.log(barcodes);

    return barcodes.map((barcode) => barcode.text());
  } catch (_) {
    return [];
  }
}

function handleImage(image: HTMLImageElement) {
  image.onerror = () => setError("não foi possível carregar a imagem");
  image.onload = () => {
    const canvas = appendNewCanvas();
    const context = canvas.getContext("2d")!;

    canvas.width = image.width;
    canvas.height = image.height;

    context.drawImage(image, 0, 0);
  };
}

async function handlePdf(file: File) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(data).promise;

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3 });
    const canvas = appendNewCanvas();

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({ canvas, viewport }).promise;
  }
}

input.addEventListener("change", () => {
  const file = input.files?.item(0);

  clearOutput();
  deleteAllCanvas();

  if (!file) {
    setError("nenhum arquivo");

    return;
  }

  if (file.type.startsWith("image/")) {
    const image = new Image();

    image.src = URL.createObjectURL(file);

    handleImage(image);

    return;
  }

  if (file.type == "application/pdf") {
    handlePdf(file);

    return;
  }

  setError("tipo de arquivo inválido");
});

button.addEventListener("click", () => {
  const lines: string[] = [];

  for (const canvas of canvases) {
    const barcodes = decodeFromCanvas(canvas);
    console.log(barcodes);

    lines.push(...barcodes);
  }

  if (lines.length > 0) {
    setOutput(lines.join("\n"));
  } else {
    setError("nenhum código de barras encontrado");
  }
});
