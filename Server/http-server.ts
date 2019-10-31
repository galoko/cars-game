import express from 'express';

export default function setupHttpServer(): void {
    const app = express();
    const port = 8080;

    app.use(express.static('../Client/build'));

    app.post('/connection-info/new', (req, res) => {
        // TODO
    });

    console.log('test');

    app.listen(port, () => {
        console.log(`server started at http://localhost:${port}`);
    });
}
