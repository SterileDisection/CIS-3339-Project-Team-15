// This file contains API endpoints for the "events" collection in the MongoDB database
//
// Sprint 3 (S1, B1, B2):
// - every route uses requireAuth; create/update/delete/register/deregister also use
//   requireRole('editor')
// - every query goes through withOrg(), including the attendee lookup and the dashboard
//   attendance route (the template's attendees route used findById, which ignored the org)
// - B1: register/deregister follow the agreed rules (404 / "Already registered" / "Not registered")
//   and use atomic $addToSet / $pull, so double clicks can't create duplicate registrations
// - an event can only reference services of its own organization
// - date search matches the whole day instead of an exact timestamp

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { withOrg } = require('../utils/withOrg');
const { HttpError, asyncHandler, isValidId, escapeRegex, pickFields } = require('../utils/http');
const { events, clients, services } = require('../models/models');

const editorOnly = [requireAuth, requireRole('editor')];

// the only fields a request may set on an event. attendees is NOT here: it only changes
// through /register and /deregister, so saving the event form can't undo a registration.
const EVENT_FIELDS = ['name', 'description', 'date', 'address', 'services'];

// B1 messages, shared with the frontend (src/api/api.js)
const ALREADY_REGISTERED = 'Already registered';
const NOT_REGISTERED = 'Not registered';

async function findEventOr404(id, req) {
  const event = isValidId(id) ? await events.findOne(withOrg({ _id: id }, req)) : null;
  if (!event) throw new HttpError(404, 'Event not found');
  return event;
}

// keeps only service ids that exist in the logged-in user's organization
async function ownServiceIds(ids, req) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const validIds = ids.map(String).filter(isValidId);
  return services.find(withOrg({ _id: { $in: validIds } }, req)).distinct('_id');
}

// builds the fields for create/update from the request body
async function eventData(body, req) {
  const data = pickFields(body, EVENT_FIELDS);
  if (data.services !== undefined) data.services = await ownServiceIds(data.services, req);
  return data;
}

// B1 rule 1: the client and the event both have to exist in the user's organization -> else 404
async function findRegistrationPair(req) {
  const { event: eventId, client: clientId } = req.query;
  if (!eventId || !clientId) {
    throw new HttpError(400, 'Both event and client are required (?event=<id>&client=<id>)');
  }
  const [event, client] = await Promise.all([
    isValidId(eventId) ? events.findOne(withOrg({ _id: eventId }, req)).select('_id') : null,
    isValidId(clientId) ? clients.findOne(withOrg({ _id: clientId }, req)).select('_id') : null
  ]);
  if (!event || !client) throw new HttpError(404, 'Client or event not found');
  return { event, client };
}

// GET /events - all events of the organization, newest first
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await events.find(withOrg({}, req)).sort({ date: -1 }));
  })
);

// GET /events/id/:id - one event
router.get(
  '/id/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await findEventOr404(req.params.id, req));
  })
);

// GET /events/search?searchBy=name&name=Food
// GET /events/search?searchBy=date&eventDate=2026-11-20
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {};
    switch (req.query.searchBy) {
      case 'name':
        filter.name = new RegExp(escapeRegex(req.query.name), 'i');
        break;
      case 'date': {
        // dates are stored at midnight UTC (the form sends YYYY-MM-DD), so match that whole day
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.eventDate || '')) {
          throw new HttpError(400, 'eventDate must look like YYYY-MM-DD');
        }
        const start = new Date(`${req.query.eventDate}T00:00:00.000Z`);
        if (isNaN(start)) throw new HttpError(400, 'eventDate is not a valid date');
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        filter.date = { $gte: start, $lt: end };
        break;
      }
      default:
        throw new HttpError(400, 'searchBy must be "name" or "date"');
    }
    res.json(await events.find(withOrg(filter, req)).sort({ date: -1 }));
  })
);

