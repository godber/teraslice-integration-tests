#!/usr/bin/env bash

versions=( 1.7 2.3 2.4 5.0 )

function cleanup() {
    docker kill $(docker ps -qa --filter 'name=spec_\.*')
    echo "Resetting esVersion to default"
    npm config delete teraslice-integration-tests:esVersion
}

trap cleanup SIGINT

echo "Test run began at: $(date)"

for version in "${versions[@]}"
do
    echo ""
    echo "##############################################"
    echo "  Running tests for Elasticsearch ${version}  "
    echo "##############################################"
    echo ""

    dir="logs/${version}"
    mkdir -p ${dir}

    npm config set teraslice-integration-tests:esVersion ${version}
    echo "  Running setup for version ${version}."
    npm run setup | tee ${dir}/setup.log 2>&1
    sleep 5

    echo "  Running tests for version ${version}."
    npm test | tee ${dir}/test.log 2>&1
    sleep 5

    docker-compose -f spec/docker-compose-es${version}.yml stop > ${dir}/docker-stop.log 2>&1
    sleep 2
    docker-compose -f spec/docker-compose-es${version}.yml logs > ${dir}/docker-compose.log 2>&1
    sleep 2

    echo "  Cleaning up for version ${version} at $(date)"
    docker rm $(docker ps -qa --filter 'name=spec_.*') > ${dir}/cleanup.log 2>&1
    docker volume rm spec_testdata >> ${dir}/cleanup.log 2>&1
done

echo "Test run completed at: $(date)"
echo ""

find logs
