// Sprint 3 (D1): database initialization and seed data
//
//   npm run db:init     create everything that is missing; never deletes or overwrites data
//   npm run db:reset    DELETE the clients, events, services and users of ORG_ID (and of the
//                       isolation test org), then seed again. Only runs with the --reset flag.
//
// What it creates (all safe to run again; existing records are left as they are):
//   - the organization whose _id is ORG_ID
//   - the viewer and editor accounts from SEED_VIEWER_* / SEED_EDITOR_* (bcrypt hashed).
//     If an account already exists with a different password or role, it is corrected so the
//     documented demo logins always work right after this script.
//   - 16 sample services, 16 clients and 16 events, with event registrations
//   - a second "isolation test" organization with one client, service and event
//   - the indexes defined in models/models.js (including the unique username-per-org index)
//
// Exit code 0 = success, 1 = configuration or database problem.

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { config, checkConfig } = require('../config/env');
const { orgs, users, clients, events, services } = require('../models/models');
const seed = require('./seedData');

const RESET = process.argv.includes('--reset');
const SALT_ROUNDS = 10;

// counts what was created vs. already there, for the summary at the end
const summary = {};
function count(label, created) {
  summary[label] = summary[label] || { created: 0, existing: 0 };
  summary[label][created ? 'created' : 'existing'] += 1;
}

// insert-if-missing: matches on `key`, only writes `doc` when nothing matched
async function upsert(Model, key, doc) {
  const insertOnly = { ...doc };
  Object.keys(key).forEach((field) => delete insertOnly[field]);
  const result = await Model.updateOne(key, { $setOnInsert: insertOnly }, { upsert: true, runValidators: true });
  const created = result.upsertedCount > 0;
  const record = await Model.findOne(key).select('_id').lean();
  return { id: record._id, created };
}

async function ensureUser(orgId, username, password, role) {
  const existing = await users.findOne({ orgId, username });
  if (!existing) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await users.create({ orgId, username, name: username, role, password: hash });
    count('users', true);
    return 'created';
  }
  const passwordOk = await bcrypt.compare(password, existing.password || '');
  if (passwordOk && existing.role === role) {
    count('users', false);
    return 'already there';
  }
  // keep the documented demo logins working
  existing.role = role;
  if (!passwordOk) existing.password = await bcrypt.hash(password, SALT_ROUNDS);
  await existing.save();
  count('users', false);
  return 'updated (password/role reset to the .env values)';
}

async function seedOrg(orgId) {
  // services first: events reference them by id
  const serviceIds = {};
  for (const service of seed.services) {
    const { id, created } = await upsert(services, { orgId, name: service.name }, { ...service, orgId });
    serviceIds[service.name] = id;
    count('services', created);
  }

  const clientIds = {};
  for (const client of seed.clients) {
    const { id, created } = await upsert(clients, { orgId, email: client.email }, { ...client, orgId });
    clientIds[client.email] = id;
    count('clients', created);
  }

  let registrations = 0;
  for (const event of seed.buildEvents()) {
    const { serviceNames, attendeeEmails, ...fields } = event;
    const attendees = attendeeEmails.map((email) => clientIds[email]);
    const { created } = await upsert(
      events,
      { orgId, name: fields.name },
      {
        ...fields,
        orgId,
        services: serviceNames.map((name) => serviceIds[name]),
        // registrations are only added when the event is first created, so running the script
        // again doesn't undo a deregistration made in the app
        attendees
      }
    );
    if (created) registrations += attendees.length;
    count('events', created);
  }
  return registrations;
}

async function seedOtherOrg() {
  const orgId = new mongoose.Types.ObjectId(seed.OTHER_ORG._id);
  await upsert(orgs, { _id: orgId }, { name: seed.OTHER_ORG.name });

  const service = await upsert(
    services,
    { orgId, name: seed.otherOrg.service.name },
    {
      ...seed.otherOrg.service,
      orgId
    }
  );
  const client = await upsert(
    clients,
    { orgId, email: seed.otherOrg.client.email },
    {
      ...seed.otherOrg.client,
      orgId
    }
  );
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const event = await upsert(
    events,
    { orgId, name: seed.otherOrg.event.name },
    {
      ...seed.otherOrg.event,
      date,
      orgId,
      services: [service.id],
      attendees: [client.id]
    }
  );
  return { orgId, clientId: client.id, serviceId: service.id, eventId: event.id };
}

