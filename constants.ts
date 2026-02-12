import React from 'react';

export const SYSTEM_INSTRUCTION = `
You are an advanced medical document scanner and analyzer. 
Your task is to convert uploaded medical/pharmaceutical brochures, flyers, pamphlets, or clinical notes into structured text.

Rules:
1. **OCR & Formatting**: Extract text accurately. Maintain a consistent, professional medical format (Markdown).
2. **Summarization**: Lightly summarize the content without losing critical details (dosages, side effects, contraindications, study results).
3. **Graphics**: Explicitly describe any graphs, charts, or visual diagrams found in the document. Explain what data they hold.
4. **Exclusions**: COMPLETELY IGNORE QR codes, barcodes, social media logos (Facebook, Twitter, Instagram, etc.), app store badges, and generic marketing icons. Do not transcribe or describe them.
5. **Output**: Return ONLY a valid JSON object matching the requested schema.
`;

export const DOC_ICON = React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  className: "w-6 h-6"
}, React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
}));

export const CAMERA_ICON = React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  className: "w-6 h-6"
}, 
  React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
  }),
  React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
  })
);

export const CHECK_ICON = React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 2,
  stroke: "currentColor",
  className: "w-5 h-5 text-green-600"
}, React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  d: "m4.5 12.75 6 6 9-13.5"
}));