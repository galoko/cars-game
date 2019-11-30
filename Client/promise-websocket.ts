export default class PromiseWebSocket {
    socket: WebSocket | null = null;
    bufferedMessage: string | null = null;
    resolve: Function | null = null;
    reject: Function | null = null;
    timeoutTimer: any = null;

    onOpen(event: Event): void {
        clearTimeout(this.timeoutTimer);

        const resolve = this.resolve;
        this.resolve = null;
        resolve();
    }

    onMessage(event: MessageEvent): void {
        this.bufferedMessage = event.data;
        this.processRecv();
    }

    onTimeout(event: Event): void {
        this.reject('Timeout.');
    }

    onClose(event: CloseEvent): void {
        this.reject('Closed.');
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

    async open(url: string, timeout: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.socket = new WebSocket(url);
            this.socket.onopen = (e: Event): void => this.onOpen(e);
            this.socket.onmessage = (e: MessageEvent): void => this.onMessage(e);
            this.socket.onclose = (e: CloseEvent): void => this.onClose(e);

            this.timeoutTimer = setTimeout((e: Event): void => this.onTimeout(e), timeout);
        });
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
