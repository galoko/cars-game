import setupHttpServer from './http-server';
import setupWebSocketServer from './websocket-server';
import { setupWebRtcServer } from './web-rtc-server';

setupHttpServer();
setupWebSocketServer();
setupWebRtcServer();
