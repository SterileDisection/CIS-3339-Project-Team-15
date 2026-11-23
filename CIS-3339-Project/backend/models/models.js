// This file contains the data models of the collections in the MongoDB database
//
// Sprint 3 changes (S1 / data integrity):
// - every client, event, service and user now has ONE field for its organization: orgId.
//   The template mixed `org` (events, services, users) and an `orgs` array (clients), so each
//   route had to filter by hand. A single field lets utils/withOrg.js scope every query the same way.
// - orgId is required and indexed on every org-owned collection
// - clearer validation messages, so the B2 error handler can show them to the user as-is
// - users: role is limited to viewer/editor and (orgId, username) is unique
// - services: status is limited to Active/Inactive
// - timestamps (createdAt/updatedAt) so the service list can sort by last update

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// the org reference used by every org-owned collection
const orgIdField = {
  type: ObjectId,
  ref: 'org',
  required: [true, 'orgId is required'],
  index: true
};

// reusable address block (clients and events)
const addressSchema = new Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    county: { type: String, trim: true },
    zip: { type: String, trim: true }
  },
  { _id: false }
);

// collection for org
const orgDataSchema = new Schema(
  {
    _id: {
      type: ObjectId,
      required: true
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    }
  },
  {
    collection: 'org'
  }
);

// collection for app users (passwords are always bcrypt hashes, see scripts/db-init.js)
const userDataSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true
    },
    // display name shown in the app; falls back to the username
    name: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: { values: ['viewer', 'editor'], message: 'Role must be viewer or editor' }
    },
    orgId: orgIdField
  },
  {
    collection: 'users',
    timestamps: true
  }
);
// a username can only exist once per organization
userDataSchema.index({ orgId: 1, username: 1 }, { unique: true });

// collection for clients
const clientDataSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    middleName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is not valid']
    },
    phoneNumber: {
      primary: {
        type: String,
        required: [true, 'Primary phone number is required'],
        trim: true,
        match: [/^\d{10}$/, 'Primary phone number must be 10 digits']
      },
      alternate: {
        type: String,
        trim: true
      }
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      county: { type: String, trim: true },
      zip: { type: String, trim: true }
    },
    orgId: orgIdField
  },
  {
    collection: 'clients',
    timestamps: true
  }
);
clientDataSchema.index({ orgId: 1, lastName: 1, firstName: 1 });

// collection for events
const eventDataSchema = new Schema(
  {
    orgId: orgIdField,
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true
    },
    services: [
      {
        type: ObjectId,
        ref: 'services'
      }
    ],
    date: {
      type: Date,
      required: [true, 'Event date is required']
    },
    address: addressSchema,
    description: {
      type: String,
      trim: true
    },
    // B1: registrations are client ids in this array. The register route uses $addToSet,
    // so a client can never be in here twice.
    attendees: [
      {
        type: ObjectId,
        ref: 'clients'
      }
    ]
  },
  {
    collection: 'events',
    timestamps: true
  }
);
eventDataSchema.index({ orgId: 1, date: -1 });
eventDataSchema.index({ orgId: 1, attendees: 1 });

// collection for services
const serviceDataSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: { values: ['Active', 'Inactive'], message: 'Status must be Active or Inactive' },
      default: 'Active'
    },
    orgId: orgIdField
  },
  {
    collection: 'services',
    timestamps: true
  }
);
serviceDataSchema.index({ orgId: 1, name: 1 });

// create models from mongoose schemas
const clients = mongoose.model('clients', clientDataSchema);
const users = mongoose.model('users', userDataSchema);
const orgs = mongoose.model('org', orgDataSchema);
const events = mongoose.model('events', eventDataSchema);
const services = mongoose.model('services', serviceDataSchema);

// package the models in an object to export
module.exports = { clients, orgs, events, users, services };
