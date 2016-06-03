'use strict';

var Promise = require('bluebird');

// TODO: This needs to be a dynamic option in some way. Maybe a ENV var.
var DOCKER_IP = 'docker';

var compose = require('docker-compose-js')(__dirname + '/../../docker-compose.yml');
var elasticsearch = require('elasticsearch');

// We need long timeouts for some of these jobs
jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

describe('reindex', function() {
    var es_client;
    var teraslice;
    var setup = require('../helpers/setup')(__dirname + '/../../docker-compose.yml');

    beforeAll(function(done) {
        setup.dockerUp('example-logs-10')
            .then(function(connections) {
                es_client = connections.es_client;
                teraslice = connections.teraslice_client;
                console.log("--> Starting tests.");
                done();
            })
    });

    beforeEach(function(done) {
        function prepare() {
            return [
                es_client.indices.delete({ index: 'teracluster__jobs', ignore: [404] }),
                es_client.indices.delete({ index: 'teracluster__state', ignore: [404] }),
                es_client.indices.delete({ index: 'teracluster__analytics', ignore: [404] }),
                es_client.indices.delete({ index: 'example-logs-new', ignore: [404] })
            ]
        }

        Promise.all(prepare()).then(done);
    });

    afterAll(function(done) {
        setup.dockerDown()
            .catch(console.log)
            .finally(done);
    })

    it('should reindex data', function(done) {
        var job_spec = require('../../fixtures/jobs/reindex.json');

        teraslice.jobs.submit(job_spec)
            .then(function(job) {
                expect(job).toBeDefined();
                expect(job.id()).toBeDefined();

                // TODO: need a waitForStatus on the job so we can see when it completes.
                return job.waitForStatus('completed');
            })
            .finally(done)


        /*expect(processor).toBeDefined();
        expect(processor.newProcessor).toBeDefined();
        expect(processor.schema).toBeDefined();
        expect(typeof processor.newProcessor).toEqual('function');
        expect(typeof processor.schema).toEqual('function');*/

    });
});