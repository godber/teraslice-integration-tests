'use strict';

var Promise = require('bluebird');

module.exports = function(es_client) {

    function documentCountForIndex(indexName, timeout) {
        if (!timeout) timeout = 1000;

        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                es_client.indices.stats({index: indexName})
                    .then(function(stats) {
                        resolve(stats._all.total.docs);
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            }, timeout)
        });
    }

    function cleanup(cleanup_jobs) {
        var deletions = [
            es_client.indices.delete({index: 'teracluster__state', ignore: [404]}),
            es_client.indices.delete({index: 'teracluster__analytics', ignore: [404]}),
            es_client.indices.delete({index: 'test-*', ignore: [404]})
        ];

        if (cleanup_jobs) {
            deletions.push(es_client.indices.delete({index: 'teracluster__jobs', ignore: [404]}));
        }

        return Promise.all(deletions)
    }

    return {
        documentCountForIndex: documentCountForIndex,
        cleanup: cleanup
    }
};