// Sprint 3 (D1): sample data written by scripts/db-init.js
//
// 16 clients, 16 services and 16 events, so the frontend DataTable has more than one page
// (10 rows per page) in every list. Records are matched by a natural key when the script runs
// again (client email, service name, event name), so running it twice never creates duplicates.

const DAY = 24 * 60 * 60 * 1000;

// A second organization with a few records of its own. Nobody can log in to it from this
// backend (logins only work for ORG_ID); it exists so the team can show that a user of ORG_ID
// gets 404 for these records (the S1 organization isolation test). See npm run verify.
const OTHER_ORG = {
  _id: '6660000000000000000000b2',
  name: 'Isolation Test Org (do not use)'
};

const PLACES = [
  ['Houston', 'Harris', '77002'],
  ['Houston', 'Harris', '77004'],
  ['Pasadena', 'Harris', '77506'],
  ['Katy', 'Fort Bend', '77449'],
  ['Sugar Land', 'Fort Bend', '77478'],
  ['Pearland', 'Brazoria', '77581']
];
function placeAt(i) {
  const [city, county, zip] = PLACES[i % PLACES.length];
  return { city, county, zip };
}

const FIRST_NAMES = [
  'Maria',
  'James',
  'Linh',
  'Carlos',
  'Aisha',
  'David',
  'Sofia',
  'Kevin',
  'Fatima',
  'Luis',
  'Grace',
  'Omar',
  'Elena',
  'Tyler',
  'Priya',
  'Marcus'
];
const LAST_NAMES = [
  'Garcia',
  'Johnson',
  'Nguyen',
  'Hernandez',
  'Khan',
  'Smith',
  'Lopez',
  'Brown',
  'Ali',
  'Martinez',
  'Kim',
  'Hassan',
  'Rossi',
  'Davis',
  'Patel',
  'Lee'
];

const clients = FIRST_NAMES.map((firstName, i) => ({
  firstName,
  middleName: '',
  lastName: LAST_NAMES[i],
  email: `${firstName}.${LAST_NAMES[i]}@example.com`.toLowerCase(),
  phoneNumber: { primary: `713555${String(1000 + i * 37).slice(-4)}`, alternate: '' },
  address: { line1: `${100 + i * 12} Main St`, line2: '', ...placeAt(i) }
}));

const SERVICE_INFO = [
  ['Blood Pressure Screening', 'Free blood pressure checks with follow-up guidance'],
  ['Diabetes Education', 'Classes on managing blood sugar, diet and medication'],
  ['Flu Shots', 'Seasonal flu vaccinations for adults and children'],
  ['Nutrition Counseling', 'One-on-one meal planning with a nutritionist'],
  ['Mental Health Support', 'Peer support groups and counselor referrals'],
  ['Dental Screening', 'Basic dental checkups and hygiene kits'],
  ['Vision Screening', 'Eye exams and referrals for glasses'],
  ['Health Insurance Enrollment', 'Help signing up for Medicaid, CHIP or marketplace plans'],
  ['Food Pantry', 'Weekly groceries for families in need'],
  ['Prenatal Care Referral', 'Connecting expecting mothers with prenatal clinics'],
  ['COVID-19 Testing', 'Rapid and PCR testing'],
  ['Smoking Cessation', 'Coaching and resources to quit tobacco'],
  ['Senior Wellness Check', 'Health checks and fall-risk screening for seniors'],
  ['Childhood Immunizations', 'Routine vaccines for school-age children'],
  ['Exercise Class', 'Low-impact group fitness for all ages'],
  ['Housing Assistance Referral', 'Referrals to local housing and rent assistance programs']
];
const services = SERVICE_INFO.map(([name, description], i) => ({
  name,
  description,
  // a couple of inactive services, so the "Inactive" state shows up in the app
  status: i % 7 === 6 ? 'Inactive' : 'Active'
}));

const EVENT_NAMES = [
  'Spring Health Fair',
  'Diabetes Workshop',
  'Back to School Vaccines',
  'Senior Wellness Day',
  'Community Food Drive',
  'Heart Health Talk',
  'Family Fitness Morning',
  'Mental Health Awareness Night',
  'Flu Shot Clinic',
  'Insurance Enrollment Day',
  'Healthy Cooking Demo',
  'Vision and Dental Day',
  'Prenatal Info Session',
  'Quit Smoking Kickoff',
  'Neighborhood Health Walk',
  'Winter Wellness Fair'
];

// Events are built when the script runs, so their dates are relative to "today":
// one a week from 7 weeks ago to 8 weeks ahead (the dashboard shows the last two months).
// serviceNames / attendeeEmails are turned into ids by db-init.js.
function buildEvents(now = Date.now()) {
  return EVENT_NAMES.map((name, i) => {
    const date = new Date(now + (i - 7) * 7 * DAY);
    date.setUTCHours(0, 0, 0, 0); // same shape as dates saved from the event form
    return {
      name,
      description: `${name} hosted by the community health team`,
      date,
      address: { line1: `${200 + i * 15} Community Ave`, line2: '', ...placeAt(i + 2) },
      serviceNames: [services[i].name, services[(i + 3) % services.length].name],
      // every event starts with a few registrations (at least one is required)
      attendeeEmails: clients.filter((client, c) => (c + i) % 4 === 0).map((client) => client.email)
    };
  });
}

// records of the second organization (isolation test)
const otherOrg = {
  client: {
    firstName: 'Isolated',
    lastName: 'Client',
    email: 'isolated.client@example.com',
    phoneNumber: { primary: '2815550000' },
    address: { city: 'Galveston', zip: '77550' }
  },
  service: { name: 'Other Org Service', description: 'Belongs to the isolation test org', status: 'Active' },
  event: {
    name: 'Other Org Event',
    description: 'Belongs to the isolation test org',
    address: { city: 'Galveston', zip: '77550' }
  }
};

module.exports = { OTHER_ORG, clients, services, buildEvents, otherOrg };
