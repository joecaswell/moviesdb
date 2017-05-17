var express = require('express'),
    app = express(),
    engines = require('consolidate'),
    bodyParser = require('body-parser'),
    util = require('util'),
    MongoClient = require('mongodb').MongoClient;

app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.set('views', __dirname + "/views");
app.use(bodyParser.urlencoded({ extended: true }));

function renderMovies(db, res, msg, failed) {
    kind = (failed ? "error": "success");
    db.collection('movies').find({}).toArray(function(err, docs) {
        if(err) throw err;

        if (docs.length < 1) {
            console.dir("No documents found.");
            movies = [{"title":"No movies found."}];
        }

        return res.render('addmovies', { "msg": msg, "kind": kind, "movies" : docs });
    });
}

MongoClient.connect("mongodb://localhost:27017/test", function(err, db) {
    if(err) throw err;

    console.log("Successfully connected to MongoDB.");

    app.get('/', function(req, res) {

        return renderMovies(db, res);

    });

    app.post('/', function(req, res) {
        var title = req.body.title,
            year = req.body.year,
            imdb = req.body.imdb;
        if (title && year && imdb) {
            db.collection('movies').find({'imdb':imdb}).toArray(function(err, docs) {
                if (err) {
                    return renderMovies(db, res, Error("Error querying database: " + unil.inspec(err)), true)
                }
                if (docs.length == 0) {
                    db.collection('movies').insertOne({"title": title, "year": year, "imdb": imdb}, function(err, result) {
                        if (err) {
                            return renderMovies(db, res, Error("Error inserting: " + util.inspect(err)), true)
                        }
                        return renderMovies(db, res, "Inserted " + result.insertedCount + " movie" + ((result.insertedCount != 1)?"s":""))
                    })
                } else {
                    return renderMovies(db, res, "IMBD ID " + imdb + " is already in the database", true)
                }
            })
        } else {
            return renderMovies(db, res, "Must provide all of 'Title', 'Year', and 'IMDB'. " + util.inspect(req.body), true)
        }
    });

    app.use(function(req, res){
        res.sendStatus(404);
    });

    var server = app.listen(3000, function() {
        var port = server.address().port;
        console.log("Express server listening on port %s.", port);
    });
});
