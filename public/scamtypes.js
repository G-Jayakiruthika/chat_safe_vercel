'use strict';

/**
 * The eight scam types Chat_Safe detects, written for someone with little reading
 * ability: one picture, one plain sentence of what the scammer says, and one rule
 * to remember. Tapping a card loads a real example into the scanner.
 *
 * `id` matches the category ids in src/rules.js, so the "learned" HUD lights up
 * the same cards the engine recognises.
 */
window.SCAM_TYPES = [
  {
    id: 'investment',
    icon: '📈',
    name: 'Fake investment',
    says: 'Join our VIP group — guaranteed profit every day!',
    rule: 'No one can promise daily profit. Real brokers use a UPI ID ending in @valid.',
    sample:
      'Welcome to SEBI VIP Stock Tips group! Our institutional account gives guaranteed returns of 8% daily. ' +
      'Only 5 seats left today — deposit ₹25,000 to rajesh.trader@ybl immediately to unlock IPO allotment. Join https://t.me/vipprofitclub',
  },
  {
    id: 'digital_arrest',
    icon: '🚔',
    name: 'Digital arrest',
    says: 'I am a CBI officer. Stay on this video call or you go to jail.',
    rule: 'Real police never arrest anyone on a video call, and never ask for money.',
    sample:
      'This is Inspector Sharma from CBI Mumbai. A FedEx parcel in your name has drugs and 5 passports. ' +
      'An arrest warrant is issued. Stay on this video call, do not tell anyone in your family. ' +
      'Transfer ₹1,50,000 to RBI verification account 501002345678 IFSC HDFC0001234 within 30 minutes or you go to jail.',
  },
  {
    id: 'kyc_otp',
    icon: '🔐',
    name: 'KYC / OTP',
    says: 'Your account will be blocked today. Tell me the OTP to keep it open.',
    rule: 'Your bank already knows your details. Nobody genuine ever asks for an OTP.',
    sample: 'Dear customer, your KYC has expired and your account will be blocked today. Share the OTP now to update, or install this app: https://sbi-kyc.example.in/update.apk',
  },
  {
    id: 'courier',
    icon: '📦',
    name: 'Courier parcel',
    says: 'Your parcel has drugs inside. Customs has seized it.',
    rule: 'A courier company never phones about drugs. Hang up and call them yourself.',
    sample: 'FedEx customs: a parcel sent in your name contains MDMA drugs and 3 passports. It is seized. Press 1 to speak to the cyber police officer immediately.',
  },
  {
    id: 'task_job',
    icon: '💼',
    name: 'Task job',
    says: 'Like videos from home and earn ₹3,000 a day. Just pay a small fee first.',
    rule: 'A real job pays you. If you must pay to start, it is a scam.',
    sample: 'Hi! Part time job from home. Like YouTube videos and earn ₹3000 daily. First do prepaid task of ₹500 to start. Contact 98765 43210 on WhatsApp.',
  },
  {
    id: 'reward_bill',
    icon: '🎁',
    name: 'Lottery / bill',
    says: 'You won a prize! Pay the processing fee. Or: your power is cut tonight.',
    rule: 'You cannot win a lottery you never entered, and bills are never settled by phone.',
    sample: 'Congratulations! You are selected as KBC lucky draw winner of ₹25 lakh. Pay processing fee ₹8,500 to claim. Also your electricity connection will be disconnected tonight, call 98765 43210 immediately.',
  },
  {
    id: 'family_voice',
    icon: '🗣️',
    name: 'Voice clone',
    says: 'Amma, I had an accident, send money fast — this is my new number.',
    rule: 'AI can copy any voice. Hang up and call the person on their own saved number.',
    sample: 'Mummy this is my new number save it. I had an accident near the hospital and police station, urgent please transfer ₹40,000 now, do not tell papa.',
  },
  {
    id: 'sextortion_loan',
    icon: '📵',
    name: 'Loan / blackmail',
    says: 'Pay now or we send your photos to all your contacts.',
    rule: 'This is a crime against you, not by you. Do not pay. Call 1930 and tell someone you trust.',
    sample: 'We have your private photos and your full contact list from the loan app. Pay ₹20,000 in one hour or we send the morphed photos to your family and make it viral.',
  },
];
