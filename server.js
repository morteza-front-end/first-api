const fs = require("fs");
const http = require("http");
const path = require("path");
const mimeTypes = require("mime-types");
const configs = require("./configs").configs;
const queryStringHandler = require("qs");
const formidable = require("formidable");
const { log } = require("console");
const controllers = require("./controllers/ControllerLoader").controllers;

const server = http.createServer((req, res) => {
  req.parsedURL = new URL(path.join(configs.hostname, req.url));
  getRequestData(req).then((data) => {
    if (req.parsedURL.pathname.search("/api") >= 0) {
      route = getAPIControllerMethodName(req);

      if (controllers[route.controller] != undefined) {
        response = controllers[route.controller][route.method](data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify(response), "binary");
        res.end();
        return;
      }

      res.writeHead(404);
      res.end(route.controller + "Controller not found!");
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
});

server.listen(8080, () => {
  console.log("listen on port: 8080");
});

async function getRequestData(req) {
  let promise = new Promise((resolve, reject) => {
    let data = queryStringHandler.parse(req.parsedURL.search);

    if (req.method == "GET") {
      resolve(data);
    }

    let postData = {
      fields: [],
      files: [],
    };
    let pd = new formidable.IncomingForm();
    pd.parse(req, (err, fields, files) => {
      postData.fields = Object.assign(postData.fields, fields);
      postData.files = Object.assign(postData.files, files);
    });

    pd.on("end", () => {
      data = Object.assign(data, postData);
      resolve(data);
    });
  });
  return promise;
}

function getAPIControllerMethodName(req) {
  parts = req.parsedURL.pathname.split("/");
  return {
    controller: parts[2] != undefined ? parts[2] : "Home",
    method: parts[3] != undefined ? parts[3] : "index",
  };
}
