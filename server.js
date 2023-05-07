const fs = require('fs');
const http = require('http');
const path = require('path');
const mimeTypes = require('mime-types');
const configs = require('./configs').configs;
const queryStringHandler = require('qs');
const controllers = require('./controllers/ControllerLoader').controllers;

const server = http.createServer((req, res) => {
    console.log(req.url);

    req.parsedURL = new URL(path.join(configs.hostname, req.url));
    let data = getRequestData(req);

    if (req.parsedURL.pathname.search('/api') >= 0) {
        route = getAPIControllerMethodName(req);

        if (controllers[route.controller] != undefined) {
            response = controllers[route.controller][route.method](data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify(response), "binary");
            res.end();
            return;
        }

        res.writeHead(404);
        res.end(route.controller + 'Controller not found!');
        return;
    }

    let filePath = path.join(__dirname, req.parsedURL.pathname);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }

        let mimeType = mimeTypes.lookup(filePath);
        res.writeHead(200, { "Content-Type": mimeType });
        res.write(data, "binary");
        res.end();
    });
});

server.listen(8080, () => {
    console.log('listen on port: 8080');
});

function getRequestData(req) {
    let data = queryStringHandler.parse(req.parsedURL.search);

    if (req.method == 'GET') {
        return data;
    }

    let postData = '';
    req.on('data', dataPart => {
        postData += dataPart;
    });

    req.on('end', () => {
        data = Object.assign(data, JSON.parse(postData));
    });

    return data;
}

function getAPIControllerMethodName(req) {
    parts = req.parsedURL.pathname.split('/');

    return {
        controller: (parts[2] != undefined ? parts[2] : 'Home'),
        method: (parts[3] != undefined ? parts[3] : 'index')
    };
}