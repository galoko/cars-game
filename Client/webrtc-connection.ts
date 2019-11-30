export default class WebRtcConnection {
    connection: any;
    dataChannel: any;
    resolve: Function | null = null;
    reject: Function | null = null;
    timeoutTimer: any = null;

    constructor() {
        this.connection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        this.connection.onicecandidate = (e: any): void => this.onIceCandidate(e);
        this.connection.onconnectionstatechange = (e: any): void => this.onConnectionStateChange(e);
        this.connection.oniceconnectionstatechange = (e: any): void => this.onIceConnectionStateCallback(e);

        this.dataChannel = this.connection.createDataChannel('datachannel-buffer-limits');
        // this.dataChannel.addEventListener('message', onMessage);
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

    async createAnswer(offer: any): Promise<string> {
        await this.connection.setRemoteDescription(offer);
        const answer: any = await this.connection.createAnswer();
        this.connection.setLocalDescription(answer);
        await this.waitUntilIceGatheringStateComplete();

        return this.connection.localDescription;
    }

    async waitUntilIceGatheringStateComplete(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            if (this.connection.iceGatheringState === 'complete') {
                this.resolve();
                return;
            }

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), 2000);
        });
    }
}
