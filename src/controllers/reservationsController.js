'use strict';

/**
 * Reservation enquiries.
 *
 * The form on /reserve, and the short one on the home page, both land here.
 * An enquiry is written to the database and raised with the reservations desk
 * by email, and both are best effort so a mail outage cannot lose a booking.
 *
 * This is a request, not a booking: nothing is taken, nothing is charged, and
 * the desk replies with availability and a rate.
 */

const crypto = require('crypto');
const storage = require('../utils/storage');
const notify = require('../utils/notify');
const content = require('../content');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}

function toInt(value, max) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, max);
}

/** A date only if it is a real one; anything else is treated as not given. */
function toDate(value) {
  const raw = clean(value, 10);
  if (!DATE_RE.test(raw)) return '';
  const d = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : raw;
}

function nights(arrival, departure) {
  if (!arrival || !departure) return null;
  const from = new Date(`${arrival}T12:00:00Z`);
  const to = new Date(`${departure}T12:00:00Z`);
  const diff = Math.round((to - from) / 86400000);
  return diff > 0 ? diff : null;
}

function partyLine(record) {
  const bits = [`${record.adults} adult${record.adults === 1 ? '' : 's'}`];
  if (record.children) bits.push(`${record.children} child${record.children === 1 ? '' : 'ren'}`);
  return bits.join(', ');
}

/**
 * The stay, written into the message body as well as its own columns.
 *
 * The columns arrive with 0003_reservations.sql. Repeating the dates in the
 * message means a database that has not run that migration yet still shows a
 * complete enquiry at the desk rather than a name and a paragraph.
 */
function summarise(record) {
  const stay = record.nights
    ? `${record.arrival} to ${record.departure} (${record.nights} night${record.nights === 1 ? '' : 's'})`
    : [record.arrival, record.departure].filter(Boolean).join(' to ') || 'Dates open';
  return [
    `Residence: ${record.suiteName || 'No preference'}`,
    `Stay:      ${stay}`,
    `Party:     ${partyLine(record)}`,
    record.phone ? `Phone:     ${record.phone}` : null,
    '',
    record.message,
  ].filter((line) => line !== null).join('\n');
}

/**
 * POST /api/reservations
 */
exports.create = async (req, res, next) => {
  try {
    const name = clean(req.body.name, 120);
    const email = clean(req.body.email, 200);
    const phone = clean(req.body.phone, 60);
    const suiteId = clean(req.body.suite || req.body.suiteId, 80);
    const arrival = toDate(req.body.arrival);
    const departure = toDate(req.body.departure);
    const adults = toInt(req.body.adults, 20) || 2;
    const children = toInt(req.body.children, 20);
    const message = clean(req.body.message, 4000);

    const errors = {};
    if (name.length < 2) errors.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';
    if (message.length < 10) errors.message = 'A line or two about the stay you have in mind, please.';
    if (arrival && departure && !nights(arrival, departure)) {
      errors.departure = 'Departure needs to be after arrival.';
    }

    // An unknown residence id is not worth refusing the enquiry over: the desk
    // can ask. It is simply recorded as no preference.
    const suite = suiteId ? content.suiteById(suiteId) : null;

    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'validation_error', fields: errors });
    }

    // Honeypot: bots fill hidden fields. Accept, thank them, drop the record.
    const trap = clean(req.body.website, 200);

    const record = {
      id: crypto.randomUUID(),
      name,
      email,
      phone: phone || null,
      suiteId: suite ? suite.id : null,
      suiteName: suite ? suite.name : null,
      arrival: arrival || null,
      departure: departure || null,
      nights: nights(arrival, departure),
      adults,
      children,
      message,
      receivedAt: new Date().toISOString(),
      ip: req.ip || null,
    };
    record.summary = summarise(record);

    let stored = null;
    if (!trap) {
      try {
        await storage.append(record);
        stored = true;
      } catch (err) {
        console.error('[elysis] failed to persist reservation enquiry:', err.message);
        stored = false;
      }
      await notify.reservation(record);
    }

    return res.status(201).json({
      ok: true,
      id: record.id,
      stored,
      message: 'Thank you. Your enquiry is with the reservations desk, and we reply within one day.',
    });
  } catch (err) {
    return next(err);
  }
};

exports.summarise = summarise;
