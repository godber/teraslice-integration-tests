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

If you are using dockers old mac and windows client, you will need to set an enviromental variabiable of ip=docker, otherwise it will attempt to load to localhost 

```
npm install
npm run setup

//old version of docker
ip=docker npm run setup
```

## Running the test suite

```
npm test

//old version of docker
ip=docker npm test
```

## Read logs of docker
from the root of the folder, `cd` into /spec and type the command below
```
docker-compose logs
```

### Notes
- teraslice will attempt to listen on port 5678, make sure to stop an local instance to prevent port collisions
- the port for docker's elasticsearch instance listens on 9210, so you can check it at localhost:9210 //or docker:9210 if old way