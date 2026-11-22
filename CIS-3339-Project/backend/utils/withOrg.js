// Sprint 3 (S1): organization isolation helper.
//
// Every query on clients, events and services goes through withOrg(), so a record that belongs
// to another organization can never be found, changed or deleted:
//
//   clients.findOne(withOrg({ _id: req.params.id }, req))
//   events.find(withOrg({ date: { $gte: start } }, req))
//   clients.aggregate([{ $match: withOrg({}, req) }, ...])
//
// The orgId always comes from req.user (the verified JWT, see middleware/auth.js), never from
// the request body, query string or URL. It is added LAST, so a filter can't override it.

const mongoose = require('mongoose');

// The org id as an ObjectId. find() would cast a string for us, but aggregate() does not,
// so we always return an ObjectId and the same filter works in both.
function orgIdOf(req) {
  if (!req || !req.user || !req.user.orgId) {
    // a programming mistake (route forgot requireAuth) - fail loudly instead of leaking data
    throw new Error('withOrg() needs an authenticated request. Add requireAuth to this route.');
  }
  return new mongoose.Types.ObjectId(req.user.orgId);
}

function withOrg(filter, req) {
  return { ...(filter || {}), orgId: orgIdOf(req) };
}

module.exports = { withOrg, orgIdOf };
