export interface AutomaticDispatchRetryState {
  status: string;
  nature: string;
  triageClassification: string;
}

export interface DispatchOfferState {
  status: string;
  currentOfferResponderId: string | null;
  responderId: string | null;
}

export function shouldRetryAutomaticDispatch(request: AutomaticDispatchRetryState) {
  return request.status === 'PENDING'
    && request.nature === 'EMERGENCY'
    && request.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY';
}

export function canResponderAcceptDispatchOffer(
  incident: DispatchOfferState,
  responderId: string,
) {
  return incident.status === 'DISPATCHED'
    && incident.currentOfferResponderId === responderId
    && incident.responderId === null;
}

export function canCascadeDispatchOffer(
  incident: DispatchOfferState,
  responderId: string,
) {
  return canResponderAcceptDispatchOffer(incident, responderId);
}
