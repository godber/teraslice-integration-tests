# teraslice-integration-tests

Teraslice integration test suite

## Dependencies

* Docker
* Docker Compose
* Docker image for Teraslice - built from source and tagged 'teraslice'.
* Docker image for Elasticsearch - this will be automatically pulled if needed.

## One time environment setup

### Building the teraslice docker image

You'll need a cloned version of the Teraslice repository.

```
cd YOUR_TERASLICE_REPO
docker build -t=teraslice .
```

### Prepare the Elasticsearch test data.

For the tests to run there needs to be data in the Elasticsearch instance. A script is used to setup several source indices that are used by the tests. The data will be stored to a docker volume attached to the test environment. This only needs to be done once as the volume will be reused as tests are run.

```
npm install
npm run setup

// If using boot2docker or a docker-machine provisioned environment
ip=docker npm run setup
```

# Running the test suite

```
npm test

// If using boot2docker or a docker-machine provisioned environment
ip=docker npm test
```

## Read logs of docker
from the root of the folder, `cd` into /spec and type the command below
```
docker-compose logs
```

# Cleaning Up When Things Go Wrong

If the test suite appears to be running with unexpected results and you suspect
that the state of the docker containers are a factor, you can remove these
docker containers and associated volumes with the following command:

```bash
# This will delete all docker containers who's names begin with `spec_`.
# THIS COULD RESULT IN DATA LOSS!
npm run docker-clean
```

# Other Elasticsearch Versions

By default the tests included in this suite will run against Elasticsearch
`2.3`. The test suite currently supports testing against the following
Elasticsearch versions:

* `1.7`
* `2.3`
* `2.4`
* `5.0`

To configure the suite to test against a different version issue a command of
the following format and then run the standard setup and test tasks:

```bash
npm config set teraslice-integration-tests:esVersion <VERSION>
```

For example, to test against ES 5.0 you would type:

```bash
npm config set teraslice-integration-tests:esVersion 5.0
npm run setup
npm run test
```

The `esVersion` selection you make is saved in your user account, so you will
need to change it any time you want to change the ES version you are testing
against.  You can check the current setting with the following command:

```bash
npm config get teraslice-integration-tests:esVersion
```

If the above command returns `undefined`, it will use the default `esVersion`
config value found in the `package.json` file (currently `2.3`).  You can revert
to the default value with the following command:

```bash
npm config delete teraslice-integration-tests:esVersion
```

### Notes
- teraslice will attempt to listen on port 45678, make sure to stop an local instance to prevent port collisions
- the port for docker's elasticsearch instance listens on 49200, so you can check it at localhost:49200
