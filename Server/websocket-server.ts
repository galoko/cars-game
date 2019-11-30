import WebSocket from 'ws';
import PromiseWebSocket from './promise-websocket';
import WebRtcConnection from './webrtc-connection';

async function newConnection(connection: PromiseWebSocket): Promise<void> {
    try {
        try {
            console.log('new connection');
            const rtcConnection = new WebRtcConnection();
            const offer = await rtcConnection.createOffer();
            connection.send(JSON.stringify(offer));
            const answer = JSON.parse(await connection.recv(1000));
            rtcConnection.setAnswer(answer);
        } finally {
            connection.close();
        }
    } catch (e) {
        console.log(e);
    }
}

export default function setupWebSocketServer(): void {
    const server: WebSocket.Server = new WebSocket.Server({
        port: 7465,
        perMessageDeflate: false,
    });

    server.on('connection', (connection: WebSocket): Promise<void> => newConnection(new PromiseWebSocket(connection)));
}
