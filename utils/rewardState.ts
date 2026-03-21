/**
 * Lightweight singleton that lets the scanner screen hand off reward
 * information to the Home screen without any async overhead or a full
 * state-management library.
 *
 * Usage:
 *   Scanner  → set `pendingReward` fields before calling router.back()
 *   Home     → read & clear inside useFocusEffect, then show the modal
 */
export const pendingReward = {
  active: false,
  cafeName: '',
  stampCount: 0,
  clear() {
    this.active = false;
    this.cafeName = '';
    this.stampCount = 0;
  },
};
