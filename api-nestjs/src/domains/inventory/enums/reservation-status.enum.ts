export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  COMMITTED = 'COMMITTED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export const ReservationStatusTransitions: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  [ReservationStatus.ACTIVE]: [
    ReservationStatus.COMMITTED,
    ReservationStatus.RELEASED,
    ReservationStatus.EXPIRED,
  ],
  [ReservationStatus.COMMITTED]: [], // Terminal state
  [ReservationStatus.RELEASED]: [], // Terminal state
  [ReservationStatus.EXPIRED]: [ReservationStatus.RELEASED], // Can be manually released after expiry
};

export function canTransitionTo(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return ReservationStatusTransitions[from].includes(to);
}

export function getValidTransitions(
  status: ReservationStatus,
): ReservationStatus[] {
  return ReservationStatusTransitions[status];
}
