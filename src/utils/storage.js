'use strict';

/**
 * Record persistence for the things visitors send us.
 *
 * Supabase in production; local JSON files when it is not configured, so
 * development works offline.
 */

const fs = require('fs/promises');
const path = require('path');
const { dataDir } = require('./paths');
const { getSupabase } = require('./supabase');

/** PostgREST hands timestamps back as strings; a file read may hold a Date. */
const asIso = (v) => (v instanceof Date ? v.toISOString() : v);

/**
 * One store per kind of record. Enquiries and job applications differ only in
 * their table, their file and the shape of a row, so the mechanics of falling
 * back to disk, serialising writes and mapping columns live here once.
 */
function createStore({ table, file, toRow, toBaseRow, fromRow }) {
  const filePath = () => path.join(dataDir(), file);
  let writeChain = Promise.resolve();

  async function readFromFile() {
    try {
      const raw = await fs.readFile(filePath(), 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  return {
    async readAll() {
      const supabase = getSupabase();
      if (supabase) {
        const rows = await supabase.select(table, 'select=*&order=created_at.desc');
        return rows.map(fromRow);
      }
      return readFromFile();
    },

    async append(record) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.insert(table, toRow(record));
        } catch (err) {
          // A database that has not run the newest migration is missing the
          // newest columns. Rather than lose the record, write the columns
          // every version of the schema has; the migration only ever added
          // structure for values the message body already carries.
          if (!toBaseRow || !/column|PGRST204|schema cache/i.test(err.message)) throw err;
          console.warn(`[elysis] ${table}: writing without the newer columns (${err.message})`);
          await supabase.insert(table, toBaseRow(record));
        }
        return record;
      }

      const task = writeChain.then(async () => {
        await fs.mkdir(dataDir(), { recursive: true });
        const all = await readFromFile();
        all.push(record);
        await fs.writeFile(filePath(), JSON.stringify(all, null, 2), 'utf8');
        return record;
      });
      writeChain = task.catch(() => {});
      return task;
    },
  };
}

/**
 * Reservation enquiries.
 *
 * `service` carries the residence asked for, which is what the desk sorts by,
 * and `message` carries the whole enquiry including the dates. The stay columns
 * beside them arrive with 0003_reservations.sql and are written when they
 * exist; see the fallback in `append` above for a database still on 0001.
 */
const enquiries = createStore({
  table: 'enquiries',
  file: 'submissions.json',
  toRow: (r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company || null,
    service: r.suiteName || r.service || null,
    message: r.summary || r.message,
    phone: r.phone || null,
    arrival: r.arrival || null,
    departure: r.departure || null,
    nights: r.nights || null,
    adults: r.adults == null ? null : r.adults,
    children: r.children == null ? null : r.children,
    suite_id: r.suiteId || null,
    ip: r.ip,
    created_at: r.receivedAt,
  }),
  toBaseRow: (r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company || null,
    service: r.suiteName || r.service || null,
    message: r.summary || r.message,
    ip: r.ip,
    created_at: r.receivedAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    service: row.service,
    suiteName: row.service,
    message: row.message,
    phone: row.phone,
    arrival: row.arrival,
    departure: row.departure,
    nights: row.nights,
    adults: row.adults,
    children: row.children,
    suiteId: row.suite_id,
    ip: row.ip,
    receivedAt: asIso(row.created_at),
  }),
});

const applications = createStore({
  table: 'applications',
  file: 'applications.json',
  toRow: (r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role_id: r.roleId,
    role_title: r.roleTitle,
    portfolio: r.portfolio,
    experience: r.experience,
    message: r.message,
    ip: r.ip,
    created_at: r.receivedAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    roleId: row.role_id,
    roleTitle: row.role_title,
    portfolio: row.portfolio,
    experience: row.experience,
    message: row.message,
    ip: row.ip,
    receivedAt: asIso(row.created_at),
  }),
});

module.exports = {
  createStore,
  applications,
  // The enquiry store is the original API of this module; callers predate the
  // factory and there is no reason to make them spell it out.
  readAll: enquiries.readAll,
  append: enquiries.append,
  enquiries,
};
