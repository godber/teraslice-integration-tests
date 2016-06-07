# teraslice-integration-tests
Teraslice integration test suite

## Dependencies

* Docker
* Docker Compose
* Docker image for Teraslice - built from source and tagged 'teraslice'.
* Docker image for Elasticsearch - this will be automatically pulled if needed.

## One time environment setup

### Building the teraslice docker image

You'll need a cloned version of the teraslice repository.

```
cd YOUR_TERASLICE_REPO
docker build -t=teraslice .
```

### Prep the elasticsearch test data.

For the tests to run there needs to be data in the elasticsearch instance. A script is used to setup several source indices that are used by the tests. The data will be stored to a docker volume attached to the test environment. This only needs to be done once as the volume will be reused as tests are run.

```
npm install
npm run setup
```

## Running the test suite

```
npm test
```
