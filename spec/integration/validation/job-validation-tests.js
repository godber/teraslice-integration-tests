'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function() {
    var teraslice, es_client, es_helper;

    describe('job validation', function() {
        it('job should be rejected with empty index selector index name', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[1].index = ''; // index selector

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when no index is specified.")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('job should be rejected with empty reader index name', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.operations[0].index = ''; // reader

            teraslice.jobs.submit(job_spec)
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('job should be rejected with slicers = 0', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.slicers = 0;

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when slicers == 0")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('job should be rejected with slicers < 0', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.slicers = -1;

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when slicers == -1")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('job should be rejected with negative workers == 0', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.workers = 0;

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when workers == 0")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('job should be rejected with invalid lifecycle', function(done) {
            var job_spec = _.cloneDeep(require('../../fixtures/jobs/reindex.json'));
            job_spec.lifecycle = 'invalid';

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when lifecycle is invalid")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });

        it('empty job should be rejected', function(done) {
            var job_spec = {};

            teraslice.jobs.submit(job_spec)
                .then(function() {
                    fail("Submission should not succeed when job is empty")
                }) // This should throw a validation error.
                .catch(function(err) {
                    expect(err.error).toBe(500);
                    expect(err.message).toContain("Error validating")
                })
                .finally(done)
        });
    });

    return function(connections) {
        es_client = connections.es_client;
        teraslice = connections.teraslice_client;
        es_helper = require('../helpers/es_helper')(es_client);
    }
};
