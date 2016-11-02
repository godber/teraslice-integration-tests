'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper;

    describe('elasticsearch_bulk', function() {

        it('multisend should generate correct number of docs', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/multisend.json'));
            job_spec.operations[1].index = 'multisend-10000';

            teraslice.jobs.submit(job_spec)
                .then(function(job) {
                    expect(job).toBeDefined();
                    expect(job.id()).toBeDefined();

                    // The job may run for a while so we have to wait for it to finish.
                    return job.waitForStatus('completed');
                })
                .then(function() {
                    return es_helper.documentCountForIndex('multisend-10000')
                        .then(function(stats) {
                            expect(stats.count).toBe(10000);
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
    }
};
