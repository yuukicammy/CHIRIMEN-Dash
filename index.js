const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(1337);

console.log('Server running at http://localhost:1337/');

var apiai = require('apiai');

var app = apiai("507fa7521a514e4098d4e309f5f42502");

var request = app.textRequest('Hello!!!!!', {
    //sessionId: '<unique session id>'
});

request.on('response', function(response) {
    console.log(response);
});

request.on('error', function(error) {
    console.log(error);
});

request.end();

