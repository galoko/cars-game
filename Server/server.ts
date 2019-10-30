import express from 'express';

export default function setupHttpServer(): void {
    const app = express();
    const port = 8080; // default port to listen

    // define a route handler for the default home page
    app.get('/', (req, res) => {
        res.send('Hello world!');
    });

    app.use(express.static('public'));

    app.listen(port, () => {
        console.log(`server started at http://localhost:${port}`);
    });
}