async function resetData(orgIds) {
  console.log('\n--reset: deleting existing data for these organizations:', orgIds.join(', '));
  for (const Model of [events, clients, services, users]) {
    const result = await Model.deleteMany({ orgId: { $in: orgIds } });
    console.log(`  ${Model.collection.collectionName}: ${result.deletedCount} deleted`);
  }
}

async function main() {
  console.log('Data Platform - database initialization');

  // 1. check the configuration before touching the database
  const problems = checkConfig(config, { needSeed: true });
  if (seed.OTHER_ORG._id === config.orgId) {
    problems.push(`ORG_ID can't be ${seed.OTHER_ORG._id}, that id is reserved for the isolation test org`);
  }
  if (problems.length) {
    console.error('\nThe configuration in backend/.env is not valid:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exitCode = 1;
    return;
  }

  // 2. connect (the connection string is never printed: it contains the password)
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(config.mongoUrl, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('\nCould not connect to MongoDB:', err.message);
    console.error('Check MONGO_URL in backend/.env and that your IP address is allowed (Atlas > Network Access).');
    process.exitCode = 1;
    return;
  }
  console.log(`Connected to database "${mongoose.connection.name}"`);

  const orgId = new mongoose.Types.ObjectId(config.orgId);

  if (RESET) await resetData([orgId, new mongoose.Types.ObjectId(seed.OTHER_ORG._id)]);

  // 3. indexes (the unique username index has to exist before users are written)
  for (const Model of [users, clients, events, services]) {
    await Model.createIndexes();
  }

  // 4. organization, users, sample data
  const org = await upsert(orgs, { _id: orgId }, { name: config.seed.orgName });
  const orgDoc = await orgs.findById(orgId).lean();
  const viewerResult = await ensureUser(orgId, config.seed.viewerUsername, config.seed.viewerPassword, 'viewer');
  const editorResult = await ensureUser(orgId, config.seed.editorUsername, config.seed.editorPassword, 'editor');
  const registrations = await seedOrg(orgId);
  const other = await seedOtherOrg();

  // 5. summary
  console.log(`\nOrganization: "${orgDoc.name}" (${orgId}) ${org.created ? 'created' : 'already there'}`);
  console.log('\nDemo accounts:');
  console.table([
    {
      role: 'viewer',
      username: config.seed.viewerUsername,
      password: config.seed.viewerPassword,
      result: viewerResult
    },
    { role: 'editor', username: config.seed.editorUsername, password: config.seed.editorPassword, result: editorResult }
  ]);
  console.log('Sample data for this organization:');
  console.table(summary);
  console.log(`Event registrations added this run: ${registrations}`);
  const totals = {
    clients: await clients.countDocuments({ orgId }),
    events: await events.countDocuments({ orgId }),
    services: await services.countDocuments({ orgId }),
    registrations: (await events.find({ orgId }).select('attendees').lean()).reduce((n, e) => n + e.attendees.length, 0)
  };
  console.log('Totals now in the database for this organization:', totals);
  console.log('\nIsolation test records (they belong to ANOTHER organization, so the API must answer 404):');
  console.log(`  client:  ${other.clientId}   e.g. GET /clients/id/${other.clientId}`);
  console.log(`  event:   ${other.eventId}   e.g. GET /events/id/${other.eventId}`);
  console.log(`  service: ${other.serviceId}   e.g. GET /services/id/${other.serviceId}`);
  console.log('\nDone. Start the backend with "npm start" and log in with the accounts above.');
}

main()
  .catch((err) => {
    console.error('\nDatabase initialization failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
