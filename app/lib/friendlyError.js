// What a visitor reads when an AI call fails. The real error is logged on the server
// (console.error); the response only ever carries one of these calm sentences.

const AGAIN = 'Please try again in a minute.';

const MESSAGES = {
  visa: `We couldn't build your visa report right now. ${AGAIN}`,
  probability: 'Chance estimate unavailable right now.',
  relocation: `We couldn't build your relocation guide right now. ${AGAIN}`,
  match: `We couldn't find your matches right now. ${AGAIN}`,
};

/** kind: 'visa' | 'probability' | 'relocation' | 'match' | anything else -> generic sentence. */
export function friendlyError(kind) {
  return Object.prototype.hasOwnProperty.call(MESSAGES, kind) ? MESSAGES[kind] : `Something went wrong. ${AGAIN}`;
}
