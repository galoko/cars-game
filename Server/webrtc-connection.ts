import WebRTC from 'wrtc';

export default class WebRtcConnection {
    connection: any;
    dataChannel: any;
    resolve: Function | null = null;
    reject: Function | null = null;
    timeoutTimer: any = null;

    onmessage: (message: string) => void | null = null;
    onclose: () => void | null = null;

    constructor() {
        this.connection = new WebRTC.RTCPeerConnection({
            sdpSemantics: 'unified-plan',
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        this.connection.onicecandidate = (e: any): void => this.onIceCandidate(e);
        this.connection.onconnectionstatechange = (e: any): void => this.onConnectionStateChange(e);
        this.connection.oniceconnectionstatechange = (e: any): void => this.onIceConnectionStateCallback(e);
        this.connection.ondatachannel = (e: any): void => this.onChannelCreated(e);

        this.dataChannel = this.connection.createDataChannel('data');
        this.dataChannel.onopen = (e: any): void => this.onChannelOpen(e);
        this.dataChannel.onmessage = (e: any): void => this.onDataMessage(e);
    }

    onTimeout(event: Event): void {
        this.reject('Timeout.');
    }

    onIceCandidate({ candidate }: { candidate: any }): void {
        if (!candidate) {
            console.log(`found all candidates`);

            clearTimeout(this.timeoutTimer);
            this.resolve();
        } else {
            console.log(`found candidate: ${candidate.address}:${candidate.port}`);
        }
    }

    onConnectionStateChange(event: Event): void {
        console.log(`connection state changed: ${this.connection.connectionState}`);
    }

    onIceConnectionStateCallback(event: Event): void {
        console.log(`ice connection state changed: ${this.connection.iceConnectionState}`);
    }

    onChannelCreated(event: any): void {
        const channel = event.channel;

        if (this.dataChannel === channel) {
            this.respondToWaitChannel();
        }
    }

    onChannelOpen(event: any): void {
        this.respondToWaitChannel();
    }

    onDataMessage(event: any): void {
        if (this.onmessage) {
            this.onmessage(event.data);
        }
        console.log(`data: ${event.data}`);
    }

    async createOffer(timeout: number): Promise<any> {
        const offer = await this.connection.createOffer();
        await this.connection.setLocalDescription(offer);
        await this.waitUntilIceGatheringStateComplete(timeout);

        return this.connection.localDescription;
    }

    async setAnswer(answer: any): Promise<void> {
        await this.connection.setRemoteDescription(answer);
    }

    async waitUntilIceGatheringStateComplete(timeout: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            if (this.connection.iceGatheringState === 'complete') {
                this.resolve();
                return;
            }

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), timeout);
        });
    }

    respondToWaitChannel(): boolean {
        if (this.dataChannel.readyState === 'connecting') {
            return false;
        }

        clearTimeout(this.timeoutTimer);
        if (this.dataChannel.readyState === 'open') {
            this.resolve();
        } else {
            this.reject();
        }
        return true;
    }

    async waitChannel(timeout: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            if (this.respondToWaitChannel()) {
                return;
            }

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), timeout);
        });
    }

    send(data: string): void {
        this.dataChannel.send(data);
    }
}
