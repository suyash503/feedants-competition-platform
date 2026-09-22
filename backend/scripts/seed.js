/**
 * Seeds the database with the competition from the design plus a few more in other
 * lifecycle states, so every screen state can be demoed. Dates are relative to "now"
 * so the demo never goes stale. Usage: npm run seed
 */
import mongoose from 'mongoose';
import { connectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Competition, Judge, Payment, Registration, Submission, User } from '../src/models/index.js';

if (env.isProd) {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (offsetMs) => new Date(now + offsetMs);
const rupees = (n) => n * 100;

const avatar = (n) => `https://i.pravatar.cc/300?img=${n}`;
// CC0-licensed sample clip hosted by MDN.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const dancePrizes = [550, 300, 240, 200, 130, 80];

const classicalContent = {
  about: {
    en: 'This is an online classical dance competition open for all age groups. Participate from anywhere and showcase your talent. Express your passion through traditional dance. Perform any Indian classical form (Kathak, Bharatanatyam, Odissi, Kuchipudi, Manipuri, Mohiniyattam, Sattriya or Kathakali) and let an expert judge review your performance.',
    hi: 'यह सभी आयु वर्गों के लिए एक ऑनलाइन शास्त्रीय नृत्य प्रतियोगिता है। कहीं से भी भाग लें और अपनी प्रतिभा दिखाएँ। पारंपरिक नृत्य के माध्यम से अपने जुनून को व्यक्त करें। कोई भी भारतीय शास्त्रीय नृत्य शैली प्रस्तुत करें और विशेषज्ञ निर्णायक से अपने प्रदर्शन का मूल्यांकन करवाएँ।',
  },
  judgingParameters: [
    { title: { en: 'Technique & footwork', hi: 'तकनीक और पदचाप' }, weightPercent: 30 },
    { title: { en: 'Expression (Abhinaya)', hi: 'भाव (अभिनय)' }, weightPercent: 25 },
    { title: { en: 'Rhythm & timing (Laya)', hi: 'लय और ताल' }, weightPercent: 25 },
    { title: { en: 'Costume & presentation', hi: 'वेशभूषा और प्रस्तुति' }, weightPercent: 20 },
  ],
  rules: [
    { en: 'Upload one solo performance video between 1 and 5 minutes.', hi: '1 से 5 मिनट का एक एकल प्रदर्शन वीडियो अपलोड करें।' },
    { en: 'The video must be recorded in a single take, without edits or filters.', hi: 'वीडियो एक ही टेक में, बिना एडिट या फ़िल्टर के रिकॉर्ड होना चाहिए।' },
    { en: 'You may replace your video any time before submissions close.', hi: 'सबमिशन बंद होने से पहले आप कभी भी अपना वीडियो बदल सकते हैं।' },
  ],
  eligibility: [
    { en: 'Open to participants of all ages. Under-18s need guardian consent.', hi: 'सभी आयु के प्रतिभागियों के लिए। 18 वर्ष से कम आयु वालों को अभिभावक की सहमति चाहिए।' },
    { en: 'Only paid, registered participants are judged.', hi: 'केवल भुगतान किए हुए पंजीकृत प्रतिभागियों का ही मूल्यांकन होगा।' },
  ],
  disclaimer: {
    en: 'Only contributions from paid participants will be considered for judging.',
    hi: 'केवल भुगतान करने वाले प्रतिभागियों की प्रविष्टियों पर ही निर्णय किया जाएगा।',
  },
};

const FIRST_NAMES = ['Aditi', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Arjun', 'Meera', 'Karan', 'Ananya', 'Rohit',
  'Divya', 'Siddharth', 'Nisha', 'Aman', 'Priya', 'Varun', 'Tanvi', 'Harsh', 'Isha', 'Dev'];
const LAST_NAMES = ['Sharma', 'Iyer', 'Kapoor', 'Reddy', 'Das', 'Joshi', 'Menon', 'Gupta', 'Bose', 'Patel'];

/**
 * Fill `count` seats with real confirmed registrations so seats.taken always matches the
 * registrations behind it. With `ranked`, also creates scored submissions (for results).
 */
async function fillSeats(competition, count, { phonePrefix, ranked = 0 }) {
  const users = await User.create(
    Array.from({ length: count }, (_, i) => ({
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
      phone: `${phonePrefix}${String(i).padStart(4, '0')}`,
      avatarUrl: avatar(10 + (i % 60)),
    })),
  );
  const registrations = await Registration.create(
    users.map((u) => ({
      competition: competition._id,
      user: u._id,
      status: 'confirmed',
      seatHeld: true,
      amount: competition.entryFee,
      holdCount: 1,
      confirmedAt: competition.schedule.registrationOpensAt,
    })),
  );
  if (ranked) {
    await Submission.create(
      registrations.slice(0, ranked).map((r, i) => ({
        registration: r._id,
        competition: competition._id,
        user: r.user,
        video: { url: SAMPLE_VIDEO, mimeType: 'video/mp4' },
        status: 'scored',
        revision: 1,
        submittedAt: competition.schedule.submissionStartsAt,
        score: 96 - i * 4,
        rank: i + 1,
      })),
    );
  }
  await Competition.updateOne({ _id: competition._id }, { $set: { 'seats.taken': count } });
}

async function seed() {
  await connectDb(env.mongoUri);
  await Promise.all([Competition, Judge, Payment, Registration, Submission, User].map((m) => m.deleteMany({})));

  const [manju, rohan] = await Judge.create([
    {
      name: 'Manju Dubey',
      photoUrl: avatar(47),
      designation: { en: 'Professional Kathak Dancer', hi: 'पेशेवर कथक नृत्यांगना' },
      yearsOfExperience: 12,
      introVideoUrl: SAMPLE_VIDEO,
    },
    {
      name: 'Rohan Iyer',
      photoUrl: avatar(12),
      designation: { en: 'Choreographer & Bollywood Dancer', hi: 'कोरियोग्राफ़र और बॉलीवुड डांसर' },
      yearsOfExperience: 9,
      introVideoUrl: SAMPLE_VIDEO,
    },
  ]);

  const [demo, alreadyIn, friend] = await User.create([
    { name: 'Demo User', phone: '+919000000001', referralCode: 'DEMO2026' },
    { name: 'Kavya Nair', phone: '+919000000002' },
    { name: 'Referral Friend', phone: '+919000000003', referralCode: 'FRIEND10' },
  ]);

  const previousWinners = [
    { name: 'Riya Shah', avatarUrl: avatar(45), videoUrl: SAMPLE_VIDEO, position: 1, edition: 'July 2026' },
    { name: 'Aarav Mehta', avatarUrl: avatar(33), videoUrl: SAMPLE_VIDEO, position: 1, edition: 'June 2026' },
    { name: 'Neha Verma', avatarUrl: avatar(44), videoUrl: SAMPLE_VIDEO, position: 2, edition: 'July 2026' },
    { name: 'Ishita Chopra', avatarUrl: avatar(49), videoUrl: SAMPLE_VIDEO, position: 3, edition: 'July 2026' },
  ];

  const base = {
    category: 'dance',
    status: 'published',
    entryFee: rupees(99),
    certificateForWinners: true,
    rewards: dancePrizes.map((amount, i) => ({ position: i + 1, amount: rupees(amount) })),
    content: classicalContent,
    previousWinners,
    referral: { rewardPerSignup: rupees(10) },
    links: {
      prizePayoutVideoUrl: SAMPLE_VIDEO,
      refundPolicyUrl: 'https://feedants.com/refund-policy',
    },
  };

  // 1. The screen from the design: registration open, submissions already open, 1/20 booked.
  const classical = await Competition.create({
    ...base,
    slug: 'classical-dance',
    title: { en: 'Feedants Classical Dance', hi: 'फीडैंट्स शास्त्रीय नृत्य' },
    judge: manju._id,
    seats: { total: 20, taken: 1 },
    schedule: {
      registrationOpensAt: at(-5 * DAY),
      registrationClosesAt: at(1 * DAY + 6 * HOUR + 28 * MIN + 32_000),
      submissionStartsAt: at(-1 * DAY),
      submissionEndsAt: at(21 * DAY),
      resultAt: at(23 * DAY),
    },
  });
  await Registration.create({
    competition: classical._id,
    user: alreadyIn._id,
    status: 'confirmed',
    seatHeld: true,
    amount: rupees(99),
    holdCount: 1,
    confirmedAt: at(-2 * DAY),
    referredBy: friend._id,
  });

  // 2. Sold out: shows the "Competition Full" state.
  const bollywood = await Competition.create({
    ...base,
    slug: 'bollywood-beats',
    title: { en: 'Bollywood Beats', hi: 'बॉलीवुड बीट्स' },
    judge: rohan._id,
    seats: { total: 20, taken: 0 },
    schedule: {
      registrationOpensAt: at(-3 * DAY),
      registrationClosesAt: at(2 * DAY),
      submissionStartsAt: at(1 * DAY),
      submissionEndsAt: at(10 * DAY),
      resultAt: at(12 * DAY),
    },
  });

  await fillSeats(bollywood, 20, { phonePrefix: '+91910000' });

  // 3. Upcoming: registration opens tomorrow.
  await Competition.create({
    ...base,
    slug: 'folk-fusion',
    title: { en: 'Folk Fusion', hi: 'लोक फ़्यूज़न' },
    judge: rohan._id,
    seats: { total: 50, taken: 0 },
    schedule: {
      registrationOpensAt: at(1 * DAY),
      registrationClosesAt: at(8 * DAY),
      submissionStartsAt: at(5 * DAY),
      submissionEndsAt: at(15 * DAY),
      resultAt: at(17 * DAY),
    },
  });

  // 4. Finished: results announced, with ranked entries.
  const finished = await Competition.create({
    ...base,
    slug: 'kathak-classics-july',
    title: { en: 'Kathak Classics (July)', hi: 'कथक क्लासिक्स (जुलाई)' },
    judge: manju._id,
    seats: { total: 20, taken: 0 },
    schedule: {
      registrationOpensAt: at(-60 * DAY),
      registrationClosesAt: at(-45 * DAY),
      submissionStartsAt: at(-50 * DAY),
      submissionEndsAt: at(-35 * DAY),
      resultAt: at(-30 * DAY),
    },
  });

  await fillSeats(finished, 17, { phonePrefix: '+91920000', ranked: 6 });

  // 5. Free entry: registering confirms instantly, no payment step.
  await Competition.create({
    ...base,
    slug: 'open-mic-dance',
    title: { en: 'Open Mic Dance (Free)', hi: 'ओपन माइक डांस (निःशुल्क)' },
    judge: rohan._id,
    entryFee: 0,
    rewards: [{ position: 1, amount: rupees(500) }],
    seats: { total: 100, taken: 0 },
    schedule: {
      registrationOpensAt: at(-1 * DAY),
      registrationClosesAt: at(6 * DAY),
      submissionStartsAt: at(-1 * DAY),
      submissionEndsAt: at(9 * DAY),
      resultAt: at(11 * DAY),
    },
  });

  const count = await Competition.countDocuments();
  console.log(`Seeded ${count} competitions. Demo login phone: ${demo.phone} (referral code ${demo.referralCode}).`);
  console.log('Try: GET /api/v1/competitions/classical-dance');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
