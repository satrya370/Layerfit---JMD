/** Synthetic images shared by template fixtures. Invented shapes only: no LayerFit, competitor or owner photos. */
import sharp from 'sharp';

export const BOTTLE = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect x="270" y="60" width="160" height="100" rx="20" fill="#283640"/><rect x="190" y="140" width="320" height="680" rx="92" fill="#dc8452"/><rect x="220" y="330" width="260" height="190" rx="20" fill="#faeddf"/><circle cx="350" cy="425" r="50" fill="#283640"/></svg>`;
export const SHIRT = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><path d="M220 70L90 170 20 360 160 420 210 320 180 840 520 840 490 320 540 420 680 360 610 170 480 70 390 120 310 120Z" fill="#385d4b"/><path d="M310 120Q350 220 390 120" fill="none" stroke="#c4d6c8" stroke-width="18"/></svg>`;
export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#c9b79c"/><rect y="560" width="1200" height="340" fill="#8a6a45"/><rect x="420" y="250" width="360" height="420" rx="60" fill="#dc8452"/><circle cx="600" cy="460" r="70" fill="#faeddf"/></svg>`;
export const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120"><rect width="480" height="120" rx="20" fill="#304b3a"/><text x="240" y="76" font-size="52" text-anchor="middle" fill="#ffffff" font-family="Arial">SIMULATIE</text></svg>`;

export const png = (svg: string): Promise<Buffer> => sharp(Buffer.from(svg)).png().toBuffer();
