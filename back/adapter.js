// DB adapter logic.
// Namespaced under a room id.

// Dependencies
var redis  = require('redis'),
    Q      = require('q'),
    _      = require('lodash'),
    client = redis.createClient();


var Adapter = {};


// Redis keys
var baseKey = 'plst';

var roomKey = function(roomId){ 
  return baseKey + ':rooms:' + roomId;
};

var userKey = function(roomId, userId){ 
  return roomKey(roomId) + ':users:' + userId;
};

var playlistKey = function(roomId){
  return roomKey(roomId) + ':playlist';
};

var trackKey = function(trackId){
  return baseKey + ':tracks:' + trackId;
};


// Helpers
var setBaseScore = function(roomId, trackId){
  console.log('setting base score',  roomId, trackId);
  return Q.ninvoke(client, 'zscore', playlistKey(roomId), trackId)
  .then(function(res){

    // Existing : return
    if (!!res) {
      console.log('track already upvoted', res);
      return false;
    }

    // Else, set to 1 and return true
    else {
      console.log('upvoting track');
      return Q.ninvoke(client, 'zadd', playlistKey(roomId), 1, trackId)
      .then(function(){ return true });
    }

  });
};

var upvoteTrack = function(roomId, trackId, score){
  return Q.ninvoke(client, 'zincrby', playlistKey(roomId), trackId, score);
};

var getTrack = function(trackId){
  return Q.ninvoke(client, 'hgetall', trackKey(trackId));
};

var addNewTrack = function(trackData){
  // Check if existing
  return getTrack(trackData.id).then(function(res){

    if (res !== null) {
      console.log('track existing', res);
      return false;
    }
    else {
      console.log('creating track');
      return Q.ninvoke(client, 'hmset', trackKey(trackData.id), {
        artist: trackData.artist,
        title: trackData.title
      });
    }

  });
};


// Get user details
// - votes
Adapter.getUser = function(roomId, userId){
  return Q.ninvoke(client, 'get', userKey(roomId, userId)).then(function(res){
    return {votes: (res || 10)};
  });
};


// Add a new track if not yet existing
// wants id, artist, title
// returns boolean (added or not)
Adapter.addTrack = function(roomId, trackData){

  // Create details hash (if missing)
  return addNewTrack(trackData)

  // Set base score
  // Return true or false depending on score existence
  .then(function(){ return setBaseScore(roomId, trackData.id); })

};


// Get the playlist
// - id
// - score
// - artist
// - title
Adapter.getPlaylist = function(roomId){
  return Q.ninvoke(client, 'zrevrangebyscore', playlistKey(roomId), '+inf', '-inf', 'withscores')
  .then(function(res){
    console.log('raw playlist : ', res);
    // The result is in the form [id, score, id, score, ...]. Format it in the form [{id: id, score: score}, ...]
    var formattedRes = [];

    for (var i = 0 ; i < (res.length/2) ; i++) {
      formattedRes.push({
        id: res[2*i],
        score: parseInt(res[2*i + 1])
      });
    }

    return formattedRes;
  })
  .then(function(tracksWithScore){
    var fullTracks = _.map(tracksWithScore, function(trackWithScore){
      return getTrack(trackWithScore.id).then(function(trackDetails){
        return {
          id: trackWithScore.id,
          score: trackWithScore.score,
          artist: trackDetails.artist,
          title: trackDetails.title
        };
      });
    });
    return Q.all(fullTracks);
  });
};


// Redis subbers
Adapter.newTracksListener = function(roomId){
  var subber = redis.createClient();
  subber.subscribe('plst:pubsub:rooms:'+roomId+':newtrack');
  return subber;
};

// Redis pubbers
Adapter.notifyTrackAdded = function(roomId, trackData){
  console.log('publishing new track');
  client.publish('plst:pubsub:rooms:'+roomId+':newtrack', JSON.stringify(trackData));
};


module.exports = Adapter;