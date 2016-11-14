'use strict';

var setup = require('../spec/integration/helpers/setup')(
    `${__dirname}/../spec/docker-compose-es${process.env.npm_package_config_esVersion}.yml`
);
var Promise = require('bluebird');

var generator = {
    "name": "",
    "lifecycle": "once",
    "workers": 1,
    "operations": [
        {
            "_op": "elasticsearch_data_generator",
            "size": 0
        },
        {
            "_op": "elasticsearch_index_selector",
            "index": "",
            "type": "events"
        },
        {
            "_op": "elasticsearch_bulk",
            "size": 5000
        }
    ]
};

setup.dockerUp('teracluster__jobs')
    .then(function(connections) {

        function generate(count) {
            generator.name = 'Data Generator ' + count;
            generator.operations[0].size = count;
            generator.operations[1].index = 'example-logs-' + count;
            return teraslice.jobs.submit(generator)
        }

        function idGenerate(count, letter) {
            generator.name = 'Data Generator ' + count;
            generator.operations[0].size = count;
            generator.operations[0].set_id = 'hexadecimal';
            generator.operations[0].id_start_key = letter;
            generator.operations[1].index = 'example-hexadecimal-logs';
            generator.operations[1].id_field = 'id';

            return teraslice.jobs.submit(generator)
        }

        var teraslice = connections.teraslice_client;

        console.log('--> Submitting jobs to generate test data');

        return Promise.all([
            generate(10),
            generate(1000),
            generate(10000),
            idGenerate(5000, 'd'),
            idGenerate(5000, '3')
        ])
    })
    .map(function(job) {
        return job.waitForStatus('completed')
    })
    .then(function(arr) {
        console.log('setup has made all the testing indices', arr)
    })
    .catch(function(err) {
        console.log('we had an error in setup', err)
    })
    .finally(function() {
        setup.dockerDown()
            .catch(console.log)
    });
