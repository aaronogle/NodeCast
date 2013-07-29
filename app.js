//Using @OrangeDog 's version of node-uuid https://github.com/OrangeDog/node-uuid includes uuid v5 which Chromecast uses
var uuid = require('node-uuid');
var dgram = require('dgram');

var ssdp = dgram.createSocket('udp4');

message = 'HTTP/1.1 200 OK\n'+
'LOCATION: http://192.168.1.22:8008/ssdp/device-desc.xml\n'+
'CACHE-CONTROL: max-age=1800\n'+
'CONFIGID.UPNP.ORG: 7337\n'+
'BOOTID.UPNP.ORG: 7337\n'+
'USN: uuid:'+uuid.v5({ns: uuid.ns.DNS, data: "test"})+
'\nST: urn:dial-multiscreen-org:service:dial:1\n\n';
console.log(message);
ssdp.on('listening', function () {
    console.log('SSDP started');
});

ssdp.on('message', function (msg, rinfo) {
    var decodedMsg = msg.toString('utf8');

    if (decodedMsg.indexOf('M-SEARCH') > -1 && decodedMsg.indexOf('urn:dial-multiscreen-org:service:dial:1') > -1) {
        ssdp.send(new Buffer(message), 0, message.length, rinfo.port, rinfo.address, function(err, bytes){
            if (!err) {
                console.log('SSDP response to: '+rinfo.address);
            }
        });
    }

});

ssdp.bind(1900, function(){
    ssdp.addMembership('239.255.255.250');
});

var express = require('express');
var app = express();
var http = require('http');
server = http.createServer(app);
var active_app = 'YouTube';

app.use(express.bodyParser());

app.use(function(req, res, next){
    //console.log(req.headers['user-agent']);
    console.log(req.method, req.url);
    if (req.method == 'POST') {
        console.log(req.body);
    }
    next();
});

app.get('/ssdp/device-desc.xml', function(req, res) {
    var body = '<?xml version="1.0" encoding="utf-8"?>'+
    '<root xmlns="urn:schemas-upnp-org:device-1-0" xmlns:r="urn:restful-tv-org:schemas:upnp-dd">'+
        '<specVersion>'+
        '<major>1</major>'+
        '<minor>0</minor>'+
        '</specVersion>'+
        '<URLBase>http://192.168.1.22:8008</URLBase>'+
        '<device>'+
            '<deviceType>urn:schemas-upnp-org:device:dail:1</deviceType>'+
            '<friendlyName>test</friendlyName>'+
            '<manufacturer>Google Inc.</manufacturer>'+
            '<modelName>Eureka Dongle</modelName>'+
            '<UDN>uuid:'+uuid.v5({ns: uuid.ns.DNS, data: "test"})+'</UDN>'+
            '<serviceList>'+
                '<service>'+
                   '<serviceType>urn:schemas-upnp-org:service:dail:1</serviceType>'+
                    '<serviceId>urn:upnp-org:serviceId:dail</serviceId>'+
                    '<controlURL>/ssdp/notfound</controlURL>'+
                    '<eventSubURL>/ssdp/notfound</eventSubURL>'+
                    '<SCPDURL>/ssdp/notfound</SCPDURL>'+
                '</service>'+
            '</serviceList>'+
        '</device>'+
    '</root>';

    res.setHeader('Access-Control-Allow-Method', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.setHeader('Application-URL', 'http://192.168.1.22:8008/apps');
    res.setHeader('Content-Type', 'application/xml');

    res.send(body);
});

app.get('/apps', function(req, res) {
    if (active_app) {
        res.redirect('/apps/'+active_app);
    }
});

var services = [];
services['c06ac0a4-95e9-4c68-83c5-75e3714ec409'] = new service('c06ac0a4-95e9-4c68-83c5-75e3714ec409', 'http://labs.geekgonecrazy.com/chromecast/receiver.html');
services['YouTube'] = new service('YouTube');
services['ChromeCast'] = new service('ChromeCast');

function service(name, url, protocols) {
    this.running = false;
    this.runningText = 'stopped';
    this.name = name;
    this.url = url;

    this.getBody = function() {
        var body = '<?xml version="1.0" encoding="UTF-8"?>'+
        '<service xmlns="urn:dial-multiscreen-org:schemas:dial">'+
          '<name>'+this.name+'</name>'+
          '<options allowStop="true"/>'+
          '<state>'+this.runningText+'</state>';
          if (this.running) {
            body += '<link rel="run" href="run" />';
          }

        body += '</service>';
        return body.toString();
    }

    this.start = function() {
        this.running = true;
        this.runningText = 'running';
        return this.getBody();
    }

    this.stop = function() {
        this.running = false;
        this.runningText = 'stopped';
    }

    this.launchChrome = function() {

    }
}

app.get('/apps/:name', function(req, res) {
    res.setHeader('Access-Control-Allow-Method', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.setHeader('Application-URL', 'http://192.168.1.22:8008/apps');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-control', 'no-cache, must-revalidate, no-store');
    res.send(services[req.params.name].getBody());
});

app.post('/apps/:name', function(req, res) {
    res.setHeader('Access-Control-Allow-Method', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.setHeader('Application-URL', 'http://192.168.1.22:8008/apps');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-control', 'no-cache, must-revalidate, no-store');
    res.send(services[req.params.name].start());
});


console.log('Listening on port 8008');


server.listen(8008, function() {
    console.log((new Date()) + ' Server is listening on port 8008');
});
