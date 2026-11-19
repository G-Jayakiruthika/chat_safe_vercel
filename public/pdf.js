'use strict';

/**
 * pdf.js — Pure-JS Unicode-safe A4 PDF Generator for Urimai Grievance Kits.
 *
 * Why Canvas -> JPEG -> PDF 1.4?
 * Standard PDF Type1 Helvetica cannot render Tamil, Hindi, Telugu, Kannada, Malayalam,
 * Bengali, etc. Rendering to a crisp 1240x1754 A4 canvas preserves EVERY Indian script
 * natively, embeds the uploaded broken-pipe/road photo directly inside the document,
 * and draws the "Signatures of Affected Residents (Minimum 5 required)" table cleanly
 * with ZERO external CDN dependencies.
 */
(() => {
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function wrapLines(ctx, text, maxWidth) {
    const paragraphs = String(text || '').split('\n');
    const out = [];
    for (const para of paragraphs) {
      if (!para.trim()) {
        out.push('');
        continue;
      }
      const words = para.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  /** Build a valid single/multi-page PDF 1.4 binary Blob from JPEG data URLs (595x842 pt A4). */
  function jpegPagesToPdf(dataUrls) {
    const encoder = new TextEncoder();
    const parts = [];
    let offset = 0;
    const offsets = [0];

    const pushBytes = (bytes) => {
      parts.push(bytes);
      offset += bytes.length;
    };
    const pushStr = (s) => pushBytes(encoder.encode(s));

    pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    const pageObjIds = [];
    let nextId = 3; // 1 = Catalog, 2 = Pages

    const pageEntries = dataUrls.map((url) => {
      const b64 = url.split(',')[1];
      const bin = atob(b64);
      const imgBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) imgBytes[i] = bin.charCodeAt(i);
      const imgId = nextId++;
      const contentId = nextId++;
      const pageId = nextId++;
      pageObjIds.push(pageId);
      return { imgBytes, imgId, contentId, pageId };
    });

    // Obj 1: Catalog
    offsets[1] = offset;
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages
    offsets[2] = offset;
    pushStr(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`);

    for (const p of pageEntries) {
      // Image XObject (1240 x 1754)
      offsets[p.imgId] = offset;
      pushStr(`${p.imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.imgBytes.length} >>\nstream\n`);
      pushBytes(p.imgBytes);
      pushStr('\nendstream\nendobj\n');

      // Page content stream drawing full-bleed A4 image (595 x 842 pt)
      const streamStr = `q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n`;
      offsets[p.contentId] = offset;
      pushStr(`${p.contentId} 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}endstream\nendobj\n`);

      // Page object
      offsets[p.pageId] = offset;
      pushStr(`${p.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${p.imgId} 0 R >> >> /Contents ${p.contentId} 0 R >>\nendobj\n`);
    }

    const xrefPos = offset;
    const totalObjs = nextId;
    pushStr(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);
    for (let i = 1; i < totalObjs; i++) {
      pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    pushStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  /**
   * Generate and download the Urimai Official Grievance PDF.
   * @param {object} kit Urimai kit object
   * @param {string|null} photoDataUrl Optional evidence photo data URL
   */
  async function generateUrimaiPdf(kit, photoDataUrl = null) {
    const W = 1240;
    const H = 1754;
    const margin = 84;
    const contentW = W - margin * 2;
    const pages = [];

    const makePage = () => {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      // Official header stripe
      ctx.fillStyle = '#0f3d7a';
      ctx.fillRect(0, 0, W, 18);
      return { cv, ctx };
    };

    // --- Page 1: Official English Letter + Evidence Photo + 5-Resident Signature Table ---
    const p1 = makePage();
    let ctx = p1.ctx;
    let y = 76;

    ctx.fillStyle = '#0f3d7a';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('URIMAI CITIZEN GRIEVANCE PETITION', margin, y);
    y += 32;
    ctx.fillStyle = '#475569';
    ctx.font = '600 18px ui-monospace, monospace';
    ctx.fillText(`REF: ${kit.kitId || 'URM-LOCAL'}   |   DEPT: ${kit.department}`, margin, y);
    y += 18;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(W - margin, y);
    ctx.stroke();
    y += 34;

    // English Letter body
    ctx.fillStyle = '#0f172a';
    ctx.font = '21px system-ui, sans-serif';
    for (const line of wrapLines(ctx, kit.englishLetter, contentW)) {
      if (y > 980) break;
      ctx.fillText(line, margin, y);
      y += line === '' ? 14 : 28;
    }

    // Embedded Photo Evidence (if uploaded)
    y = Math.max(y + 18, 860);
    if (photoDataUrl) {
      try {
        const img = await loadImage(photoDataUrl);
        const boxW = 460;
        const boxH = 290;
        ctx.strokeStyle = '#0f3d7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, y, boxW, boxH);
        const ratio = Math.min(boxW / img.width, boxH / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        ctx.drawImage(img, margin + (boxW - dw) / 2, y + (boxH - dh) / 2, dw, dh);

        ctx.fillStyle = '#0f3d7a';
        ctx.font = 'bold 19px system-ui, sans-serif';
        ctx.fillText('PHOTOGRAPHIC EVIDENCE ATTACHED', margin + boxW + 28, y + 32);
        ctx.fillStyle = '#334155';
        ctx.font = '18px system-ui, sans-serif';
        for (const l of wrapLines(ctx, `Location: ${kit.location}\nReported via: ${kit.reporter}\nInstructions: ${kit.offlineInstructions}`, contentW - boxW - 28)) {
          ctx.fillText(l, margin + boxW + 28, y + 70);
          y += 26;
        }
        y = Math.max(y, 860) + boxH + 34;
      } catch { /* ignore invalid image */ }
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(margin, y, contentW, 74);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(margin, y, contentW, 74);
      ctx.fillStyle = '#475569';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(`Hand-Delivery Office: ${kit.office || kit.department}`, margin + 18, y + 44);
      y += 102;
    }

    // Signatures of Affected Residents (Minimum 5 required)
    y = Math.max(y, 1200);
    ctx.fillStyle = '#0f3d7a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(kit.signatureTableTitle || 'Signatures of Affected Residents (Minimum 5 required)', margin, y);
    y += 16;

    const rows = 5;
    const rowH = 74;
    const cols = [margin, margin + 70, margin + 410, margin + 760, W - margin];
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(margin, y, contentW, 44);
    ctx.strokeRect(margin, y, contentW, 44 + rows * rowH);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('#', cols[0] + 22, y + 29);
    ctx.fillText('Resident Full Name', cols[1] + 16, y + 29);
    ctx.fillText('Door No. / Street & Phone', cols[2] + 16, y + 29);
    ctx.fillText('Signature / Thumbprint', cols[3] + 16, y + 29);
    y += 44;

    for (let r = 0; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(margin, y + r * rowH);
      ctx.lineTo(W - margin, y + r * rowH);
      ctx.stroke();
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText(`${r + 1}.`, cols[0] + 22, y + r * rowH + 44);
    }
    for (let c = 1; c < cols.length - 1; c++) {
      ctx.beginPath();
      ctx.moveTo(cols[c], y - 44);
      ctx.lineTo(cols[c], y + rows * rowH);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '15px ui-monospace, monospace';
    ctx.fillText('Generated by Chat_Safe × Urimai Civic Engine · Page 1 of 2 (English Official Petition)', margin, H - 36);
    pages.push(p1.cv.toDataURL('image/jpeg', 0.92));

    // --- Page 2: Official Regional Language Petition (Tamil / Hindi / 23 Indian Scripts) ---
    if (kit.regionalLetter && kit.regionalLetter !== kit.englishLetter) {
      const p2 = makePage();
      ctx = p2.ctx;
      y = 80;
      ctx.fillStyle = '#0f3d7a';
      ctx.font = 'bold 28px system-ui, "Noto Sans Tamil", "Noto Sans Devanagari", sans-serif';
      ctx.fillText(`REGIONAL PETITION (${kit.langNative || kit.langName || 'Regional'})`, margin, y);
      y += 42;
      ctx.fillStyle = '#0f172a';
      ctx.font = '23px system-ui, "Noto Sans Tamil", "Noto Sans Devanagari", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Bengali", sans-serif';
      for (const line of wrapLines(ctx, kit.regionalLetter, contentW)) {
        if (y > H - 120) break;
        ctx.fillText(line, margin, y);
        y += line === '' ? 16 : 34;
      }
      ctx.fillStyle = '#64748b';
      ctx.font = '15px ui-monospace, monospace';
      ctx.fillText(`Generated by Chat_Safe × Urimai Civic Engine · Page 2 of 2 (${kit.langName})`, margin, H - 36);
      pages.push(p2.cv.toDataURL('image/jpeg', 0.92));
    }

    const blob = jpegPagesToPdf(pages);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urimai-${(kit.kitId || 'grievance').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  window.ChatSafePDF = { generateUrimaiPdf };
})();
