export default class WebRtcConnection {
    connection: any;
    dataChannel: any;
    dataChannelName: string;
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
        this.connection.ondatachannel = (e: any): void => this.onChannelCreated(e);

        this.dataChannel = null;
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

        this.dataChannel = channel;
        this.dataChannel.onopen = (e: any): void => this.onChannelOpen(e);
        this.dataChannel.onmessage = (e: any): void => this.onDataMessage(e);

        this.respondToWaitChannel();

        console.log(`channel: ${channel.label}`);
    }

    onChannelOpen(event: any): void {
        this.respondToWaitChannel();
    }

    onDataMessage(event: any): void {
        const data = event.data;
        console.log(`message: ${data}`);
    }

    async createAnswer(offer: any, timeout: number): Promise<string> {
        await this.connection.setRemoteDescription(offer);
        const answer: any = await this.connection.createAnswer();
        this.connection.setLocalDescription(answer);
        await this.waitUntilIceGatheringStateComplete(timeout);

        return this.connection.localDescription;
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
        if (this.dataChannel === null || this.dataChannel.readyState === 'connecting') {
            return false;
        }

        clearTimeout(this.timeoutTimer);
        if (this.dataChannel.label === this.dataChannelName && this.dataChannel.readyState === 'open') {
            this.resolve();
        } else {
            this.reject();
        }
        return true;
    }

    async waitChannel(name: string, timeout: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.dataChannelName = name;
            if (this.respondToWaitChannel()) {
                return;
            }

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), timeout);
        });
    }

    send(data: Uint8Array): void {
        this.dataChannel.send(data);
    }

    /*
    async recv(packetTypes: Array<string>, timeout: number): Promise<string> {
        //
    }
    */
}
