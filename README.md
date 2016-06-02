# teraslice-integration-tests
Teraslice integration test suite

## Dependencies

* Docker
* Docker Compose
* Docker image for Teraslice - built from source and tagged 'teraslice'.
* Docker image for Elasticsearch - this will be automatically pulled if needed.

## One time environment setup

For the tests to run there needs to be data in the elasticsearch instance. There is a simple script to add the data into a docker volume. This only needs to be done once as the volume will be reused as tests are run.

```
npm install
./setup
```

## Running the test suite

```
npm test
```
