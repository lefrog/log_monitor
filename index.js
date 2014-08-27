var fs = require('fs')
    events = require('events');

var pattern = new RegExp(process.argv[2]);
var logfilePath = process.argv[3];

var client = new events.EventEmitter();
var logfileFd,
    logfileWatcher;

var lastFileSize = 0;
var buffer = new Buffer(1024 * 4000);

function getFileSizeDelta(next) {
    fs.stat(logfilePath, function(err, stats) {
        if (err) {
            console.log("Can't get file stats: %s", err);
        }
        
        var delta = stats.size - lastFileSize;
        var start = lastFileSize;
        lastFileSize = stats.size;

        var bufOffset = 0;
        fs.read(logfileFd, buffer, bufOffset, delta, start, function(err, bytesRead, buf) {
            //console.log("bytesRead: %s, '%s'", bytesRead, buffer.toString('utf8', 0, bytesRead-1));
            var str = buffer.toString('utf8', 0, bytesRead-1);
            var lines = str.split(/\n/);
            lines.forEach(function(line) {
                if (pattern.test(line)) {
                    client.emit("match", line);
                }
            });
        });
    });
}

function startWatching() {
    fs.open(logfilePath, "r", function(err, fd) {
        if (err) {
            console.log('Open log file failed: %s', err);
            return;
        }
        
        logfileFd = fd;
        logfileWatcher = fs.watch(logfilePath, {persistent: true}, function(event, filename) {
           getFileSizeDelta();
        });
    });
}

client.on("match", function(str) {
    console.log("Match: %s", str);
});

startWatching();

console.log("Looking for '%s' in %s...", pattern.toString(), logfilePath);
