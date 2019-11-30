import WebSocket from 'ws';

export default class PromiseWebSocket {
    socket: WebSocket | null = null;
    bufferedMessage: string | null = null;
    resolve: Function | null = null;
    reject: Function | null = null;
    timeoutTimer: any = null;

    constructor(socket: WebSocket) {
        this.socket = socket;
        this.socket.on('message', (data: string): void => this.onMessage(data));
        this.socket.on('close', () => this.onClose());
    }

    onMessage(data: string): void {
        this.bufferedMessage = data;
        this.processRecv();
    }

    onTimeout(event: Event): void {
        this.reject('Timeout.');
    }

    onClose(): void {
        if (this.reject !== null) {
            this.reject('Closed.');
        }
    }

    processRecv(): void {
        if (this.resolve !== null && this.bufferedMessage !== null) {
            clearTimeout(this.timeoutTimer);

            const message = this.bufferedMessage;
            this.bufferedMessage = null;

            const resolve = this.resolve;
            this.resolve = null;
            resolve(message);
        }
    }

    async recv(timeout: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            if (this.socket.readyState !== 1) {
                this.reject('Not connected.');
                return;
            }

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), timeout);

            this.processRecv();
        });
    }

    send(data: string): void {
        this.socket.send(data);
    }

    close(): void {
        if (this.socket !== null) {
            this.socket.close();
        }
    }
}
