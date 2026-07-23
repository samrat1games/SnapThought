/**
 * Live Streaming Service — WebRTC + Supabase Realtime
 */

import { supabase, getCurrentUserId } from '../supabase.js';

// ============================================
// WebRTC State
// ============================================
let localStream = null;
let screenStream = null;
let peerConnections = {}; // viewerId -> RTCPeerConnection
let signalingChannel = null;
let currentStreamId = null;
let isBroadcaster = false;

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

// ============================================
// Media Device Helpers
// ============================================

export async function getCameraStream(constraints = {}) {
  const defaultConstraints = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  };
  const merged = {
    video: { ...defaultConstraints.video, ...constraints.video },
    audio: constraints.audio !== undefined ? constraints.audio : defaultConstraints.audio,
  };
  localStream = await navigator.mediaDevices.getUserMedia(merged);
  return localStream;
}

export async function getScreenStream() {
  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  // Handle user stopping screen share via browser UI
  screenStream.getVideoTracks()[0].onended = () => {
    screenStream = null;
    window.dispatchEvent(new CustomEvent('screen-share-stopped'));
  };
  return screenStream;
}

export async function getDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    cameras: devices.filter(d => d.kind === 'videoinput'),
    microphones: devices.filter(d => d.kind === 'audioinput'),
    speakers: devices.filter(d => d.kind === 'audiooutput'),
  };
}

export function switchCamera(deviceId) {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.stop();
  }
  return navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId } },
    audio: false,
  }).then(stream => {
    const newTrack = stream.getVideoTracks()[0];
    localStream.removeTrack(localStream.getVideoTracks()[0]);
    localStream.addTrack(newTrack);
    // Replace in all peer connections
    Object.values(peerConnections).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newTrack);
    });
    return newTrack;
  });
}

export function toggleMic() {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return audioTrack.enabled;
  }
  return false;
}

export function toggleCamera() {
  if (!localStream) return false;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    return videoTrack.enabled;
  }
  return false;
}

export function getLocalStream() {
  return localStream;
}

export function getScreenStreamActive() {
  return screenStream;
}

// ============================================
// Supabase Realtime Signaling
// ============================================

function initSignaling(streamId) {
  currentStreamId = streamId;
  signalingChannel = supabase.channel(`live-${streamId}`, {
    config: { broadcast: { self: false } }
  });

  signalingChannel
    .on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (isBroadcaster) return;
      await handleOffer(payload);
    })
    .on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (!isBroadcaster) return;
      await handleAnswer(payload);
    })
    .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      await handleIceCandidate(payload);
    })
    .on('broadcast', { event: 'viewer-joined' }, ({ payload }) => {
      if (isBroadcaster) {
        // Send offer to new viewer
        createOfferForViewer(payload.viewerId);
      }
    })
    .on('broadcast', { event: 'stream-ended' }, () => {
      window.dispatchEvent(new CustomEvent('stream-ended'));
    })
    .subscribe();
}

// ============================================
// Broadcaster (Streamer)
// ============================================

export async function startBroadcast(streamId, stream) {
  isBroadcaster = true;
  currentStreamId = streamId;
  localStream = stream;

  initSignaling(streamId);

  // Listen for new viewers
  signalingChannel.on('broadcast', { event: 'viewer-joined' }, ({ payload }) => {
    createOfferForViewer(payload.viewerId);
  });

  return localStream;
}

async function createOfferForViewer(viewerId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  peerConnections[viewerId] = pc;

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }
  if (screenStream) {
    screenStream.getVideoTracks().forEach(track => pc.addTrack(track, screenStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      signalingChannel.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { candidate: event.candidate, targetId: viewerId, senderId: 'broadcaster' }
      });
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      pc.close();
      delete peerConnections[viewerId];
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  signalingChannel.send({
    type: 'broadcast',
    event: 'offer',
    payload: { sdp: pc.localDescription, viewerId }
  });
}

async function handleAnswer(payload) {
  const pc = peerConnections[payload.viewerId];
  if (pc && payload.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  }
}

// ============================================
// Viewer
// ============================================

export async function startViewing(streamId, viewerId) {
  isBroadcaster = false;
  currentStreamId = streamId;

  initSignaling(streamId);

  // Tell broadcaster we joined
  signalingChannel.send({
    type: 'broadcast',
    event: 'viewer-joined',
    payload: { viewerId }
  });

  return new Promise((resolve) => {
    // Wait for offer from broadcaster
    const handler = async ({ payload }) => {
      if (payload.viewerId !== viewerId) return;
      signalingChannel.off('broadcast', handler);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections['broadcaster'] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingChannel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate, targetId: 'broadcaster', senderId: viewerId }
          });
        }
      };

      pc.ontrack = (event) => {
        resolve(event.streams[0]);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingChannel.send({
        type: 'broadcast',
        event: 'answer',
        payload: { sdp: pc.localDescription, viewerId }
      });
    };

    signalingChannel.on('broadcast', { event: 'offer' }, handler);

    // Timeout fallback — if no offer in 5s, return null
    setTimeout(() => {
      signalingChannel.off('broadcast', handler);
      resolve(null);
    }, 5000);
  });
}

