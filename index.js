var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 5000));

// parse application/json
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

var pg = require('pg');

app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM wifi', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send('err ' + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});

app.post('/wifi', function(request, response){
  var uuid = request.query.uuid;
  var body = request.body;
  if (!!uuid || !!body){
    response.send('error ' + uuid);
    return;
  }

  if(!!!uuid && !!!body){
    // save list to db with uuid as key
    // pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var rows = [];
    for(var info in body){
      if (!info.ssid || info.ssid.length > 64) continue;
      if (!!info.pkg && info.pkg.length > 64) continue;
      if (!!info.key_mgmt && info.key_mgmt.length > 64) continue;
      rows.push({
        uuid: uuid,
        ssid: info.ssid,
        pkg: info.pkg || '',
        mgmt: info.key_mgmt
      });
    }
    var buildStatement = function(rows) {
      var params = [];
      var chunks = [];
      for(var i = 0; i < rows.lenght; i++) {
        var row = rows[i];
        var valueClause = [];
        params.push(row.uuid);
        valueClause.push('$' + params.length);
        params.push(row.ssid);
        valueClause.push('$' + params.length);
        params.push(row.psk);
        valueClause.push('$' + params.length);
        params.push(row.mgmt);
        valueClause.push('$' + params.length);
        chunks.push('(' + valueClause.join(', ') + ')');
      }
      return {
        text: 'INSERT INTO wifi(uuid, ssid, pkg, mgmt) VALUES ' +
         chunks.join(', '),
        values: params
      };
    };

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      client.query(buildStatement(rows), function(err, result){
        done();
        if (err) {
          console.error(err);
          response.send('err ' + err);
        } else {
          response.send('ok ' + result);
        }
      });
    });
  }
  response.send('ok');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


