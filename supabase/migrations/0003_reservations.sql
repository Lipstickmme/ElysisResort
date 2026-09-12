-- Reservation enquiries.
--
-- The enquiry table arrived with 0001_init.sql as a contact form: a name, an
-- email, a company and a message. A resort needs the stay as well, so the desk
-- can sort by arrival date rather than reading every message.
--
-- Safe to run more than once, and safe to skip: the site writes the dates into
-- the message body too, so a database still on 0001 keeps taking bookings, just
-- without columns to sort them by. See src/utils/storage.js.

alter table public.enquiries add column if not exists phone      text;
alter table public.enquiries add column if not exists arrival    date;
alter table public.enquiries add column if not exists departure  date;
alter table public.enquiries add column if not exists nights     integer;
alter table public.enquiries add column if not exists adults     integer;
alter table public.enquiries add column if not exists children   integer;
alter table public.enquiries add column if not exists suite_id   text;

-- The desk's two working orders: what came in, and who arrives next.
create index if not exists enquiries_arrival_idx
  on public.enquiries (arrival);

comment on column public.enquiries.service is
  'The residence asked for, by name. Kept as `service` so the column that held the discipline on the previous version of this site is reused rather than abandoned.';
comment on column public.enquiries.company is
  'Unused by the reservation form. Job applications filed here before the applications table existed still carry a portfolio link in it.';
