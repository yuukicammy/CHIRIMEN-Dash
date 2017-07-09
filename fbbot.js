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