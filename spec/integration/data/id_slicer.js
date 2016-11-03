'use strict';

var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper;

    describe('reindex', function() {

        it('should reindex data by ids', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/id.json'));
            job_spec.operations[1].index = "test-id_reindex-10000";

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    console.log('whats the job');
                    expect(job).toBeDefined();
                    expect(job.id()).toBeDefined();

                    // The job may run for a while so we have to wait for it to finish.
                    return job.waitForStatus('completed');
                })
                .then(function() {
                    return es_helper.documentCountForIndex('test-id_reindex-10000')
                        .then(function(stats) {
                            expect(stats.count).toBe(10000);
                            expect(stats.deleted).toBe(0);
                        });
                })
                .catch(fail)
                .finally(done)
        });

    });

    it('job should complete after lifecycle changes', function(done) {
        var job_spec = _.cloneDeep(require('../../fixtures/jobs/id.json'));
        // Job needs to be able to run long enough to cycle
        job_spec.operations[1].index = "test-id_reindex-lifecycle-10000";

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
                        return es_helper.documentCountForIndex("test-id_reindex-lifecycle-10000")
                            .then(function(stats) {
                                expect(stats.count).toBe(10000);
                                expect(stats.deleted).toBe(0);
                            });
                    });
            })
            .catch(fail)
            .finally(done);
    });


    return function(connections) {
        es_client = connections.es_client;
        teraslice = connections.teraslice_client;
        es_helper = require('../helpers/es_helper')(es_client);
    }
};
