const http = require('http');
const $ = require('jquery');

http.createServer((req, res) => {
  console.log(req.headers);
  res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
  res.end('Hello World\n');
}).listen(1337);

console.log('Server running at http://localhost:1337/');