var config = require("../config.js");
// var userDB = require('../lib/redisProxy.js').select(config.redis.user);
var get = require("./get.js");
var put = require("./put.js");
var occupantDB = require('../lib/redisProxy.js').select(config.redis.occupants);

var core;

function getUserById(id, callback) {
	return get("user", id, function(err, data) {
        if(err || !data) return callback();
        return callback(null, data);
    });    
}


function onGetUsers(query, callback) {
    if(query.ref) {
        if(query.ref == 'me' ) {
            get("session", query.session, function(err, sess) {
            	if(sess){
            		getUserById(sess.user, function(err, data){
	            		if(err || !data){
	            			return callback();
	            		}

	            		query.results = [data]
	            		callback();
	            	});	
            	}else{
            		callback();
            	}
            	
            })
        } else{
        	getUserById(query.ref, function(err, data){
        		if(err || !data){
        			return callback();
        		}
        		query.results = [data]
        		callback();
        	});
        }
    }else if(query.occupantOf) {
        return occupantDB.smembers("room:{{"+query.occupantOf+"}}:hasOccupants", function(err, data) {
            if(err) return callback(err);
            if(!data || data.length==0) return callback(true, []);
            data = data.map(function(e) {
                return "user:{{"+e+"}}";
            });
            occupantDB.mget(data, function(err, data) {
                if(!data) return callback(true, []);
                data = data.map(function(e) {
                    return JSON.parse(e);
                });
                return callback(true, data);
            });
        });
    }else {
        callback();
    }
}

function updateUser(action, callback) {
	put("user", action.user.id, action.user, function() {
		if(action.old && action.old.id) {
	        userDB.del("user:{{"+action.old.id+"}}");
	        occupantDB.smembers("user:{{"+action.old.id+"}}:occupantOf", function(err, data) {
	            data.forEach(function(room) {
	                occupantDB.srem("room:{{"+room+"}}:hasOccupants",action.old.id);
	                occupantDB.sadd("room:{{"+room+"}}:hasOccupants",action.user.id);
	            });
	        });
	        occupantDB.rename("user:{{"+action.old.id+"}}:occupantOf","user:{{"+action.user.id+"}}:occupantOf");
	    }
	    callback();
	});
}

module.exports = function(c) {
	core = c;
	core.on("user", function(action, callback) {
		userDB.put("user:{{"+action.user.id+"}}", JSON.stringify(action.user));
		callback();
	}, "storage");
	core.on("init", updateUser, "storage");
	core.on("getUsers", onGetUsers, "cache");
};