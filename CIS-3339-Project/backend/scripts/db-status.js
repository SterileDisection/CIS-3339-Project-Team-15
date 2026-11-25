// Sprint 3 (D1): read-only database status check
//
//   npm run db:status
//
// Connects to MONGO_URL and reports whether the database is ready for the app, WITHOUT changing
// anything (no inserts, updates, deletes or index builds). Use it to:
//   - prove the MongoDB Atlas database can be reached from this computer (remote access)
//   - confirm npm run db:init has been run: the organization, both demo logins and sample data
//   - get a quick answer when someone's login fails ("is it the database or the app?")
//
// Exit code 0 = ready, 1 = something is missing or the database can't be reached.

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { config, checkConfig } = require('../config/env');
const { orgs, users, clients, events, services } = require('../models/models');
const { OTHER_ORG } = require('./seedData');

const problems = [];
const rows = [];

// a row in the result table; anything not OK is also listed as a problem at the end
function report(check, ok, detail, fix) {
  rows.push({ check, result: ok ? 'OK' : 'MISSING', detail });
  if (!ok) problems.push(fix ? `${check}: ${fix}` : check);
}

// the cluster host from the connection string, without the username or password
function hostOf(url) {
  const afterScheme = url.replace(/^mongodb(\+srv)?:\/\//, '');
  return afterScheme.slice(afterScheme.lastIndexOf('@') + 1).split(/[/?]/)[0];
}

// does this demo account exist with the expected role and the password from .env?
async function checkAccount(orgId, label, username, password, role) {
  if (!username || !password) {
    report(`${label} login`, false, 'not set in .env', `set SEED_${label.toUpperCase()}_USERNAME and _PASSWORD`);
    return;
  }
  const user = await users.findOne({ orgId, username }).select('role password').lean();
  if (!user) {
    report(`${label} login (${username})`, false, 'account not found', 'run npm run db:init');
    return;
  }
  const passwordOk = await bcrypt.compare(password, user.password || '');
  const roleOk = user.role === role;
  report(
    `${label} login (${username})`,
    passwordOk && roleOk,
    `role ${user.role}, password ${passwordOk ? 'matches .env' : 'does NOT match .env'}`,
    'run npm run db:init to reset the demo account'
  );
}

async function main() {
  console.log('Data Platform - database status (read-only, nothing is changed)\n');

  const configProblems = checkConfig(config);
  if (configProblems.length) {
    console.error('The configuration in backend/.env is not valid:');
    configProblems.forEach((problem) => console.error(`  - ${problem}`));
    process.exitCode = 1;
    return;
  }

  // 1. reach the database (the connection string is never printed: it contains the password)
  mongoose.set('strictQuery', true);
  const started = Date.now();
  try {
    await mongoose.connect(config.mongoUrl, { serverSelectionTimeoutMS: 10000, autoIndex: false });
  } catch (err) {
    console.error(`Could not connect to MongoDB at ${hostOf(config.mongoUrl)}: ${err.message}`);
    console.error('Check MONGO_URL in backend/.env and that Atlas Network Access allows your IP (0.0.0.0/0).');
    process.exitCode = 1;
    return;
  }
  await mongoose.connection.db.admin().ping();
  report(
    'Database connection',
    true,
    `${hostOf(config.mongoUrl)} / database "${mongoose.connection.name}", ${Date.now() - started} ms`
  );

  // 2. organization
  const orgId = new mongoose.Types.ObjectId(config.orgId);
  const org = await orgs.findById(orgId).select('name').lean();
  report(
    'Organization (ORG_ID)',
    Boolean(org),
    org ? `"${org.name}"` : `${config.orgId} not found`,
    'run npm run db:init'
  );

  // 3. demo accounts (the logins the grader uses)
  await checkAccount(orgId, 'Viewer', config.seed.viewerUsername, config.seed.viewerPassword, 'viewer');
  await checkAccount(orgId, 'Editor', config.seed.editorUsername, config.seed.editorPassword, 'editor');

  // 4. sample data for this organization
  const [clientCount, eventCount, serviceCount] = await Promise.all([
    clients.countDocuments({ orgId }),
    events.countDocuments({ orgId }),
    services.countDocuments({ orgId })
  ]);
  const registrations = (await events.find({ orgId }).select('attendees').lean()).reduce(
    (total, event) => total + event.attendees.length,
    0
  );
  report('Clients', clientCount > 0, `${clientCount}`, 'run npm run db:init');
  report('Events', eventCount > 0, `${eventCount}`, 'run npm run db:init');
  report('Services', serviceCount > 0, `${serviceCount}`, 'run npm run db:init');
  report('Event registrations', registrations > 0, `${registrations}`, 'run npm run db:init');

  // 5. the second organization used by the isolation test
  const otherOrgId = new mongoose.Types.ObjectId(OTHER_ORG._id);
  const otherClients = await clients.countDocuments({ orgId: otherOrgId });
  report(
    'Isolation test org',
    otherClients > 0,
    `${otherClients} client(s) in "${OTHER_ORG.name}"`,
    'run npm run db:init'
  );

  // 6. the unique username-per-organization index (read only: listed, never created here)
  const indexes = await users.collection.indexes().catch(() => []);
  const uniqueUsername = indexes.some((index) => index.unique && index.key.orgId === 1 && index.key.username === 1);
  report(
    'Unique username index',
    uniqueUsername,
    uniqueUsername ? 'orgId + username' : 'not found',
    'run npm run db:init'
  );
}

main()
  .catch((err) => {
    problems.push(`Status check failed: ${err.message}`);
  })
  .finally(async () => {
    await mongoose.disconnect();
    if (rows.length) console.table(rows);
    if (problems.length) {
      console.log('\nNot ready:');
      problems.forEach((problem) => console.log(`  - ${problem}`));
      process.exitCode = 1;
    } else if (rows.length) {
      console.log('\nDatabase is ready: log in as the viewer and editor accounts shown above.');
    }
  });
