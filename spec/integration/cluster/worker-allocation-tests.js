'use strict';

var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper, setup, watch;

    function workersTest(workers, workers_expected, records, done) {
        var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
        job_spec.operations[0].index = 'example-logs-' + records;
        job_spec.operations[0].size = Math.round(records / workers);
        job_spec.operations[1].index = 'test-allocation-' + workers + '-worker';
        job_spec.workers = workers;
        teraslice.jobs.submit(job_spec)
            .then(function(job) {
                return job.waitForStatus('running')
                    .then(function() {
                        return job.workers()
                    })
                    .then(function(running_workers) {
                        expect(running_workers.length).toBe(workers_expected);
                    })
                    .then(function() {
                        return job.waitForStatus('completed');
                    })
                    .then(function() {
                        return watch.waitForLength(job.workers, 0);
                    })
                    .then(function(worker_count) {
                        expect(worker_count).toBe(0);
                    })
                    .then(function() {
                        return es_helper.documentCountForIndex('test-allocation-' + workers + '-worker')
                            .then(function(stats) {
                                expect(stats.count).toBe(records);
                                expect(stats.deleted).toBe(0);
                            });
                    });
            })
            .catch(fail)
            .finally(function() {
                done()
            })
    }

    describe('worker allocation', function() {

        it('Job should allocate with one worker.', function(done) {
            workersTest(1, 1, 1000, done);
        });

        it('Job should allocate with 5 workers.', function(done) {
            workersTest(5, 5, 10000, done)
        });

        it('Job should run with 14 out of requested 20 workers.', function(done) {
            workersTest(20, 14, 10000, done)
        });

        it('Job should scale from 14 to 20 workers.', function(done) {
            // Test cluster has 16 workers total.
            // 1 is consumed by the cluster_master. 1 by the slicer.
            // So the job should consume 14 to start.
            // the when we add another worker. 8 more should become available.
            // And all 20 should schedule.
            var workers = 20;
            var records = 10000;

            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[0].index = 'example-logs-' + records;
            job_spec.operations[0].size = Math.round(records / workers);
            job_spec.operations[1].index = 'test-allocation-worker-scale-14-20';
            job_spec.workers = workers;

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    return job.waitForStatus('running')
                        .then(function() {
                            return job.workers()
                        })
                        .then(function(running_workers) {
                            // The job should only get 14 workers to start.
                            expect(running_workers.length).toBe(14);

                            // We want 2 workers in the environment
                            return setup.scale(2);
                        })
                        .then(function() {
                            return watch.waitForLength(job.workers, 20, 100);
                        })
                        .then(function(worker_count) {
                            expect(worker_count).toBe(20);

                            return job.waitForStatus('completed');
                        })
                        .then(function() {
                            return watch.waitForLength(job.workers, 0, 100);
                        })
                        .then(function(worker_count) {
                            expect(worker_count).toBe(0);
                        })
                        .then(function() {
                            return es_helper.documentCountForIndex(job_spec.operations[1].index)
                                .then(function(stats) {
                                    expect(stats.count).toBe(records);
                                    expect(stats.deleted).toBe(0);
                                });
                        });
                })
                .catch(fail)
                .finally(function() {
                    // Drop back down to a single worker node
                    setup.scale(1)
                        .finally(done);
                });
        });

    });

    return function(connections) {
        es_client = connections.es_client;
        teraslice = connections.teraslice_client;
        es_helper = require('../helpers/es_helper')(es_client);
        setup = connections.setup;

        watch = require('../helpers/watchers')(connections);
    }
};
