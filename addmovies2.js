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

function render(template, options, callback) {
    if (callback === undefined) {
        callback = options;
        options = {};
    }
    return function(err, prevhtml) {
        app.render(template, options, function(err, html) { callback(err, html + prevhtml) })
    }
}

function send(res) {
    return function(err, html) {
        res.send(html);
    }
}

function renderMovies(db, callback) {
    return function(err, html) {
        db.collection('movies').find({}).toArray(function(err, docs) {
            if(err) throw err;

            if (docs.length < 1) {
                movies = [{"title":"No movies found."}];
            }

            render('addmovies_list', { "movies" : docs }, callback)(err, html);
        });
    }
}

MongoClient.connect("mongodb://localhost:27017/test", function(err, db) {
    if(err) throw err;

    console.log("Successfully connected to MongoDB.");

    app.get('/', function(req, res) {

        var page = render('addmovies_head', send(res));
        page = renderMovies(db, page); 
        page = render('addmovies_foot', page);

        var htmlstr = page(null, "");
    });

    app.post('/', function(req, res) {
        var title = req.body.title,
        year = req.body.year,
        imdb = req.body.imdb,
        htmlstr = "";

        var headpage = render('addmovies_head', send(res));
        if (title && year && imdb) {
            page = function(herr, html) {
                db.collection('movies').find({'imdb':imdb}).toArray(function (err, docs) {
                    if (err) throw err;
                    if (docs.length == 0) {
                        db.collection('movies').insertOne({"title": title, "year": year, "imdb": imdb}, function(err, result) {
                            if (err) {
                                var insertpage = render('addmovies_msg',{"kind":"error", "msg": Error("Error inserting: " + util.inspect(err))}, headpage)
                            } else {
                                var insertpage = render('addmovies_msg',{"kind":"success", "msg": "Inserted " + result.insertedCount + " movie" + ((result.insertedCount != 1)?"s":"")}, headpage)
                            }
                            renderMovies(db, insertpage)(herr, html);
                        })
                    } else {
                        var insertpage = render('addmovies_msg',{"kind":"warning", "msg": "IMDB number " + imdb + " is already in the database"}, headpage);
                        renderMovies(db, insertpage)(herr, html);
                    }
                })
            }
        } else {
            page = render('addmovies_msg',{"kind":"error","msg":Error("Must provide all of 'Title', 'Year', and 'IMDB'. " + util.inspect(req.body))}, headpage);
            page = renderMovies(db, page);
        }
        page = render('addmovies_foot', page);
        page(null, "");
    });

    app.use(function(req, res){
        res.sendStatus(404);
    })

    var server = app.listen(3000, function() {
        var port = server.address().port;
        console.log("Express server listening on port %s.", port);
    })
})
