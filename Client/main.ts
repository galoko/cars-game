import PromiseWebSocket from './promise-websocket';
import WebRtcConnection from './webrtc-connection';

class Test2 {
    a: number;
}

class Test {
    b: Test2 = new Test2();
    c: Array<Test2> = [new Test2()];
}

async function main(): Promise<any> {
    const connection = new PromiseWebSocket();

    try {
        let rtcConnection;
        try {
            await connection.open('ws://localhost:7465/', 5000);
            const message = JSON.parse(await connection.recv(3000));
            rtcConnection = new WebRtcConnection();
            const answer = await rtcConnection.createAnswer(message, 2000);
            connection.send(JSON.stringify(answer));
            await rtcConnection.waitChannel('data', 2000);
        } finally {
            connection.close();
        }
        console.log('connected');

        rtcConnection.send(new Uint8Array([0xde, 0xad]));
    } catch (e) {
        console.log(e);
    }
}
main();
