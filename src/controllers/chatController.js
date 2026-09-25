'use strict';

const chatStore = require('../utils/chatStore');
const notify = require('../utils/notify');

function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}

// Lightweight rule-based responder. This is the seam where a real agent, a
// human hand-off, or a third-party desk (Intercom, etc.) would plug in. It only
// ever holds the conversation until someone at the desk picks it up.
function autoReply(text) {
  const t = text.toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  if (has('hello', 'hi ', 'hey', 'good morning', 'good evening', 'kalimera') || t === 'hi') {
    return 'Good day, you are through to the Elysis concierge. How can we help with your stay?';
  }
  if (has('available', 'availability', 'book', 'reserve', 'reservation', 'vacancy', 'free')) {
    return 'Happy to check. Which dates are you looking at, and how many of you are travelling? The reservations desk replies to every enquiry within a day.';
  }
  if (has('rate', 'price', 'cost', 'how much', 'per night', 'tariff')) {
    return 'Rates run from EUR 510 a night for a Salt White Suite to EUR 5,600 for the Nefeli Estate, breakfast, the beach and pool clubs and airport transfers included. Tell me your dates and I will have the desk send exact rates.';
  }
  if (has('suite', 'villa', 'residence', 'room', 'bedroom', 'pool suite')) {
    return 'There are eighteen residences, from 44 square metre suites to a four bedroom estate. You can see all of them under Suites, or tell me how many of you there are and I will suggest two or three.';
  }
  if (has('restaurant', 'dinner', 'dining', 'eat', 'food', 'breakfast', 'menu', 'chef')) {
    return 'Four kitchens and bars: Thalassa for dinner over the water, Olivo all day in the grove, Alati for raw fish on the sand, and Ampeli for sunset. The kitchen will also lay a private table anywhere on the property.';
  }
  if (has('spa', 'massage', 'hammam', 'treatment', 'yoga', 'wellness')) {
    return 'The spa has four treatment rooms and a marble hammam, and yoga is at seven on the deck six mornings a week. Shall I ask the spa to hold a treatment for the day you arrive?';
  }
  if (has('beach', 'pool', 'swim', 'sail', 'boat', 'dive', 'snorkel', 'kayak')) {
    return 'The bay is private, the pool is twenty five metres and heated, and the catamaran goes out at six each evening. Diving, kayaks and paddleboards are all arranged here.';
  }
  if (has('child', 'kids', 'family', 'baby', 'cot')) {
    return 'Children are very welcome. Little Elysis runs every morning for ages four to eleven, and the Elaia Family Residence was designed around young children. Cots, high chairs and babysitting are all arranged.';
  }
  if (has('airport', 'ferry', 'transfer', 'arrive', 'getting here', 'taxi', 'flight')) {
    return 'Paros airport is 22 minutes away and Parikia port 18. Transfers by car, launch or helicopter are arranged before you travel and are included with every residence.';
  }
  if (has('wedding', 'event', 'party', 'proposal', 'anniversary', 'buyout')) {
    return 'We take a small number of private events each season, and the whole resort can be bought out. Tell me the dates and the number of guests and the desk will come back to you personally.';
  }
  if (has('career', 'job', 'hiring', 'vacancy', 'apply', 'position', 'role')) {
    return 'We hire for the season from April. Open roles are on the Careers page, and speculative applications are read by the people you would work with.';
  }
  if (has('contact', 'call', 'phone', 'email', 'speak', 'human')) {
    return 'You can write to reservations@elysisresort.com at any time, or leave your email here and the desk will reach you today.';
  }
  if (has('thanks', 'thank you', 'cheers', 'lovely', 'great')) {
    return 'With pleasure. Anything else I can arrange before you arrive?';
  }
  return 'Thank you for the message. Someone at the desk will pick this up shortly. If you leave your email and your dates, we will come back to you today.';
}

/**
 * POST /api/chat/message
 *
 * Fallback path: used when the browser cannot reach Supabase itself (not
 * configured, or the client library failed to load). The server holds the
 * service role, so it writes both sides of the exchange.
 */
exports.postMessage = async (req, res, next) => {
  try {
    const sessionId = clean(req.body.sessionId, 64);
    const text = clean(req.body.text, 2000);

    if (!chatStore.isValidId(sessionId)) {
      return res.status(422).json({ error: 'invalid_session', message: 'Missing or malformed session id.' });
    }
    if (text.length < 1) {
      return res.status(422).json({ error: 'empty_message', message: 'Message cannot be empty.' });
    }

    const now = new Date().toISOString();
    const messages = [{ role: 'user', text, at: now }];

    // Stay quiet once someone at the desk has picked the conversation up.
    let handedOver = false;
    try {
      handedOver = await chatStore.isHandedOver(sessionId);
    } catch (err) {
      console.error('[elysis] chat handover check failed:', err.message);
    }

    const reply = handedOver ? null : { role: 'agent', text: autoReply(text), at: new Date(Date.now() + 1).toISOString() };
    if (reply) messages.push(reply);

    let stored = true;
    try {
      await chatStore.append(sessionId, messages);
    } catch (err) {
      stored = false;
      console.error('[elysis] failed to persist chat message:', err.message);
    }

    // Route the visitor's message to the inbox so a human can pick it up.
    await notify.chatMessage(chatStore.sessionUuid(sessionId), text);

    // Both sides come back, so the widget draws the visitor's own message from
    // the same source it draws everything else and cannot double it up.
    return res.status(201).json({ ok: true, stored, messages });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/chat/notify
 *
 * Companion to the browser-written path. The visitor's own message is already
 * in the database, written by their browser under row level security; this
 * raises the flag by email and, until a human takes over, posts the holding
 * reply with the service role so it reaches them over realtime.
 */
exports.notifyMessage = async (req, res, next) => {
  try {
    const sessionId = clean(req.body.sessionId, 64);
    const text = clean(req.body.text, 2000);

    if (!chatStore.isUuid(sessionId)) {
      return res.status(422).json({ error: 'invalid_session', message: 'Missing or malformed session id.' });
    }
    if (text.length < 1) {
      return res.status(422).json({ error: 'empty_message', message: 'Message cannot be empty.' });
    }

    let replied = false;
    try {
      if (!(await chatStore.isHandedOverById(sessionId))) {
        await chatStore.appendById(sessionId, [{ role: 'agent', text: autoReply(text), at: new Date().toISOString() }]);
        replied = true;
      }
    } catch (err) {
      console.error('[elysis] failed to post chat reply:', err.message);
    }

    await notify.chatMessage(sessionId, text);

    return res.status(202).json({ ok: true, replied });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/chat/:sessionId */
exports.getHistory = async (req, res, next) => {
  try {
    const sessionId = clean(req.params.sessionId, 64);
    if (!chatStore.isValidId(sessionId)) {
      return res.status(422).json({ error: 'invalid_session', message: 'Malformed session id.' });
    }
    let convo = { messages: [] };
    try {
      convo = await chatStore.load(sessionId);
    } catch (err) {
      // A storage fault should cost the visitor their history, not the widget.
      console.error('[elysis] failed to load chat history:', err.message);
    }
    return res.json({ sessionId, messages: convo.messages });
  } catch (err) {
    return next(err);
  }
};
