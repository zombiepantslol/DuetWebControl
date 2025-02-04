<style scoped>
iframe {
	width: 100%;
	height: 100%;
	border: 0px;
	overflow: hidden;
}

img,
video {
	max-width: 100%;
	max-height: 100%;
}

.img-container {
	overflow: hidden;
}

.flip-x {
	-moz-transform: scaleX(-1);
	-o-transform: scaleX(-1);
	-webkit-transform: scaleX(-1);
	transform: scaleX(-1);
	filter: FlipH;
	-ms-filter: "FlipH";
}

.flip-y {
	-moz-transform: scaleY(-1);
	-o-transform: scaleY(-1);
	-webkit-transform: scaleY(-1);
	transform: scaleY(-1);
	filter: FlipV;
	-ms-filter: "FlipV";
}

.rotate-90 {
	transform: rotate(90deg);
	-ms-transform: rotate(90deg);
	-moz-transform: rotate(90deg);
	-webkit-transform: rotate(90deg);
	-o-transform: rotate(90deg);
}

.rotate-180 {
	transform: rotate(180deg);
	-ms-transform: rotate(180deg);
	-moz-transform: rotate(180deg);
	-webkit-transform: rotate(180deg);
	-o-transform: rotate(180deg);
}

.rotate-270 {
	transform: rotate(270deg);
	-ms-transform: rotate(270deg);
	-moz-transform: rotate(270deg);
	-webkit-transform: rotate(270deg);
	-o-transform: rotate(270deg);
}
</style>

<template>
	<v-card>
		<v-card-title>
			{{ $t("panel.webcam.caption") }}
		</v-card-title>

		<v-card-text class="pa-0 img-container">
			<v-responsive v-if="webcam.embedded" :aspect-ratio="16/9">
				<iframe :src="webcam.url" :class="classList"></iframe>
			</v-responsive>

			<a v-else-if="webcam.enabled" :href="webcam.liveUrl ? webcam.liveUrl : 'javascript:void(0)'">
				<video v-if="webcamIsRTC" ref="remoteVideo" autoplay playsinline="true" :class="classList"></video>
				<img v-else :alt="$t('panel.webcam.alt')" :src="active ? url : ''" :class="classList">
			</a>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from "vue";

import store from "@/store";
import { WebcamFlip } from "@/store/settings";

const webcam = computed(() => store.state.settings.webcam);
const webcamIsRTC = computed(() => webcam.value.url.startsWith("ws:") || webcam.value.url.startsWith("wss:"));

// Lifecycle
const active = ref(true);

onActivated(() => {
	active.value = true;
	if (!webcam.value.embedded) {
		update();
		if (!webcamIsRTC.value && webcam.value.updateInterval > 0) {
			updateTimer = setInterval(update, webcam.value.updateInterval);
		}
	}
});

onDeactivated(() => {
	closeWebRTC();
	if (updateTimer !== null) {
		clearInterval(updateTimer);
		updateTimer = null;
	}
	active.value = false;
});

// WebRTC
const remoteVideo = ref<HTMLVideoElement | null>(null);
let signalingSocket: WebSocket | null = null, peerConnection: RTCPeerConnection | null = null;

let connectingRTC = false;
async function connectWebRTC() {
	// Don't connect if we're already trying to connect
	if (connectingRTC) {
		return;
	}
	connectingRTC = true;

	// Create RTC peer connection
	peerConnection = new RTCPeerConnection({
		//iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
	});

	if (remoteVideo.value !== null) {
		const audioTrack = peerConnection!.addTransceiver("audio", { direction: "recvonly" }).receiver.track;
		const videoTrack = peerConnection!.addTransceiver("video", { direction: "recvonly" }).receiver.track;
		remoteVideo.value.srcObject = new MediaStream([audioTrack, videoTrack]);
	}

	// Make signaling socket
	signalingSocket = new WebSocket(url.value);
	signalingSocket.onerror = () => {
		connectingRTC = false;
	};
	signalingSocket.onopen = () => {
		connectingRTC = false;

		peerConnection!.addEventListener("icecandidate", e => {
			if (e.candidate) {
				const msg = { type: "webrtc/candidate", value: e.candidate.candidate };
				signalingSocket!.send(JSON.stringify(msg));
			}
		});

		peerConnection!.createOffer().then(offer => peerConnection!.setLocalDescription(offer)).then(() => {
			const msg = { type: "webrtc/offer", value: peerConnection!.localDescription?.sdp };
			signalingSocket!.send(JSON.stringify(msg));
		});
	}
	signalingSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		if (msg.type === "webrtc/candidate") {
			peerConnection!.addIceCandidate({ candidate: msg.value, sdpMid: "0" });
		} else if (msg.type === "webrtc/answer") {
			peerConnection!.setRemoteDescription({ type: "answer", sdp: msg.value });
		}
	}
}

function closeWebRTC() {
	if (peerConnection !== null) {
		peerConnection.close();
		peerConnection = null;
	}

	if (signalingSocket !== null) {
		signalingSocket.close();
		signalingSocket = null;
	}
}

// Update mechanism
const url = ref("");
let updateTimer: ReturnType<typeof setInterval> | null = null;

function update() {
	let urlValue = webcam.value.url.replace("[HOSTNAME]", store.getters["machine/connector"] ? store.getters["machine/connector"].hostname : location.hostname);
	if (webcamIsRTC.value) {
		// Kill existing WebRTC connections
		closeWebRTC();

		// Try to connect again
		url.value = urlValue;
		connectWebRTC();
	} else if (webcam.value.updateInterval > 0) {
		// Generate webcam URL
		if (webcam.value.useFix) {
			urlValue += "_" + Math.random();
		} else {
			if (urlValue.indexOf("?") === -1) {
				urlValue += "?dummy=" + Math.random();
			} else {
				urlValue += "&dummy=" + Math.random();
			}
		}

		// Apply it
		url.value = urlValue;
	}
}

watch(() => webcam.value, () => {
	if (webcam.value.updateInterval === 0) {
		// For persistent images or RTC streams we need to apply updates independently of the update loop
		update();
	}
}, { deep: true });

// Styling
const classList = computed(() => {
	const result = [];

	if (webcam.value.flip === WebcamFlip.X || webcam.value.flip === WebcamFlip.Both) {
		result.push("flip-x");
	}
	if (webcam.value.flip === WebcamFlip.Y || webcam.value.flip === WebcamFlip.Both) {
		result.push("flip-y");
	}

	if (webcam.value.rotation === 90) {
		result.push("rotate-90");
	} else if (webcam.value.rotation === 180) {
		result.push("rotate-180");
	} else if (webcam.value.rotation === 270) {
		result.push("rotate-270");
	}

	return result;
});
</script>
