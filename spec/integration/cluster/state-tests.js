'use strict';

var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper, setup;

    var watch = require('../helpers/watchers')();

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

    function waitForNodes(node_count) {
        return watch.waitForLength(function() {
            return teraslice.cluster
                .state()
                .then(function(state) {
                    return _.keys(state)
                });
        }, node_count);
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
                    return waitForNodes(3);
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
                    return waitForNodes(2);
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
                    return waitForNodes(22);
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
                    return waitForNodes(2);
                })
                .then(teraslice.cluster.state)
                .then(function(state) {
                    verifyClusterState(state, 2);
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
    }
}
