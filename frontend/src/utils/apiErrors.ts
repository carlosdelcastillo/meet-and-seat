/** Maps known backend error message prefixes/exact strings to i18n keys */
const ERROR_KEY_MAP: [string | RegExp, string][] = [
  ['Invalid email or password', 'errors.invalidCredentials'],
  ['Account is deactivated', 'errors.accountDeactivated'],
  ['User already has a booking for this resource on this date', 'errors.duplicateBooking'],
  ['Time slot conflicts with an existing booking', 'errors.bookingConflict'],
  ['Cannot create bookings in the past', 'errors.pastDate'],
  [/^Resource not found/, 'errors.resourceNotFound'],
  [/^User not found/, 'errors.userNotFound'],
  [/^Booking not found/, 'errors.bookingNotFound'],
  [/^User already exists/, 'errors.userAlreadyExists'],
  ['Permission denied', 'errors.permissionDenied'],
  ['Cannot delete your own account', 'errors.cannotDeleteSelf'],
  ['You can only delete your own bookings', 'errors.cannotDeleteOthersBooking'],
  ['You can only edit your own bookings', 'errors.cannotEditOthersBooking'],
  ['Only admins can book on behalf of others', 'errors.adminOnly'],
  ['Admin access required', 'errors.adminRequired'],
];

export function translateApiError(message: string, t: (key: string) => string): string {
  for (const [pattern, key] of ERROR_KEY_MAP) {
    const matches = typeof pattern === 'string'
      ? message === pattern || message.startsWith(pattern)
      : pattern.test(message);
    if (matches) {
      const translated = t(key);
      // If key wasn't found in i18n (returns the key itself), fall back to original
      return translated === key ? message : translated;
    }
  }
  return message;
}
