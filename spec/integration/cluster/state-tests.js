'use strict';

var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper, setup, watch;

    function verifyClusterState(state, node_count) {
        // 2 nodes by default
        var nodes = _.keys(state);
        expect(nodes.length).toBe(node_count);
        nodes.forEach(function(node) {
            expect(state[node].total).toBe(8);
            expect(state[node].node_id).toBeDefined();
            expect(state[node].hostname).toBeDefined();

            // Nodes should have either 7 or 8 workers.
            expect(state[node].available).toBeLessThan(9);
            expect(state[node].available).toBeGreaterThan(6);

            // Should be one worker active if only 7 available
            if (state[node].available === 7) {
                expect(state[node].active.length).toBe(1);

                expect(state[node].active[0].worker_id).toBe(1);
                expect(state[node].active[0].assignment).toBe('cluster_master');
            }
            else {
                expect(state[node].active.length).toBe(0);
            }
        });
    }

    describe('cluster state', function() {
        it('Cluster state should match default configuration.', function(done) {
            teraslice.cluster
                .state()
                .then(function(state) {
                    verifyClusterState(state, 2);
                })
                .catch(fail)
                .finally(done)
        });

        it('Cluster state should update after adding and removing a worker node.', function(done) {
            // Add a second worker node
            setup.scale(2)
                .then(function() {
                    // Wait for it to show up in cluster state.
                    return watch.waitForNodes(3);
                })
                .then(teraslice.cluster.state)
                .then(function(state) {
                    verifyClusterState(state, 3);
                })
                .then(function() {
                    // Scale back to a single worker.
                    return setup.scale(1);
                })
                .then(function() {
                    // Should just be 2 nodes now.
                    return watch.waitForNodes(2);
                })
                .then(teraslice.cluster.state)
                .then(function(state) {
                    verifyClusterState(state, 2);
                })
                .catch(fail)
                .finally(done)
        });

        it('Cluster state should update after adding and removing 20 worker nodes.', function(done) {
            // Add additional worker nodes. There's one already and we want 20 more.
            setup.scale(21)
                .then(function() {
                    // Wait for all the nodes to show up in cluster state.
                    return watch.waitForNodes(22);
                })
                .then(teraslice.cluster.state)
                .then(function(state) {
                    verifyClusterState(state, 22);
                })
                .then(function() {
                    // Scale back to a single worker.
                    return setup.scale(1);
                })
                .then(function() {
                    // Should just be 2 nodes now.
                    return watch.waitForNodes(2);
                })
                .then(teraslice.cluster.state)
                .then(function(state) {
                    verifyClusterState(state, 2);
                })
                .catch(fail)
                .finally(done)
        });

        it('Cluster state should be correct for running job with 1 worker.', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[0].index = 'example-logs-1000';
            job_spec.operations[1].index = 'test-clusterstate-job-1-1000';

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    // The job may run for a while so we have to wait for it to finish.
                    return job
                        .waitForStatus('running')
                        .then(teraslice.cluster.state)
                        .then(function(state) {
                            var nodes = _.keys(state);
                            nodes.forEach(function(node) {
                                expect(state[node].total).toBe(8);

                                // There are 2 nodes in the cluster so the slicer
                                // should go on one and the worker on the other.
                                // Nodes should have either 6 or 7 available workers.
                                expect(state[node].available).toBeLessThan(8);
                                expect(state[node].available).toBeGreaterThan(5);

                                // The default scheduler should allocate the slicer on one
                                // node and the worker on either node.
                                if (state[node].active[0].assignment === 'cluster_master') {
                                    expect(state[node].active[0].worker_id).toBe(1);
                                    expect(state[node].active[0].assignment).toBe('cluster_master');
                                }
                                else {
                                    expect(state[node].active[0].assignment).toBe('slicer');
                                }

                                if (state[node].active.length > 1) {
                                    expect(state[node].active[1].assignment).toBe('worker');
                                }

                                if (state[node].available === 7) {
                                    expect(state[node].active.length).toBe(1);
                                }
                                else {
                                    expect(state[node].active.length).toBe(2);
                                }
                            });
                        })
                        .then(function() {
                            return job.waitForStatus('completed');
                        })
                })
                .then(function() {
                    return es_helper.documentCountForIndex('test-clusterstate-job-1-1000')
                        .then(function(stats) {
                            expect(stats.count).toBe(1000);
                            expect(stats.deleted).toBe(0);
                        });
                })
                .catch(fail)
                .finally(done)
        });

        it('Cluster state should be correct for running job with 3 workers.', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.workers = 3;
            job_spec.operations[0].index = 'example-logs-1000';
            job_spec.operations[1].index = 'test-clusterstate-job-3-1000';

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    // The job may run for a while so we have to wait for it to finish.
                    return job
                        .waitForStatus('running')
                        .then(teraslice.cluster.state)
                        .then(function(state) {
                            var nodes = _.keys(state);
                            nodes.forEach(function(node) {
                                expect(state[node].total).toBe(8);

                                // There are 2 nodes in the cluster so the slicer
                                // should go on one and the workers should spread
                                // across the nodes leaving one with 6 workers avail
                                // and one with 5 avail.
                                expect(state[node].available).toBeLessThan(7);
                                expect(state[node].available).toBeGreaterThan(4);

                                // The default scheduler should allocate the slicer on one
                                // node and the workers across the nodes.
                                if (state[node].active[0].assignment === 'cluster_master') {
                                    expect(state[node].active[0].worker_id).toBe(1);
                                    expect(state[node].active[0].assignment).toBe('cluster_master');
                                }
                                else {
                                    expect(state[node].active[0].assignment).toBe('slicer');
                                }

                                // Both nodes should have at least one worker.
                                expect(state[node].active[1].assignment).toBe('worker');

                                // One of the nodes should have two
                                if (state[node].active.length === 3) {
                                    expect(state[node].active[2].assignment).toBe('worker');
                                }

                                if (state[node].available === 6) {
                                    expect(state[node].active.length).toBe(2);
                                }
                                else {
                                    expect(state[node].active.length).toBe(3);
                                }
                            });
                        })
                        .then(function() {
                            return job.waitForStatus('completed');
                        })
                })
                .then(function() {
                    return es_helper.documentCountForIndex('test-clusterstate-job-3-1000')
                        .then(function(stats) {
                            expect(stats.count).toBe(1000);
                            expect(stats.deleted).toBe(0);
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
        setup = connections.setup;

        watch = require('../helpers/watchers')(connections);
    }
};
