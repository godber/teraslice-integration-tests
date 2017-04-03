'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper;

    describe('reindex', function() {

        it('should reindex data', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
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
                .catch(fail)
                .finally(done)
        });

        it('job should complete after lifecycle changes', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            // Job needs to be able to run long enough to cycle
            job_spec.operations[0].index = 'example-logs-10000';
            job_spec.operations[1].index = 'test-reindex-lifecycle';

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    expect(job.id()).toBeDefined();

                    // The job may run for a while so we have to wait for it to finish.
                    return job.waitForStatus('running')
                        .then(function() {
                            return job.pause();
                        })
                        .then(function() {
                            return job.waitForStatus('paused');
                        })
                        .then(function() {
                            return job.resume();
                        })
                        .then(function() {
                            return job.waitForStatus('running');
                        })
                        .then(function() {
                            return job.stop();
                        })
                        .then(function() {
                            return job.waitForStatus('stopped');
                        })
                        .then(function() {
                            return job.recover();
                        })
                        .then(function() {
                            return job.waitForStatus('completed');
                        })
                        .then(function() {
                            return es_helper.documentCountForIndex('test-reindex-lifecycle')
                                .then(function(stats) {
                                    expect(stats.count).toBe(10000);
                                    expect(stats.deleted).toBe(0);
                                });
                        });
                })
                .catch(fail)
                .finally(done);
        });


        it('should reindex data 10 times', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[1].index = 'test-reindex-10times';

            var iterations = 10;
            var jobs = [];

            for (var i = 0; i < iterations; i++) {
                jobs.push(teraslice.jobs.submit(job_spec));
            }

            Promise
                .map(jobs, function(job) {
                    expect(job).toBeDefined();
                    expect(job.id()).toBeDefined();

                    return job.waitForStatus('completed');
                })
                .all()
                .then(function() {
                    return es_helper.documentCountForIndex('test-reindex-10times')
                        .then(function(stats) {
                            expect(stats.count).toBe(10 * iterations);
                            expect(stats.deleted).toBe(0);
                            done();
                        });
                });
        });
    });

    return function(connections) {
        es_client = connections.es_client;
        teraslice = connections.teraslice_client;
        es_helper = require('../helpers/es_helper')(es_client);
    }
};
