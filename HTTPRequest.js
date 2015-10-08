var http = require('https');

module.exports = {
    debuging: false,
    request: function(config, callback){
        var self=this;
        config.host = config.host || ''; 
        config.relativeURL = config.relativeURL || '';
        config.contentType = config.contentType || '';
        config.authorization = config.authorization || '';
        config.method = config.method || '';
        config.data = config.data || '';

        if(self.debuging)
        {
            console.log("\nThe config option passed into config");
            console.info(config);
        }


        var req = http.request({
            hostname: config.host,
            path: config.relativeURL,
            method: config.method,
            headers: {
                "Content-Type": config.contentType,
                "Authorization": "Bearer " + config.authorization,
            }
        }, function(res){
            var result = "";
            res.on('data', function(chunk) {
                result += String(chunk);
            });

            res.on('end', function(){
                if(self.debuging)
                {
                    console.log("\nThe result of our HTTP request.");
                    console.info(result);
                }
                result = JSON.parse(result);

                callback(result);
            });
        });
        if(self.debuging)
        {
            console.log("\nthe data being sent on the request");
            console.log(JSON.stringify(config.data));
        }
        var data = JSON.stringify(config.data);
        req.write(data);
        req.end();
    }
}
