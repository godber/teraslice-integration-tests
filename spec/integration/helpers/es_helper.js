'use strict';

var Promise = require('bluebird');

module.exports = function(es_client) {

    function documentCountForIndex(indexName, timeout) {
        if (! timeout) timeout = 1000;

        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                es_client.indices.stats({ index: indexName })
                    .then(function(stats) {
console.log(stats._all.total.docs)

                        resolve(stats._all.total.docs);
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            }, timeout)
        });
    }

    return {
        documentCountForIndex: documentCountForIndex
    }
}