import { CONFERENCE_LEFT } from '../conference';
import { MiddlewareRegistry } from '../redux';
import { setTrackMuted, TRACK_ADDED } from '../tracks';

import {
    audioMutedStateChanged,
    cameraFacingModeChanged,
    videoMutedStateChanged
} from './actions';
import { CAMERA_FACING_MODE } from './constants';

/**
 * Middleware that captures CONFERENCE_LEFT action and restores initial state
 * for media devices. Also captures TRACK_ADDED to sync 'muted' state.
 *
 * @param {Store} store - Redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_LEFT:
        resetInitialMediaState(store);
        break;

    case TRACK_ADDED:
        if (action.track.local) {
            syncTrackMutedState(store, action.track);
        }
        break;
    }

    return result;
});

/**
 * Resets initial media state.
 *
 * @param {Store} store - Redux store.
 * @returns {void}
 */
function resetInitialMediaState(store) {
    const { dispatch, getState } = store;
    const state = getState();
    const mediaState = state['features/base/media'];

    // Optimization - do not unmute local audio if it's already unmuted.
    if (mediaState.audio.muted) {
        dispatch(audioMutedStateChanged(false));
    }

    // Optimization - do not re-create local video track if we already showing
    // "user" facing mode.
    if (mediaState.video.facingMode !== CAMERA_FACING_MODE.USER) {
        dispatch(cameraFacingModeChanged(CAMERA_FACING_MODE.USER));
    }

    // Optimization - do not unmute local video if it's already unmuted.
    if (mediaState.video.muted) {
        dispatch(videoMutedStateChanged(false));
    }
}

/**
 * Syncs muted state of local media track with muted state from media state.
 *
 * @param {Store} store - Redux store.
 * @param {Track} track - Local media track.
 * @returns {void}
 */
function syncTrackMutedState(store, track) {
    const mediaState = store.getState()['features/base/media'];
    const isMuted = mediaState[track.mediaType].muted;

    // XXX If muted state of track when it was added is different from our media
    // muted state, we need to mute track and explicitly modify 'muted' property
    // on track. This is because though TRACK_ADDED action was dispatched it's
    // not yet in Redux state and JitsiTrackEvents.TRACK_MUTE_CHANGED may be
    // fired before track gets to state.
    if (track.muted !== isMuted) {
        track.muted = isMuted;
        setTrackMuted(track.jitsiTrack, isMuted);
    }
}
