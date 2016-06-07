'use strict';

var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper;

    describe('worker allocation', function() {

        it('Job should allocate with one worker.', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[1].index = 'test-allocation-1-worker'; // index selector
            job_spec.workers = 1;

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    return job.waitForStatus('running')
                        .then(function() {
                            return job.workers()
                        })
                        .then(function(workers) {
                            expect(workers.length).toBe(1);
                        })
                        .then(function() {
                            return job.waitForStatus('completed');
                        })
                        // This could be unreliable but there's latency from when a job
                        // is completed to when workers are shutdown
                        .delay(1000)
                        .then(function() {
                            return job.workers()
                        })
                        .then(function(workers) {
                            expect(workers.length).toBe(0);
                        })
                        .then(function() {
                            return es_helper.documentCountForIndex('test-allocation-1-worker')
                                .then(function(stats) {
                                    expect(stats.count).toBe(10);
                                    expect(stats.deleted).toBe(0);
                                });
                        });
                })
                .catch(fail)
                .finally(done)
        });
    });

    return function(connections) {
        es_client = connections.es_client;
        teraslice = connections.teraslice_client;
        es_helper = require('../helpers/es_helper')(es_client);
    }
}
