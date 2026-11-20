'use strict';

/**
 * Chat_Safe × Urimai — deterministic local fallback engine.
 *
 * Pure, DOM-free rules used whenever the Gemini proxy is offline, slow or
 * returns an error. Loaded before app.js and exposed as `window.ChatSafeEngine`.
 */
(function initFallbackEngine(root) {
    const CANONICAL_BUS_AGENTS = ['vani', 'gemini', 'kavach', 'urimai', 'netra', 'setu'];

    /**
     * Maps a numeric 0–100 threat score to one canonical severity tier so banner
     * color, gauge level, verdict copy, and threat chips always stay synchronized.
     *
     * @param {number} score Risk score between 0 and 100.
     * @returns {Object} Normalized tier metadata (`safe`, `moderate`, or `critical`).
     */
    function getThreatTier(score) {
      const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
      if (s <= 25) {
        return {
          score: s,
          tier: 'safe',
          level: 'safe',
          intent: 'SAFE',
          cardClass: 'safe',
          pillClass: 'green',
          badgeLabel: 'KAVACH SAFE CHECK',
          verdict: 'Looks safe. No common scam pattern found',
          scamType: 'Verified Safe Message',
          mood: 'safe',
        };
      }
      if (s <= 65) {
        return {
          score: s,
          tier: 'moderate',
          level: 'suspicious',
          intent: 'MODERATE',
          cardClass: 'moderate',
          pillClass: 'amber',
          badgeLabel: 'MODERATE RISK WARNING',
          verdict: 'Moderate / Low Risk — Verify Sender Before Acting',
          scamType: 'Unverified / Suspicious Request',
          mood: 'suspicious',
        };
      }
      return {
        score: s,
        tier: 'critical',
        level: 'critical',
        intent: 'SCAM',
        cardClass: 'scam',
        pillClass: 'red',
        badgeLabel: 'HIGH RISK SCAM ALERT',
        verdict: 'High Risk / Critical Scam Detected',
        scamType: 'Active Cyber Fraud Pattern',
        mood: 'critical',
      };
    }

    /**
     * Normalizes an agent list into canonical Agent Bus badge identifiers.
     *
     * @param {unknown} rawAgents Candidate agent IDs or display names.
     * @param {'SCAM'|'CIVIC'} intent Classified domain intent.
     * @param {number} [score=0] Threat or confidence score on 0-100 scale.
     * @returns {string[]} Deduplicated canonical bus IDs.
     */
    function normalizeBusAgents(rawAgents, intent, score = 0) {
      const isCivic = String(intent || '').toUpperCase() === 'CIVIC';
      const mapToken = (val) => {
        const token = String(val || '').toLowerCase().trim();
        if (!token) return null;
        if (CANONICAL_BUS_AGENTS.includes(token)) return token;
        if (token.includes('vani')) return 'vani';
        if (token.includes('gemini')) return 'gemini';
        if (token.includes('kavach')) return 'kavach';
        if (token.includes('urimai')) return 'urimai';
        if (token.includes('netra')) return 'netra';
        if (token.includes('setu')) return 'setu';
        return null;
      };
      const mapped = Array.isArray(rawAgents)
        ? [...new Set(rawAgents.map(mapToken).filter(Boolean))]
        : [];

      if (isCivic) {
        const set = new Set(['vani', 'gemini', 'urimai', 'setu']);
        if (mapped.includes('netra')) set.add('netra');
        return [...set];
      }

      const set = new Set(['vani', 'gemini', 'kavach']);
      if (score > 25 || mapped.includes('netra')) set.add('netra');
      if (score >= 66 && mapped.includes('setu')) set.add('setu');
      return [...set];
    }

    const FALLBACK_SCAM_RULES = [
      {
        id: 'digital_arrest',
        categoryId: 'digital_arrest',
        label: 'Digital Arrest / Fake Law Enforcement',
        score: 95,
        moderateScore: 54,
        patterns: [
          /\bdigital\s*arrest\b/i,
          /\b(cbi|ncb|enforcement\s*directorate|ed\s*officer|customs\s*officer|cyber\s*(?:cell|police|crime)|trai|supreme\s*court|rbi\s*officer)\b/i,
          /\b(arrest\s*warrant|non[- ]?bailable|money\s*laundering|hawala|fir\s*(?:registered|filed)|stay\s*on\s*(?:this\s*)?(?:video\s*)?call|do\s*not\s*disconnect)\b/i,
          /\b(inspector|officer)\b.{0,40}\b(police|cbi|ncb|warrant|jail|arrest)\b/i,
          /गिरफ्तार|वारंट|पुलिस\s*केस|डिजिटल\s*अरेस्ट/i,
          /கைது|வாரண்ட்|போலீஸ்\s*வழக்கு|டிஜிட்டல்\s*கைது/i,
        ],
        vectors: [
          'Digital Arrest & Fake Authority Fear Tactic',
          'Coerced Secrecy / Video-Call Isolation',
          'Illegal Bail / Verification Money Demand',
        ],
        summary: 'CRITICAL SCAM: Fake CBI/Police "Digital Arrest" fraud detected. Indian law enforcement never conducts arrests on video calls.',
        checklist: [
          'Hang up the video/voice call immediately — real police, CBI, or RBI never conduct "digital arrests" online.',
          'Do NOT transfer money to any "RBI verification" or "safe custody" account or keep the call secret from family.',
          'Report the caller number and screenshot immediately on Helpline 1930 or https://cybercrime.gov.in.',
        ],
      },
      {
        id: 'courier_parcel',
        categoryId: 'courier',
        label: 'Courier / Customs Parcel Scam',
        score: 92,
        patterns: [
          /\b(fedex|dhl|blue\s*dart|dtdc|india\s*post|inida-post|courier|parcel|package)\b.{0,80}\b(drugs?|mdma|illegal|seized|customs|passports?|clearance|failed|return|update\s*address|fee)\b/i,
          /\b(drugs?|mdma|illegal|seized|customs|contraband)\b.{0,80}\b(fedex|dhl|blue\s*dart|courier|parcel|package)\b/i,
          /पार्सल|कूरियर|कस्टम्स/i,
          /பார்சல்|கூரியர்|சுங்க/i,
        ],
        vectors: [
          'Fake Courier / Customs Contraband Claim',
          'Lookalike Tracking Domain or Clearance Fee Trap',
          'Authority Escalation Impersonation',
        ],
        summary: 'HIGH RISK SCAM: Fake courier/customs parcel threat detected. Genuine couriers never demand clearance fees or threaten drug seizures over phone/SMS.',
        checklist: [
          'Disconnect and never tap unknown parcel tracking links (check only inside official courier apps).',
          'Never pay "customs clearance" fees or speak to transferred "cyber officers".',
          'Report the number and URL immediately at 1930 or https://cybercrime.gov.in.',
        ],
      },
      {
        id: 'fake_investment',
        categoryId: 'investment',
        label: 'Fake Investment / SEBI VIP Stock Scam',
        score: 93,
        patterns: [
          /\b(sebi\s*vip|vip\s*(?:stock|trading)\s*(?:tips?|group)|institutional\s*(?:account|trading)|fii\s*account)\b/i,
          /\b(guaranteed\s*(?:returns?|profit|income)|double\s*(?:your\s*)?money|10x\s*return|100%\s*profit)\b/i,
          /\b\d{1,3}\s*%\s*(?:daily|per\s*day|weekly|monthly)\b|\b(stock|share|ipo|crypto)\s*(?:tips?|allotment|profit)\b.{0,60}\b(deposit|transfer|join|t\.me|telegram|@ybl|@ok|@paytm)\b/i,
          /\b(withdrawal\s*(?:fee|tax|charges)|trading\s*app)\b/i,
          /मुनाफा|गारंटी|पैसा\s*डबल/i,
          /லாபம்|இரட்டிப்பு|பணம்\s*இரட்டிப்பு/i,
        ],
        vectors: [
          'Guaranteed Daily Return Promise (Impossible)',
          'Unregistered Telegram / VIP Stock Group',
          'Non-@valid Personal UPI Collection Handle',
        ],
        summary: 'HIGH RISK SCAM: Fake SEBI/VIP stock investment trap detected. Legitimate SEBI-registered brokers never promise guaranteed returns or use personal UPI IDs.',
        checklist: [
          'Do NOT transfer money or install third-party trading APKs from Telegram/WhatsApp groups.',
          'Verify broker handles strictly with NPCI SEBI-verified "@valid" UPI IDs in Pay-Check.',
          'Report the Telegram group and UPI ID to 1930 / https://cybercrime.gov.in immediately.',
        ],
      },
      {
        id: 'electricity_bill',
        categoryId: 'reward_bill',
        label: 'Electricity Bill Disconnection Scam',
        score: 90,
        patterns: [
          /\b(electricity|power|tneb|bescom|msedcl|tata\s*power|uppcl|bill)\b.{0,80}\b(disconnect(?:ed|ion)?|cut\s*(?:tonight|today)|power\s*cut|update\s*bill|last\s*warning|call\s*\d|98x+|apk|bit\.ly)\b/i,
          /\b(disconnect(?:ed|ion)?|power\s*(?:will\s*be\s*)?cut)\b.{0,50}\b(tonight|today|bill|electricity|tneb)\b/i,
          /बिजली\s*(?:बिल|कट|कनेक्शन)/i,
          /மின்\s*(?:இணைப்பு|கட்டணம்|துண்டி)/i,
        ],
        vectors: [
          'Urgent Midnight Power-Cut Fear Tactic',
          'Fake Utility Officer Phone Number / AnyDesk Trap',
        ],
        summary: 'HIGH RISK SCAM: Fake electricity bill disconnection threat detected. Power utilities never disconnect meters via private mobile numbers or APK links.',
        checklist: [
          'Never call unknown mobile numbers in SMS threats or install screen-sharing apps (AnyDesk/TeamViewer).',
          'Check your actual bill status only in your official state DISCOM/TNEB app or printed bill helpline.',
          'Block and report the scammer number to 1930 or https://cybercrime.gov.in.',
        ],
      },
      {
        id: 'kyc_otp',
        categoryId: 'kyc_otp',
        label: 'KYC / OTP / Account-Block Fraud',
        score: 91,
        moderateScore: 52,
        patterns: [
          /\b(kyc|pan|aadhaar|cif)\b.{0,45}\b(expire|update|block|suspend|deactivat|frozen|verify|pending)\b/i,
          /\b(bank|account|atm|debit|credit|sim|card)\b.{0,45}\b(blocked|suspended|deactivated|closed|frozen)\b/i,
          /\b(share|send|tell|give|enter|verify|update|asked\s*(?:for)?)\b.{0,30}\b(otp|pin|cvv|mpin|password)\b/i,
          /\b(anydesk|teamviewer|quick\s*support|rustdesk|\.apk)\b/i,
          /\b(is\s*this\s*caller\s*really\s*from\s*my\s*bank|caller\s*from\s*(?:my\s*)?bank)\b/i,
          /खाता\s*बंद|ओटीपी|केवाईसी/i,
          /கணக்கு\s*முடக்க|ஓடிபி|கேஒய்சி/i,
        ],
        vectors: [
          'Fake Bank KYC / Account-Block Urgency',
          'OTP / Credential / Remote Screen-Share Harvesting',
        ],
        summary: 'HIGH RISK SCAM: Banking KYC/OTP phishing detected. Genuine banks never ask for your OTP, PIN, or APK installation over calls or links.',
        moderateSummary: 'VERIFICATION WARNING: Never confirm caller identity on an incoming call — hang up and call your bank’s printed helpline number.',
        checklist: [
          'Never share any OTP, PIN, CVV, or click SMS KYC links (.apk / shortened URLs).',
          'Hang up immediately and dial the official customer-care number printed on the back of your bank card.',
          'If an OTP was shared or money debited, dial 1930 within the Golden Hour to freeze the transfer.',
        ],
      },
      {
        id: 'task_job',
        categoryId: 'task_job',
        label: 'Part-Time Task / Prepaid Job Scam',
        score: 89,
        patterns: [
          /\b(part[\s-]*time\s*job|work\s*from\s*home|prepaid\s*task|merchant\s*task|premium\s*task)\b/i,
          /\b(like|subscribe|rate|review)\b.{0,40}\b(youtube|videos?|hotels?|google\s*maps|products?)\b/i,
          /\bearn\s*(?:₹|rs\.?|inr)?\s*\d[\d,]*.{0,25}\b(daily|per\s*day|a\s*day)\b/i,
          /घर\s*बैठे\s*कमाई|पार्ट\s*टाइम\s*जॉब/i,
          /வீட்டிலிருந்தே\s*சம்பாதி|யூடியூப்/i,
        ],
        vectors: [
          'Unrealistic Daily Pay for Simple Likes/Reviews',
          'Upfront "Prepaid Task" Deposit Trap',
        ],
        summary: 'HIGH RISK SCAM: Prepaid part-time task job scam detected. Real employers pay you — they never ask you to deposit money to unlock tasks.',
        checklist: [
          'Stop immediately and do NOT send any "prepaid task" or "merchant upgrade" deposit.',
          'Leave the Telegram/WhatsApp task group and block all handler numbers.',
          'Report every UPI ID and bank account used for task deposits on 1930 or https://cybercrime.gov.in.',
        ],
      },
      {
        id: 'reward_bill',
        categoryId: 'reward_bill',
        label: 'Lottery / Reward Processing-Fee Scam',
        score: 88,
        patterns: [
          /\b(won|winner|selected|congratulations)\b.{0,55}\b(lottery|prize|lucky\s*draw|kbc|jackpot|car|iphone|crore|lakh|cashback|reward)\b/i,
          /\b(processing|registration|gst|tax|delivery)\s*fee\b.{0,45}\b(claim|prize|lottery|reward|gift)\b/i,
          /\b(claim|unlock)\b.{0,35}\b(prize|lottery|free\s*gift|reward)\b/i,
          /लॉटरी|इनाम|कौन\s*बनेगा/i,
          /லாட்டரி|பரிசு/i,
        ],
        vectors: [
          'Unsolicited Lottery / KBC Prize Lure',
          'Advance Processing / Tax Fee Extortion',
        ],
        summary: 'HIGH RISK SCAM: Fake lottery/reward fee scam detected. You can never win a lottery you did not enter, and genuine prizes never charge upfront fees.',
        checklist: [
          'Do NOT pay any processing fee, GST, or registration charge to release a "prize".',
          'Never share bank account details, Aadhaar, or UPI PIN to claim cashback/gifts.',
          'Block the sender and file a 1930 cybercrime alert if any fee was transferred.',
        ],
      },
      {
        id: 'family_voice',
        categoryId: 'family_voice',
        label: 'AI Family Voice-Cloning Emergency Scam',
        score: 94,
        patterns: [
          /\b(this\s*is\s*my\s*new\s*number|new\s*number\s*save)\b/i,
          /\b(accident|hospital|icu|arrested|police\s*station)\b.{0,80}\b(transfer|send|pay|urgent|₹|rs\.?|inr)\b/i,
          /\b(mummy|papa|amma|appa|mom|dad|beta|son|daughter)\b.{0,65}\b(accident|hospital|urgent|new\s*number|voice|don'?t\s*tell|do\s*not\s*tell)\b/i,
          /\b(voice\s*clon|ai\s*voice)\b/i,
        ],
        vectors: [
          'AI Voice-Cloning / New-Number Impersonation',
          'Panic Emergency + Secrecy Pressure ("Do Not Tell")',
        ],
        summary: 'CRITICAL SCAM: Suspected AI family voice-cloning emergency scam! Always hang up and call your relative directly on their saved number.',
        checklist: [
          'HANG UP immediately — AI tools can clone a loved one’s voice from short social-media clips.',
          'Call the family member directly on their OLD saved phone number (not the new unknown number).',
          'Verify with your family safe-word before sending a single rupee; report fraud numbers to 1930.',
        ],
      },
      {
        id: 'sextortion_loan',
        categoryId: 'sextortion_loan',
        label: 'Loan-App Harassment / Sextortion Blackmail',
        score: 93,
        patterns: [
          /\b(morphed|nude|private)\s*(photo|photos|video|videos|pics?)\b/i,
          /\b(viral|leak|send\s*to\s*(?:all\s*)?(?:your\s*)?(?:contacts|family|friends))\b/i,
          /\b(loan\s*app|instant\s*loan)\b.{0,50}\b(contacts|harass|morphed|blackmail|no\s*cibil)\b/i,
        ],
        vectors: [
          'Morphed Photo / Contact-List Blackmail',
          'Predatory Instant Loan App Extortion',
        ],
        summary: 'CRITICAL SCAM: Loan-app blackmail / sextortion threat detected. This is a criminal offense against you — do NOT pay.',
        checklist: [
          'Do NOT pay extortion demands (paying invites repeated blackmail).',
          'Screenshot chats/numbers, revoke contacts permissions, and inform a trusted family member.',
          'File an urgent complaint on Helpline 1930 or https://cybercrime.gov.in (women/citizen cyber protection).',
        ],
      },
    ];

    const FALLBACK_CIVIC_RULES = [
      {
        id: 'water_pipe',
        department: 'Municipal Water Supply & Drainage Board',
        score: 94,
        patterns: [
          /\b(water\s*pipe|drinking\s*water|pipe\s*(?:br(?:oke|oken)|burst|leak)|water\s*leak(?:age)?|no\s*water|tap\s*water|borewell|overhead\s*tank|water\s*supply|pipeline)\b/i,
          /தண்ணீர்|குடிநீர்|குழாய்|பைப்\s*உடை/i,
          /पानी|पाइप|नल|जल\s*बोर्ड/i,
          /నీరు|పైపు|తాగునీరు/i,
        ],
        summary: 'Civic water supply breakdown classified for Urimai O2O & CM Helpline escalation.',
        checklist: [
          'Confirm GPS ward coordinates and snap 1 photo of the leaking/broken water pipe.',
          'Download the bilingual English + regional Urimai A4 PDF with the 5-resident signature table.',
          'Submit remotely via State CM Helpline (e.g., 1100 / CPGRAMS) or forward the Local Proxy link.',
        ],
      },
      {
        id: 'damaged_road',
        department: 'Highways & Municipal Public Works Department (PWD)',
        score: 93,
        patterns: [
          /\b(broken\s*road|damaged\s*road|road\s*(?:damage|broken|bad|repair|collapsed|flooded)|pothole|potholes|culvert|bridge|footpath|speed\s*breaker)\b/i,
          /சாலை|ரோடு|குழி/i,
          /सड़क|गड्ढा|रास्ता/i,
          /రోడ్డు|గుంతలు/i,
        ],
        summary: 'Damaged road / pothole hazard classified for Urimai PWD legal petition & O2O action kit.',
        checklist: [
          'Capture a geo-tagged photo showing the road damage or potholes near the landmark.',
          'Export the bilingual PWD Urimai petition PDF and collect 5 neighbour signatures.',
          'File remotely via CM Helpline Bypass or hand-deliver to the Municipal Engineering / PWD office.',
        ],
      },
      {
        id: 'street_light',
        department: 'Municipal Electrical Wing / State Electricity Board (DISCOM)',
        score: 91,
        patterns: [
          /\b(street\s*light|streetlight|lamp\s*post|electric\s*pole|fallen\s*wire|sparking\s*pole|dark\s*street|light\s*(?:not\s*working|off|broken)|transformer)\b/i,
          /தெரு\s*விளக்கு|மின்\s*கம்பம்|டிரான்ஸ்பார்மர்/i,
          /स्ट्रीट\s*लाइट|बिजली\s*का\s*खंभा|ट्रांसफार्मर/i,
          /వీధి\s*దీపం|కరెంట్\s*స్తంభం/i,
        ],
        summary: 'Streetlight / electrical safety hazard classified for Urimai Municipal Electrical petition.',
        checklist: [
          'Note the street pole number or GPS coordinates (keep clear of any fallen/live wires).',
          'Export the bilingual Urimai Electrical petition PDF for immediate ward safety escalation.',
          'Submit via State DISCOM / CM Helpline Bypass or share via Local Proxy WhatsApp link.',
        ],
      },
      {
        id: 'sanitation',
        department: 'Municipal Health, Sanitation & Solid Waste Wing',
        score: 92,
        patterns: [
          /\b(drainage|sewage|sewer|gutter|overflow(?:ing)?|garbage|trash|waste\s*(?:collect|dump)|stink|mosquito|cleanliness|public\s*toilet)\b/i,
          /சாக்கடை|கழிவுநீர்|குப்பை/i,
          /नाली|सीवर|कचरा|गंदगी/i,
          /డ్రైనేజీ|చెత్త/i,
        ],
        summary: 'Sanitation / drainage / solid-waste breakdown classified for Urimai Health Wing petition.',
        checklist: [
          'Attach a clear street photo of the overflowing drain or uncollected waste.',
          'Generate the bilingual Sanitation & Health Urimai PDF with 5 affected resident signatures.',
          'Escalate immediately via Municipal Health Portal / CM Helpline or Local Proxy neighbor.',
        ],
      },
      {
        id: 'municipal_petition',
        department: 'Local Gram Panchayat / Municipal Corporation Grievance Desk',
        score: 90,
        patterns: [
          /\b(panchayat|municipality|municipal\s*(?:petition|office|ward|complaint)|corporation|gram\s*sabha|ward\s*\d+|ration\s*shop|primary\s*health|anganwadi|bus\s*shelter|no\s*one\s*is\s*fixing)\b/i,
          /பஞ்சாயத்து|நகராட்சி|மாநகராட்சி|வார்டு/i,
          /पंचायत|नगर\s*निगम|वार्ड|मोहल्ला/i,
        ],
        summary: 'Local municipal / panchayat grievance classified for formal Urimai bilingual petition.',
        checklist: [
          'Verify ward number / GPS location and attach supporting photo evidence if available.',
          'Download the bilingual Urimai A4 Petition PDF with the 5-resident signature block.',
          'Submit via Digital-First CM Portal Bypass or delegate locally via WhatsApp Proxy.',
        ],
      },
    ];

    /**
     * Builds a deterministic 1930 Cybercrime complaint draft for critical scam verdicts.
     *
     * @param {string} clean Sanitized citizen message or transcript.
     * @param {number} score Threat score (0-100).
     * @param {string[]} vectors Detected threat vectors.
     * @param {string} label Scam classification label.
     * @returns {string} Ready-to-file 1930 complaint draft.
     */
    function buildLocal1930Draft(clean, score, vectors, label) {
      return [
        'NATIONAL CYBER CRIME REPORTING PORTAL (https://cybercrime.gov.in | Helpline: 1930)',
        `Category: ${label}`,
        `Risk Assessment: ${score}/100 (HIGH RISK / CRITICAL)`,
        `Reported Message/Call: "${clean}"`,
        `Threat Vectors: ${vectors.join('; ')}`,
        'Action Requested: Immediate telecom block, call trace, and bank/UPI lien freeze under Helpline 1930.',
      ].join('\n');
    }

    /**
     * Builds a deterministic formal English Urimai civic petition draft when offline or in fallback mode.
     *
     * @param {string} clean Civic complaint text.
     * @param {string} department Target municipal or state department.
     * @param {string} [location='Ward 12, Coimbatore'] Ward or street address.
     * @returns {string} Formal English petition draft.
     */
    function buildLocalCivicDraft(clean, department, location = 'Ward 12, Coimbatore') {
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return [
        `Date: ${today}`,
        'To,',
        'The Executive Officer / Assistant Engineer,',
        `${department},`,
        `${location}.`,
        '',
        `Subject: Urgent Civic Grievance Petition — ${clean.slice(0, 90)}`,
        '',
        'Respected Sir / Madam,',
        `We, the undersigned residents of ${location}, request immediate inspection and repair of the following public breakdown:`,
        `"${clean}"`,
        '',
        'Under the Citizen Charter and Right to Public Services, kindly resolve this issue within 48 hours.',
        'Yours faithfully,',
        `Residents of ${location} (Filed via Urimai Civic Bridge)`,
      ].join('\n');
    }

    /**
     * Deterministic local classifier covering all 8 Kavach scam types, 5 Urimai civic
     * categories, and safe-message guardrails. Exposed as `window.ChatSafeFallback.classify`.
     *
     * @param {string} userText Citizen input, SMS, or voice transcript.
     * @param {Object} [opts] Optional classification metadata (`location`).
     * @returns {Object} Structured verdict compatible with `/api/gemini`.
     */
    function classifyLocalFallback(userText, opts = {}) {
      const clean = String(userText || '').trim();
      const location = String(opts.location || 'Ward 12, Coimbatore');

      const safePersonalRe = /\b(reach(?:ed)?\s*safely|take\s*your\s*(?:tablet|medicine)|good\s*morning|happy\s*birthday|after\s*dinner)\b/i;
      const hasHardScamLinkOrThreat = /\b(http:\/\/|bit\.ly|tinyurl|t\.me|\.apk|digital\s*arrest|cbi|fedex|drugs|seized|guaranteed\s*returns?|morphed|blackmail|account\s*(?:will\s*be\s*)?blocked)\b/i.test(clean);

      // 1. Check Scam rules BEFORE Civic so "electricity bill disconnect tonight" never misroutes as Civic
      const scamHits = FALLBACK_SCAM_RULES.filter((rule) => rule.patterns.some((re) => re.test(clean)));
      const isGenuineUtilitySafe = /\b(electricity|water)\s*bill\b.{0,50}\b(due\s*on|official\s*(?:tneb|app|portal))\b/i.test(clean)
        && !/\b(disconnect(?:ed|ion)?|cut\s*tonight|call\s*\d|98x+|bit\.ly|tinyurl|apk|urgent)\b/i.test(clean);

      const civicHits = FALLBACK_CIVIC_RULES.filter((rule) => rule.patterns.some((re) => re.test(clean)));

      // Safe personal / benign OTP / genuine utility reminder
      const isSafeOtp = /\b(do\s+not|never|don'?t)\s+share\s+(?:it|this|your|the)?\s*(?:otp|pin|cvv)?\s*(?:with\s+anyone)?/i.test(clean)
        && /\b(otp|pin)\b/i.test(clean)
        && !hasHardScamLinkOrThreat;
      if ((isSafeOtp || (!scamHits.length && !civicHits.length && (safePersonalRe.test(clean) || isGenuineUtilitySafe))) && !hasHardScamLinkOrThreat) {
        const tier = getThreatTier(8);
        return {
          intent: 'SCAM',
          confidence_score: 8,
          active_agents: ['vani', 'gemini', 'kavach'],
          summary: tier.verdict,
          action_draft: '',
          checklist: [
            'No common scam pattern found. Continue practicing safe digital hygiene.',
            'Never share personal OTPs, PINs, or passwords with anyone.',
          ],
          scam_type: tier.scamType,
          civic_type: null,
          department: 'Kavach Local Shield',
          threat_vectors: [],
          categoryIds: [],
          tier,
        };
      }

      // Disambiguate Civic vs. Scam (if scam hits are strong and not purely civic)
      const civicTakesPriority = civicHits.length > 0 && !scamHits.some((h) => h.id !== 'kyc_otp' || /\b(otp|kyc|bank|cbi|arrest)\b/i.test(clean));
      if (civicTakesPriority) {
        const primary = civicHits[0];
        const agents = ['vani', 'gemini', 'urimai', 'setu'];
        return {
          intent: 'CIVIC',
          confidence_score: primary.score,
          active_agents: agents,
          summary: `${primary.summary} (${primary.department})`,
          action_draft: buildLocalCivicDraft(clean, primary.department, location),
          checklist: [...primary.checklist],
          scam_type: null,
          civic_type: primary.id,
          department: primary.department,
          threat_vectors: [
            `Category: ${primary.id.replace('_', ' ').toUpperCase()}`,
            `Department: ${primary.department}`,
            'Eligible for Bilingual PDF + CM Helpline Bypass',
          ],
          categoryIds: [],
          tier: null,
        };
      }

      if (scamHits.length > 0) {
        const primary = scamHits[0];
        const isInquiryOnly = /\b(what\s+is\s+a\s+digital\s+arrest|is\s+this\s+caller\s+really\s+from\s+my\s+bank)\b/i.test(clean);
        const isModerateBankQuestion = primary.id === 'kyc_otp' && /\bis\s+this\s+caller\s+really\s+from\s+my\s+bank\b/i.test(clean);
        const hasUrlSignal = /\b(http:\/\/|https:\/\/|bit\.ly|tinyurl\.com|t\.me|inida-post|\.apk)\b/i.test(clean);
        const hasMoneyOrUrgency = /\b(₹|rs\.?|inr|transfer|deposit|pay|urgent|immediately|tonight|today|minutes|hour|do\s*not\s*tell|don'?t\s*tell)\b/i.test(clean);

        let score = isModerateBankQuestion
          ? (primary.moderateScore || 52)
          : primary.score;
        if (!isModerateBankQuestion && hasUrlSignal) score = Math.min(99, score + 3);
        if (!isModerateBankQuestion && !isInquiryOnly && hasMoneyOrUrgency) score = Math.min(99, score + 2);
        if (scamHits.length > 1 && !isModerateBankQuestion) score = Math.min(99, score + 2);

        const tier = getThreatTier(score);
        const vectors = [...new Set(scamHits.flatMap((h) => h.vectors))].slice(0, 5);
        const summary = isModerateBankQuestion ? (primary.moderateSummary || primary.summary) : primary.summary;
        const agents = normalizeBusAgents(
          tier.tier === 'critical' ? ['vani', 'gemini', 'kavach', 'netra', 'setu'] : ['vani', 'gemini', 'kavach', 'netra'],
          'SCAM',
          score,
        );

        return {
          intent: 'SCAM',
          confidence_score: score,
          active_agents: agents,
          summary,
          action_draft: tier.tier === 'critical' ? buildLocal1930Draft(clean, score, vectors, primary.label) : '',
          checklist: [...primary.checklist],
          scam_type: primary.label,
          civic_type: null,
          department: tier.tier === 'critical' ? 'National Cybercrime Helpline (1930) / I4C' : 'Kavach Local Shield',
          threat_vectors: vectors,
          categoryIds: [...new Set(scamHits.map((h) => h.categoryId))],
          tier,
        };
      }

      // Fallback to core.js token rules for ambiguous or multilingual inputs
      return null;
    }

  root.ChatSafeEngine = Object.freeze({
    CANONICAL_BUS_AGENTS,
    FALLBACK_SCAM_RULES,
    FALLBACK_CIVIC_RULES,
    getThreatTier,
    normalizeBusAgents,
    buildLocal1930Draft,
    buildLocalCivicDraft,
    classifyLocalFallback,
  });
})(typeof window !== 'undefined' ? window : globalThis);