// GET /events/client/:id - events the client is registered for
router.get(
  '/client/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, 'Client not found');
    res.json(await events.find(withOrg({ attendees: req.params.id }, req)).sort({ date: -1 }));
  })
);

// GET /events/client/:id/not-registered - events the client is NOT registered for
router.get(
  '/client/:id/not-registered',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, 'Client not found');
    const list = await events.find(withOrg({ attendees: { $ne: req.params.id } }, req)).sort({ date: -1 });
    res.json(list);
  })
);

// GET /events/attendees/:id - the clients registered for an event
router.get(
  '/attendees/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const event = await findEventOr404(req.params.id, req);
    const attendees = await clients
      .find(withOrg({ _id: { $in: event.attendees } }, req))
      .sort({ lastName: 1, firstName: 1 });
    res.json(attendees);
  })
);

// GET /events/service/:id - events that use a service
router.get(
  '/service/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, 'Service not found');
    const list = await events
      .find(withOrg({ services: req.params.id }, req))
      .select({ _id: 1, name: 1, date: 1, 'address.line1': 1 })
      .sort({ date: -1 })
      .lean();
    res.json(list);
  })
);

// GET /events/attendance - events from two months ago onward, for the dashboard
router.get(
  '/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const list = await events.find(withOrg({ date: { $gte: twoMonthsAgo } }, req)).sort({ date: 1 });
    res.json(list);
  })
);

// POST /events - create an event in the logged-in user's organization
router.post(
  '/',
  editorOnly,
  asyncHandler(async (req, res) => {
    const data = await eventData(req.body, req);
    // a new event always starts with no attendees; orgId comes from the token
    await events.create({ ...data, attendees: [], orgId: req.user.orgId });
    res.status(201).send('New event created successfully');
  })
);

// PUT /events/update/:id - update an event of this organization
router.put(
  '/update/:id',
  editorOnly,
  asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, 'Event not found');
    const updated = await events.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      { $set: await eventData(req.body, req) },
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(404, 'Event not found');
    res.send('Event updated successfully');
  })
);

// B1: PUT /events/register?event=<id>&client=<id>
//   200 { eventId, clientId }             first registration
//   200 { message: 'Already registered' } client was already registered (nothing is added)
//   404                                   client or event missing, or in another organization
router.put(
  '/register',
  editorOnly,
  asyncHandler(async (req, res) => {
    const { event, client } = await findRegistrationPair(req);
    // the attendees: { $ne } condition plus $addToSet make this one atomic step,
    // so two requests at the same time still can't add the client twice
    const result = await events.updateOne(withOrg({ _id: event._id, attendees: { $ne: client._id } }, req), {
      $addToSet: { attendees: client._id }
    });
    if (result.modifiedCount === 0) {
      return res.json({ message: ALREADY_REGISTERED });
    }
    return res.json({ eventId: String(event._id), clientId: String(client._id) });
  })
);

// B1: PUT /events/deregister?event=<id>&client=<id>
//   200 { eventId, clientId }         registration removed
//   200 { message: 'Not registered' } client wasn't registered (no error)
//   404                               client or event missing, or in another organization
router.put(
  '/deregister',
  editorOnly,
  asyncHandler(async (req, res) => {
    const { event, client } = await findRegistrationPair(req);
    const result = await events.updateOne(withOrg({ _id: event._id, attendees: client._id }, req), {
      $pull: { attendees: client._id }
    });
    if (result.modifiedCount === 0) {
      return res.json({ message: NOT_REGISTERED });
    }
    return res.json({ eventId: String(event._id), clientId: String(client._id) });
  })
);

// DELETE /events/:id - only allowed when nobody is registered
router.delete(
  '/:id',
  editorOnly,
  asyncHandler(async (req, res) => {
    const event = await findEventOr404(req.params.id, req);
    if (event.attendees.length > 0) {
      throw new HttpError(409, "Event has attendees and can't be deleted.");
    }
    await events.deleteOne(withOrg({ _id: event._id }, req));
    res.send('Event deleted successfully');
  })
);

module.exports = router;
