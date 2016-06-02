'use strict';

var Promise = require('bluebird');

// TODO: This needs to be a dynamic option in some way. Maybe a ENV var.
var DOCKER_IP = 'docker';

var compose = require('docker-compose-js')(__dirname + '/../../docker-compose.yml');
var elasticsearch = require('elasticsearch');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe('reindex', function() {
    var es_client;
    var teraslice;

    beforeAll(function(done) {
        compose.up()
            .then(function() {
                function waitForTeraslice() {
                    // There is latency in the time from when elasticsearch
                    // becomes available and Teraslice reconnects to ES.
                    return teraslice.jobs
                        .list()
                        .then(done)
                        .catch(function(err) {
                            // keep retrying until it succeeds
                            setTimeout(waitForTeraslice, 1000);
                        });
                }

                function waitForES() {
                    // Elasticsearch takes some time to initialize so we have
                    // to wait for it to really become available.
                    return es_client
                        .search({
                            requestTimeout: 1000,
                            index: 'example-logs',
                            q: '*'
                        })
                        .then(waitForTeraslice)
                        .catch(function(err) {
                            // keep retrying until it succeeds
                            setTimeout(waitForES, 1000);
                        });
                }

                es_client = new elasticsearch.Client({
                    host: 'http://' + DOCKER_IP + ':9200',
                    log: '' // This suppresses error logging from the ES library.
                })

                teraslice = require('teraslice-client-js')({
                    host: 'http://' + DOCKER_IP + ':5678'
                });

                waitForES();
            })
            .catch(function(err) {
                console.log(err);
                done();
            });

    });

    beforeEach(function(done) {
        function prepare() {
            return [
                es_client.indices.delete({ index: 'teracluster__jobs', ignore: [404] }),
                es_client.indices.delete({ index: 'teracluster__state', ignore: [404] }),
                es_client.indices.delete({ index: 'teracluster__analytics', ignore: [404] })
            ]
        }

        Promise.all(prepare()).then(done);
    });

    afterAll(function(done) {
        compose.down()
            .catch(console.log)
            .finally(done);
    })

    it('should reindex data', function(done) {
        var job_spec = require('../../fixtures/jobs/data_generator.json');

        teraslice.jobs.submit(job_spec)
            .then(function(job) {
                expect(job).toBeDefined();
                expect(job.id()).toBeDefined();
                done();
            });

        /*expect(processor).toBeDefined();
        expect(processor.newProcessor).toBeDefined();
        expect(processor.schema).toBeDefined();
        expect(typeof processor.newProcessor).toEqual('function');
        expect(typeof processor.schema).toEqual('function');*/

    });
});