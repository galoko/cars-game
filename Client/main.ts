import PromiseWebSocket from './promise-websocket';
import WebRtcConnection from './webrtc-connection';

async function main(): Promise<any> {
    const connection = new PromiseWebSocket();

    try {
        await connection.open('ws://localhost:7465/', 5000);
        const message = JSON.parse(await connection.recv(3000));
        const rtcConnection = new WebRtcConnection();
        const answer = await rtcConnection.createAnswer(message);
        connection.send(JSON.stringify(answer));
    } catch (e) {
        console.log(e);
    }
}
main();
