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
    var es_helper;
    var teraslice;
    var setup = require('../helpers/setup')(__dirname + '/../../docker-compose.yml');

    function cleanup() {
        return Promise.all([
            es_client.indices.delete({ index: 'teracluster__jobs', ignore: [404] }),
            es_client.indices.delete({ index: 'teracluster__state', ignore: [404] }),
            es_client.indices.delete({ index: 'teracluster__analytics', ignore: [404] }),
            es_client.indices.delete({ index: 'test-*', ignore: [404] })
        ])
    }

    beforeAll(function(done) {
        setup.dockerUp('example-logs-10')
            .then(function(connections) {
                es_client = connections.es_client;
                teraslice = connections.teraslice_client;
                es_helper = require('../helpers/es_helper')(es_client);

                console.log("--> Starting tests.");

                cleanup().then(done);
            })
    });

    /*beforeEach(function(done) {

    });*/

    afterAll(function(done) {
        cleanup().then(function() {
            setup.dockerDown()
                .catch(console.log)
                .finally(done);
        });
    })

    xit('should reindex data', function(done) {
        var job_spec = require('../../fixtures/jobs/reindex.json');
        job_spec.operations[1].index = 'test-reindex-10';

        teraslice.jobs.submit(job_spec)
            .then(function(job) {
                expect(job).toBeDefined();
                expect(job.id()).toBeDefined();

                // The job may run for a while so we have to wait for it to finish.
                return job.waitForStatus('completed');
            })
            .then(function() {
                return es_helper.documentCountForIndex('test-reindex-10')
                    .then(function(stats) {
                        expect(stats.count).toBe(10);
                        expect(stats.deleted).toBe(0);
                    });
            })
            .finally(done)
    });

    it('should reindex data 1000 times', function(done) {
        var job_spec = require('../../fixtures/jobs/reindex.json');
        job_spec.operations[1].index = 'test-reindex-1000times';

        var iterations = 10;
        var jobs = [];
console.log("Submitting jobs")
        for (var i = 0; i < iterations; i++) {
            jobs.push(teraslice.jobs.submit(job_spec));
        }

        Promise
            .map(jobs, function(job) {
console.log(job.id());
                expect(job).toBeDefined();
                expect(job.id()).toBeDefined();

                return job.waitForStatus('completed')
                    .then(function() { console.log("Got completed") });
            })
            .all()
            .then(function() {
                return es_helper.documentCountForIndex('test-reindex-1000times')
                    .then(function(stats) {
                        expect(stats.count).toBe(10 * iterations);
                        expect(stats.deleted).toBe(0);
                        done();
                    });
            })

        /*var testcase = new Promise(function(resolve, reject) {
            for (var i = 0; i < iterations; i++) {
                teraslice.jobs.submit(job_spec)
                    .then(function(job) {
                        expect(job).toBeDefined();
                        expect(job.id()).toBeDefined();

                        jobs.push(job.waitForStatus('completed'));

                        if (i === iterations) {
                            Promise.all(jobs)
                                .then(function() {
                                    return es_helper.documentCountForIndex('test-reindex-1000times')
                                        .then(function(stats) {
                                            expect(stats.count).toBe(10 * iterations);
                                            expect(stats.deleted).toBe(0);
                                            resolve(true);
                                        });
                                })
                        }
                    });
            }
        })

        testcase.finally(done);*/
    });
});