'use strict';

var Promise = require('bluebird');

// TODO: This needs to be a dynamic option in some way. Maybe a ENV var.
var DOCKER_IP = 'docker';

var elasticsearch = require('elasticsearch');

module.exports = function(compose_file) {
    var compose = require('docker-compose-js')(compose_file);

    var es_client;
    var teraslice;

    function dockerUp(index_to_watch) {
        if (! index_to_watch) index_to_watch = 'teracluster__jobs';

        console.log("--> Bringing Docker environment up.");
        return new Promise(function(resolve, reject) {
            function waitForTeraslice() {
                // There is latency in the time from when elasticsearch
                // becomes available and Teraslice reconnects to ES.
                return teraslice.jobs
                    .list()
                    .then(function() {
                        resolve({
                            es_client: es_client,
                            teraslice_client: teraslice
                        });
                    })
                    .catch(function(err) {
                        // keep retrying until it succeeds
                        setTimeout(waitForTeraslice, 1000);
                    });
            }

            function waitForES() {
                // Elasticsearch takes some time to initialize so we have
                // to wait for it to really become available.
                return es_client
                    .search({
                        requestTimeout: 1000,
                        index: index_to_watch,
                        q: '*'
                    })
                    .then(function() {
                        console.log("--> Waiting for Teraslice to be ready.");
                        waitForTeraslice();
                    })
                    .catch(function(err) {
                        // keep retrying until it succeeds
                        setTimeout(waitForES, 1000);
                    });
            }

            compose.up()
                .then(function() {
                    es_client = new elasticsearch.Client({
                        host: 'http://' + DOCKER_IP + ':9200',
                        log: '' // This suppresses error logging from the ES library.
                    })

                    teraslice = require('teraslice-client-js')({
                        host: 'http://' + DOCKER_IP + ':5678'
                    });

                    console.log("--> Waiting for Elasticsearch to be ready.");
                    waitForES();
                })
                .catch(function(err) {
                    reject(err);
                });
        })
    }

    function dockerDown() {
        console.log("--> Stopping Docker environment.");

        return compose.down();
    }

    return {
        dockerUp: dockerUp,
        dockerDown: dockerDown
    }
}
