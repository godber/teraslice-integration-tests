var Promise = require('bluebird');

// TODO: This needs to be a dynamic option in some way. Maybe a ENV var.
var DOCKER_HOST = 'docker';

var compose = require('docker-compose-js')(__dirname + '/../../docker-compose.yml');
var elasticsearch = require('elasticsearch');
var es_client;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe('reindex', function() {

    beforeEach(function(done) {
        compose.up()
            .then(function() {
                function prepare() {
                    return [
                        es_client.indices.delete({ index: 'teracluster__jobs', ignore: [404] }),
                        es_client.indices.delete({ index: 'teracluster__state', ignore: [404] }),
                        es_client.indices.delete({ index: 'teracluster__analytics', ignore: [404] })
                    ]
                }

                function ping() {
                    // TODO: this should probably search on the particular index being tested.
                    return es_client
                        .search({
                            requestTimeout: 1000,
                            index: 'marvel-*',
                            q: '*'
                        })
                        .then(function() {
                            return Promise.all(prepare()).then(done);
                        })
                        .catch(function(err) {
                            // keep retrying until it succeeds
                            setTimeout(ping, 1000);
                        });
                }

                es_client = new elasticsearch.Client({
                    host: 'http://' + DOCKER_HOST + ':9200',
                    log: '' // This suppresses error logging from the ES library.
                })

                ping();
            })
            .catch(function(err) {
                console.log(err);
                done();
            });
    });

    afterEach(function(done) {
        compose.down()
            .catch(console.log)
            .finally(done);
    })

    it('should reindex data', function() {

        compose.ps().then(console.log);

        /*expect(processor).toBeDefined();
        expect(processor.newProcessor).toBeDefined();
        expect(processor.schema).toBeDefined();
        expect(typeof processor.newProcessor).toEqual('function');
        expect(typeof processor.schema).toEqual('function');*/

    });
});