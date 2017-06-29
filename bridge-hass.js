const exec = require('child_process').exec;

//mock devices
const devices = [];
const hass_entity_to_device = {
  'fan' : {
    type : 'fan',
    actions : {
      switch: ["on", "off"],
      fanspeed: ["up", "down", "max", "min", "switch", "num"],
      swing_mode: ["on", "off"]
    },
    state : {
      switch: null,
      fanspeed: null,
      swing_mode: null
    }
  },
  'light' : {
    type : 'light',
    actions : {
      switch: ["on", "off"],
      color: ["num"],
      brightness: ["up", "down", "max", "min", "num"]
    },
    state : {
      switch: null,
      color: null,
      brightness: null
    }
  },
  'media_player' : {
    type : 'tv',
    actions : {
      switch: ["on", "off"],
      volume: ["up", "down", "max", "min", "num"],
      channel: ["next", "prev", "num"]
    },
    state : {
      switch: null,
      volume: null,
      channel: null
    }
  },
  'switch' : {
    type : 'switch',
    actions : {
      switch: ["on", "off"]
    },
    state : {
      switch: null
    }
  }
};

exports.start = function(PORT, HASS_ADDRESS, cb) {
  // jayson is json-rpc server
  const jayson = require('jayson');

  var hass_base_opt = {
    hostname: HASS_ADDRESS,
    port: 8123,
    path: '/api',
    headers: {
      'Content-Type':'application/json',
    }
  };

  const server = jayson.server({
    list: function(args, callback) {
      var http = require('http');
      var hass_status = "";

      console.log(JSON.stringify(args, null, 4));
      const hass_passwd = args.userAuth.userToken;
      console.log(hass_passwd);

      hass_base_opt.path += "/states";
      hass_base_opt.method = "GET";
      hass_base_opt.headers['x-ha-access'] = hass_passwd;
      console.log(hass_base_opt);
      const req = http.request(hass_base_opt, function (res) {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          hass_status += chunk;
        });
        res.on('end', () => {
          var status = JSON.parse(hass_status);

          for(let i = 0; i < status.length; i++) {
            var entity_id = status[i].entity_id;
            var entity_type = entity_id.toString().split(".")[0];
            var entity_name = entity_id.toString().split(".")[1];
            var name = status[i].attributes.friendly_name || entity_name;

            console.log(hass_entity_to_device[entity_type]);
            if (hass_entity_to_device[entity_type]) {
              devices.push({
                deviceId: entity_id,
                name: name,
                type: hass_entity_to_device[entity_type].type,
                actions: hass_entity_to_device[entity_type].actions,
                state: hass_entity_to_device[entity_type].state,
                offline: false,
                deviceInfo: status[i].attributes
              });
            }
          }
          callback(null, devices);
        });
      });
      req.setTimeout(5000);
      req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
      });
      req.end();
    },
    get: function(args, callback) {
      console.log(JSON.stringify(args, null, 4));
      const devices = [];
      callback(null, devices.find(dev => dev.deviceId === args.device.deviceId));
    },
    execute: function(args, callback) {
      const s = args.action.name;
      exec(`osascript -e 'display notification "light ${s}" sound name "${s === 'on' ? 'Bottle.aiff' : 'Tink.aiff'}"'`, (err) => {
        console.log('=== execute');
        console.log(JSON.stringify(args, null, 4));
        callback(null, {
         switch: s === 'on' ? 'off' : 'on'
        });
      });
    }
  });

  server.http().listen(PORT);
  console.log('server listen on port %s', PORT);
  cb(null, PORT);
};
