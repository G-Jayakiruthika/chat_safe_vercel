'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const kitId = q.get('kit') || 'URM-PROXY';
  const dept = q.get('dept') || 'Municipal Water Board';
  const loc = q.get('loc') || 'Ward 12, Coimbatore';
  const lang = q.get('lang') || 'ta';
  const summary = q.get('summary') || 'The panchayat water pipe on our street broke 3 days ago and needs urgent repair.';

  $('pxKitId').textContent = kitId;
  $('pxDept').textContent = dept;
  $('pxLoc').textContent = `📍 ${loc}`;
  $('pxSummary').textContent = `"${summary}"`;

  let photoUrl = null;
  window.createBackground?.($('bg'), { reducedMotion: false });

  $('pxPhotoInput').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 4 * 1024 * 1024) {
      $('pxStatus').textContent = 'Please select a JPEG or PNG under 4 MB.';
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      photoUrl = r.result;
      $('pxPreview').src = photoUrl;
      $('pxPreview').hidden = false;
      $('pxStatus').textContent = '✅ Photo attached! Ready to generate PDF.';
      try {
        localStorage.setItem(`chatsafe.proxyPhoto.${kitId}`, photoUrl);
      } catch { /* ignore */ }
    };
    r.readAsDataURL(f);
  });

  $('pxPdfBtn').addEventListener('click', async () => {
    $('pxStatus').textContent = 'Building bilingual A4 PDF…';
    let kit = null;
    try {
      kit = await window.ChatSafeAPI.call('urimai', { text: summary, lang, location: loc, department: dept });
    } catch {
      kit = {
        kitId,
        department: dept,
        location: loc,
        reporter: 'Local Proxy Neighbor / e-Seva',
        langName: 'Regional',
        englishLetter: `To,\nThe Executive Officer,\n${dept}, ${loc}.\n\nSubject: Urgent Civic Grievance — ${summary}\n\nRespected Sir/Madam,\nWe request urgent repair of the civic issue reported above.\n\nResidents of ${loc}`,
        regionalLetter: summary,
        signatureTableTitle: 'Signatures of Affected Residents (Minimum 5 required)',
        offlineInstructions: `Print this document, collect 5 signatures from your street, and deliver it to ${dept}.`,
      };
    }
    kit.kitId = kitId;
    await window.ChatSafePDF.generateUrimaiPdf(kit, photoUrl);
    $('pxStatus').textContent = '✅ PDF downloaded! Collect 5 resident signatures and submit locally.';
  });
})();
