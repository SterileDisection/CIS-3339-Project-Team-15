// This file contains API endpoints for the "services" collection of the MongoDB database
//
// Sprint 3 (S1, B2):
// - every route uses requireAuth; create/update/delete also use requireRole('editor')
// - every query goes through withOrg(), so services of another organization are never visible
// - update and delete are scoped to the organization (the template's update used findByIdAndUpdate,
//   which could change ANY organization's service)
// - the template's delete had no try/catch around an await, so a bad id crashed the request;
//   all handlers now use asyncHandler and the central error handler
// - search input is escaped before it goes into a RegExp

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { withOrg } = require('../utils/withOrg');
const { HttpError, asyncHandler, isValidId, escapeRegex, pickFields } = require('../utils/http');
const { services, events } = require('../models/models');

const editorOnly = [requireAuth, requireRole('editor')];

// the only fields a request is allowed to set on a service
const SERVICE_FIELDS = ['name', 'description', 'status'];

async function findServiceOr404(id, req) {
  const service = isValidId(id) ? await services.findOne(withOrg({ _id: id }, req)) : null;
  if (!service) throw new HttpError(404, 'Service not found');
  return service;
}

// GET /services - all services of the organization, most recently updated first
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const list = await services.find(withOrg({}, req)).sort({ updatedAt: -1, name: 1 });
    res.json(list);
  })
);

// GET /services/id/:id - one service
router.get(
  '/id/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await findServiceOr404(req.params.id, req));
  })
);

// GET /services/search?searchBy=name&name=flu
// GET /services/search?searchBy=description&description=vaccine
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {};
    switch (req.query.searchBy) {
      case 'name':
        filter.name = new RegExp(escapeRegex(req.query.name), 'i');
        break;
      case 'description':
        filter.description = new RegExp(escapeRegex(req.query.description), 'i');
        break;
      default:
        throw new HttpError(400, 'searchBy must be "name" or "description"');
    }
    const list = await services.find(withOrg(filter, req)).sort({ name: 1 });
    res.json(list);
  })
);

// POST /services - create a service in the logged-in user's organization
router.post(
  '/',
  editorOnly,
  asyncHandler(async (req, res) => {
    await services.create({ ...pickFields(req.body, SERVICE_FIELDS), orgId: req.user.orgId });
    res.status(201).send('New service created successfully');
  })
);

// PUT /services/update/:id - update a service of this organization
router.put(
  '/update/:id',
  editorOnly,
  asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) throw new HttpError(404, 'Service not found');
    const updated = await services.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      { $set: pickFields(req.body, SERVICE_FIELDS) },
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(404, 'Service not found');
    res.send('Service updated successfully');
  })
);

// DELETE /services/:id - only allowed when no event uses the service
router.delete(
  '/:id',
  editorOnly,
  asyncHandler(async (req, res) => {
    const service = await findServiceOr404(req.params.id, req);
    const inUse = await events.exists(withOrg({ services: service._id }, req));
    if (inUse) {
      throw new HttpError(409, 'Service can not be deleted since it is being used by events.');
    }
    await services.deleteOne(withOrg({ _id: service._id }, req));
    res.send('Service deleted successfully');
  })
);

module.exports = router;
