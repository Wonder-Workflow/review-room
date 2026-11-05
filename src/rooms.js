export function caseRoomName(reviewId) {
  return `review-${reviewId}`;
}

export function staffRoomName(reviewId, name) {
  return `review-${reviewId}-${String(name).toLowerCase()}`;
}