async function handleOffer(payload) {
  // Viewer handles offer in startViewing
}

async function handleIceCandidate(payload) {
  const targetPc = peerConnections[payload.targetId] || peerConnections['broadcaster'];
  if (targetPc && payload.candidate) {
    await targetPc.addIceCandidate(new RTCIceCandidate(payload.candidate));
  }
}

// ============================================
// Stop / Cleanup
// ============================================

export function stopBroadcast() {
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }

  if (signalingChannel && currentStreamId) {
    signalingChannel.send({
      type: 'broadcast',
      event: 'stream-ended',
      payload: {}
    });
    supabase.removeChannel(signalingChannel);
  }

  signalingChannel = null;
  currentStreamId = null;
  isBroadcaster = false;
}

export function stopViewing() {
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};

  if (signalingChannel) {
    supabase.removeChannel(signalingChannel);
  }
  signalingChannel = null;
  currentStreamId = null;
  isBroadcaster = false;
}

export function shareScreen() {
  return getScreenStream().then(stream => {
    if (localStream && stream) {
      // Replace video track with screen track
      const screenTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      Object.values(peerConnections).forEach(pc => {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) videoSender.replaceTrack(screenTrack);
        if (audioTrack) {
          const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (audioSender) audioSender.replaceTrack(audioTrack);
        }
      });

      screenTrack.onended = () => {
        // Switch back to camera
        const camTrack = localStream.getVideoTracks()[0];
        Object.values(peerConnections).forEach(pc => {
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (videoSender && camTrack) videoSender.replaceTrack(camTrack);
        });
        screenStream = null;
        window.dispatchEvent(new CustomEvent('screen-share-stopped'));
      };
    }
    return stream;
  });
}

// ============================================
// Database Operations (kept from original)
// ============================================

export const LiveStreamingService = {
  async startLiveStream(title, description = '') {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('live_streams')
      .insert({ user_id: userId, title, description, status: 'live', started_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return data;
  },

  async endLiveStream(streamId) {
    const { data, error } = await supabase
      .from('live_streams')
      .update({ status: 'offline', ended_at: new Date().toISOString() })
      .eq('id', streamId).select().single();
    if (error) throw error;
    return data;
  },

  async getLiveStream(streamId) {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*, streamer:user_id(id, username, display_name, avatar_url, is_verified)')
      .eq('id', streamId).single();
    if (error) throw error;
    return data;
  },

  async getActiveStreams(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*, streamer:user_id(id, username, display_name, avatar_url, is_verified)')
      .eq('status', 'live')
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data };
  },

  async joinStream(streamId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('live_stream_viewers')
      .insert({ stream_id: streamId, user_id: userId, joined_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return data;
  },

  async leaveStream(viewerId) {
    const { error } = await supabase
      .from('live_stream_viewers')
      .update({ left_at: new Date().toISOString() })
      .eq('id', viewerId);
    if (error) throw error;
    return true;
  },

  async sendChatMessage(streamId, message) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from('live_stream_messages')
      .insert({ stream_id: streamId, user_id: userId, message })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getStreamMessages(streamId, limit = 50) {
    const { data, error } = await supabase
      .from('live_stream_messages')
      .select('*, sender:user_id(id, username, display_name, avatar_url, is_verified)')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async sendGift(streamId, giftType, quantity = 1, toUserId = null) {
    const fromUserId = await getCurrentUserId();
    if (!fromUserId) throw new Error('User not authenticated');
    if (!toUserId) {
      const stream = await this.getLiveStream(streamId);
      toUserId = stream.user_id;
    }
    const { data, error } = await supabase
      .from('live_stream_gifts')
      .insert({ stream_id: streamId, from_user_id: fromUserId, to_user_id: toUserId, gift_type: giftType, quantity })
      .select().single();
    if (error) throw error;
    return data;
  },

  async likeStream(streamId) {
    await supabase.rpc('increment_live_likes', { stream_id: streamId });
    return true;
  },

  async updateStream(streamId, updates) {
    const { data, error } = await supabase
      .from('live_streams')
      .update(updates).eq('id', streamId).select().single();
    if (error) throw error;
    return data;
  },
};
