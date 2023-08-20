# pulumi-quickstart-library
This is a Pulumi Component Library built to allow for extremely quick API creation. 
In particular, this library is designed to provide a fast and simple way to deploy a containerised API to Google Cloud Run,
and then expose it to the internet via AWS Api Gateway.

## Requirements
* [Node.js](https://nodejs.org/en/download/)
* [Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Docker](https://docs.docker.com/get-docker/)
* [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
* [Google Cloud Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
* [Google Cloud Service Account](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
* [AWS Account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
* [AWS IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)
* [AWS Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html)

## Installation
```bash
npm install @partplanner/infra-api-library
```

## Usage
### Api Component
```typescript
import { ApiComponent } from '@partplanner/infra-api-library';

const api = new ApiComponent("api", {
    environment: environment, // dev, staging, prod
    imageName: imageName, // name of the image to use
    containerUrl: containerComponent.serviceUrl, // url of the container
    appDomain: appUrl, // domain of the app
    apiDomain: apiDomain, // domain of the api
});
```

### Container Component
```typescript
import { ContainerComponent } from '@partplanner/infra-api-library';

const container = new ContainerComponent("container", {
    environment: environment, // dev, staging, prod
    imageName: imageName, // name of the image to use
    appPath: appPath, // path of the app
    location: location, // gcp location
    project: project,  // gcp project
    keyFile: keyFile, // gcp key file contents
    memory: memory, // memory to allocate
    cpu: cpu, // cpu to allocate
    containerPort: containerPort, // port to expose
    concurrency: concurrency, // max concurrent requests
});
```

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this library.

## License
This library is licensed under the MIT License. See the [LICENSE](LICENSE) file.

## Reference
* [Pulumi](https://www.pulumi.com/)
* [Pulumi Component Resource](https://www.pulumi.com/docs/intro/concepts/programming-model/#component-resources)