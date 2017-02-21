var express = require('express');
var router = express.Router();
var request = require('request');


var fs = require('fs');
var pdf = require('html-pdf');
var options = {
    "height": "6in",
    "width": "4in"
};

var dataCache = {};

function printResults() {

}

function processAPI(cb, args) {

    var items = [
        'co8421531',
        'co8359400',
        'co8232360',
        'co8427213',
        'co8401352',
        'co8058672',
        'co62321',
        'co34242'
    ];

    if (Object.keys(dataCache).length === 0) {
        request({
            url: 'https://collection.sciencemuseum.org.uk/search?filter%5Bhas_image%5D=true&filter%5Bmuseum%5D=Science%20Museum&filter%5Bgallery%5D=Information%20Age%20Gallery%3A%20Web&page%5Bsize%5D=50&page%5Btype%5D=search',
            headers: {
                accept: 'application/vnd.api+json'
            },
            gzip: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                var data = JSON.parse(body);
                var filteredData = data.data.map(function (item) {
                    if (items.indexOf(item.id) !== -1) {
                        // item primary description
                        item.attributes.description.map(function (i) {
                            if (i.primary === true) {
                                item.attributes.description_primary = i.value;
                            }

                            return i;
                        });

                        function widthCheck(val) {
                            var width = 0;
                            var height = 0;
                            val.measurements.dimensions.forEach(function (dimen) {
                                if (dimen.dimension.toLowerCase() == 'width') {
                                    width = dimen.value;
                                } else {
                                    height = dimen.value;
                                }
                            });

                            return width > height;
                        }

                        function buildImg(img) {
                            var newImg = {};

                            var width = 0;
                            var height = 0;
                            img.measurements.dimensions.forEach(function (dimen) {
                                if (dimen.dimension.toLowerCase() == 'width') {
                                    width = dimen.value;
                                } else {
                                    height = dimen.value;
                                }
                            });

                            if (img.location.indexOf('http') !== -1) {
                                newImg.url = img.location;
                            } else {
                                newImg.url = 'http://smgco-images.s3.amazonaws.com/media/' + img.location;
                            }

                            newImg.width = width;
                            newImg.height = height;

                            return newImg;
                        }

                        // best image filtering
                        var images = item.attributes.multimedia;
                        var randImg,
                            imageSize = 'large',
                            landscape = false;

                        randImg = images[Math.floor(Math.random() * images.length)];

                        landscape = widthCheck(randImg.processed.large);

                        // only re check once
                        if (landscape === false) {
                            randImg = images[Math.floor(Math.random() * images.length)];
                        }

                        var newRes = {
                            name: item.attributes.summary_title,
                            description: item.attributes.description_primary,
                            image: buildImg(randImg.processed.large)
                        };

                        // console.log(newRes);

                        return newRes;
                    } else {
                        return null;
                    }
                });

                dataCache = filteredData.filter(function (i) {
                    return i;
                });

                if (cb) {
                    cb.apply(null, args);
                }
            }
        });
    } else {
        if (cb) {
            cb.apply(null, args);
        }
    }
}

router.use(function (res, req, next) {
    processAPI(function (req, res, next) {
        next();
    }, [req, res, next]);
});

/* GET home page. */
router.get('/', function (req, res, next) {

    // make data
    dataCache.sort(function () {
        return 0.5 - Math.random()
    });

    var top3 = dataCache.slice(0, 3);
    var inc = 0;

    top3.forEach(function (val) {
        val.timestamp = inc;
        val.dwell = Math.floor(Math.random(0, 10) * 10);

        inc++;
    });

    var printout = {
        top: top3,
        featured: dataCache.slice(3, 4)
    };

    // print queue dash
    // res.render('printout', printout)
    res.json(printout);
});

router.get('/print', function (req, res, next) {
    // print selected resource
    res.render('printout', {title: 'Tobi'}, function (err, html) {
        pdf.create(html, options).toFile('./lol.pdf', function (err, res) {
            if (err) return console.log(err);
            console.log(res); // { filename: '/app/businesscard.pdf' }
        });
        res.send(html);
    });
});

//todo: make post
router.get('/dock', function (req, res, next) {
    // fetch and compare data
    res.json(dataCache);


    // run related content
    // compile and format data for view

    // send compiled view to print queue
});

module.exports = router;
