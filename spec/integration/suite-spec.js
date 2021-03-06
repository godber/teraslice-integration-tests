'use strict';

// We need long timeouts for some of these jobs
jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

describe('teraslice - ', function() {

    var setup = require('./helpers/setup')(
        `${__dirname}/../docker-compose-es${process.env.npm_package_config_esVersion}.yml`
    );

    // Whether the environment should be shutdown after the test run.
    // While developing tests it can be advantageous to set this to false
    // and reuse the environment between runs with the caveat that the
    // jobs index will not be cleaned up.
    var shutdown = false;

    var suites = [];

    beforeAll(function(done) {
        setup.dockerUp('example-logs-10')
            .then(function(connections) {
                connections.setup = setup;
                suites.forEach(function(suite) {
                    suite(connections);
                });
                console.log("--> Starting tests.");

                done();
            })
    });

    if (shutdown) {
        afterAll(function(done) {
            setup.dockerDown()
                .catch(console.log)
                .finally(done);
        })
    }

    suites.push(require('./data/id_slicer')());
    suites.push(require('./data/elasticsearch_bulk-tests')());
    suites.push(require('./cluster/worker-allocation-tests')());
    suites.push(require('./cluster/state-tests')());
    suites.push(require('./data/reindex-tests')());
    suites.push(require('./validation/job-validation-tests')());
});
