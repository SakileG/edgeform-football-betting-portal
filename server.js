const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.md': 'text/plain' };
const port = process.env.PORT || 8087;

const server = http.createServer((req, res) => {
  let requestPath = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.slice(1));
  requestPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, requestPath);
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', mime[path.extname(filePath)] || 'text/plain');
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`EdgeForm running at http://127.0.0.1:${port}`);
});
