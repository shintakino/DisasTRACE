export function announcementDeliveryStatus(value: unknown): 'pending' | 'incomplete' | 'complete' {
  if (value && typeof value === 'object' && 'deliveryStatus' in value) {
    if (value.deliveryStatus === 'pending' || value.deliveryStatus === 'incomplete') return value.deliveryStatus;
  }
  return 'complete';
}
