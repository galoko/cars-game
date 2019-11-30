import WebRTC from 'wrtc';

const TIME_TO_CONNECTED = 10000;
const TIME_TO_HOST_CANDIDATES = 3000;
const TIME_TO_RECONNECTED = 10000;

let peerConnection: any;
let dataChannel: any;

let uploadStartTime = 0;
let uploadedBytesTotal = 0;
let chunkSize = 64; // Default value, updated from the client

function onMessage({ data }: { data: any }): void {
    if (/^#START/.test(data)) {
        uploadStartTime = Date.now();
        const value = parseInt(data.split(' ')[1]);

        if (!isNaN(value)) {
            chunkSize = value;
        }

        return;
    }

    if (data === '#STOP') {
        const uploadDuration = Date.now() - uploadStartTime;

        console.log('Client upload duration :', uploadDuration, 'ms');
        console.log(`uploadedBytesTotal : ${uploadedBytesTotal}`);

        const queueStartTime = Date.now();
        const chunkSizeInBytes = chunkSize * 1024;

        const loops = uploadedBytesTotal / chunkSizeInBytes;
        const rem = uploadedBytesTotal % chunkSizeInBytes;
        const obuf = new Array(chunkSizeInBytes + 1).join('.');

        try {
            dataChannel.send('#START ' + uploadDuration);

            for (let i = 0; i < loops; i++) {
                dataChannel.send(obuf);
            }

            if (rem) {
                dataChannel.send(obuf);
            }

            const queueDuration = Date.now() - queueStartTime;

            dataChannel.send('#STOP ' + queueDuration);
            console.log(`Data sent back to client, queueDuration : ${queueDuration} ms`);
        } catch (e) {
            console.log('Failed to send data :', e);
            dataChannel.removeEventListener('message', onMessage);
            dataChannel.close();
            peerConnection.close();
        }

        return;
    }

    uploadedBytesTotal += Buffer.byteLength(data);
}

function onConnectionStateChange(event: any): void {
    switch (peerConnection.connectionState) {
        case 'disconnected':
        case 'failed':
        case 'closed':
            console.log(`Received close event, state: ${peerConnection.connectionState}`);
            dataChannel.removeEventListener('message', onMessage);
            dataChannel.close();
            break;
    }
}

let connectionTimer: any = null;
let reconnectionTimer: any = null;
let iceConnectionStateCallback: any = null;

const close = (): void => {
    console.log('close');

    peerConnection.removeEventListener('iceconnectionstatechange', iceConnectionStateCallback);
    if (connectionTimer) {
        clearTimeout(connectionTimer);
        connectionTimer = null;
    }
    if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
        reconnectionTimer = null;
    }
    peerConnection.close();
};

const onIceConnectionStateChange = (): void => {
    console.log(`onIceConnectionStateChange: ${peerConnection.iceConnectionState}`);

    if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
        if (connectionTimer) {
            clearTimeout(connectionTimer);
            connectionTimer = null;
        }
        clearTimeout(reconnectionTimer);
        reconnectionTimer = null;
    } else if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
        if (!connectionTimer && !reconnectionTimer) {
            reconnectionTimer = setTimeout(() => {
                close();
            }, TIME_TO_RECONNECTED);
        }
    }
};
iceConnectionStateCallback = onIceConnectionStateChange;

async function waitUntilIceGatheringStateComplete(peerConnection: any): Promise<any> {
    if (peerConnection.iceGatheringState === 'complete') {
        return;
    }

    const deferred: { resolve: any; reject: any; promise?: Promise<any> } = {
        resolve: null,
        reject: null,
    };

    deferred.promise = new Promise((resolve, reject: any) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    const timeout: any = null;

    function onIceCandidate({ candidate }: { candidate: any }): void {
        if (!candidate) {
            console.log(`found all candidates`);
            clearTimeout(timeout);
            peerConnection.removeEventListener('icecandidate', onIceCandidate);
            deferred.resolve();
        } else {
            console.log(`found candidate: ${candidate.address}:${candidate.port}`);
        }
    }

    /*
    timeout = setTimeout(() => {
        peerConnection.removeEventListener('icecandidate', onIceCandidate);
        deferred.reject(new Error('Timed out waiting for host candidates'));
    }, TIME_TO_HOST_CANDIDATES);
    */

    peerConnection.addEventListener('icecandidate', onIceCandidate);

    await deferred.promise;
}

const doOffer = async (): Promise<any> => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    try {
        await waitUntilIceGatheringStateComplete(peerConnection);
    } catch (error) {
        close();
        throw error;
    }
};

const applyAnswer = async (answer: any): Promise<any> => {
    await peerConnection.setRemoteDescription(answer);
};

function disableTrickleIce(sdp: string): string {
    return sdp.replace(/\r\na=ice-options:trickle/g, '');
}

function descriptionToJSON(description: any, shouldDisableTrickleIce: boolean): any {
    return !description
        ? {}
        : {
              type: description.type,
              sdp: shouldDisableTrickleIce ? disableTrickleIce(description.sdp) : description.sdp,
          };
}

function iceConnectionState(): any {
    return peerConnection.iceConnectionState;
}

function localDescription(): any {
    return descriptionToJSON(peerConnection.localDescription, true);
}

function remoteDescription(): any {
    return descriptionToJSON(peerConnection.remoteDescription, false);
}

function signalingState(): any {
    return peerConnection.signalingState;
}

export async function setupWebRtcServer(): Promise<any> {
    return;

    peerConnection = new WebRTC.RTCPeerConnection({
        sdpSemantics: 'unified-plan',
        iceServers: [{ urls: 'stun:stun.stunprotocol.org:3478' }, { urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
    peerConnection.addEventListener('iceconnectionstatechange', iceConnectionStateCallback);

    dataChannel = peerConnection.createDataChannel('datachannel-buffer-limits');
    dataChannel.addEventListener('message', onMessage);

    await doOffer();

    console.log(peerConnection.localDescription.sdp);
    console.log(JSON.stringify(peerConnection.localDescription));

    /*
    connectionTimer = setTimeout(() => {
        if (peerConnection.iceConnectionState !== 'connected' && peerConnection.iceConnectionState !== 'completed') {
            close();
        }
    }, TIME_TO_CONNECTED);
    */
}

export async function getNewWebRtcConnectionOffer(): Promise<any> {
    //
}
