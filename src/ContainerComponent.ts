import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";

export class ContainerComponent extends pulumi.ComponentResource {
    private readonly repository: gcp.artifactregistry.Repository;
    private readonly image: docker.Image;
    private readonly service: gcp.cloudrun.Service;
    private readonly invoker: gcp.cloudrun.IamMember;
    public readonly serviceUrl: pulumi.Output<string>;

    constructor(name: string, args: ContainerComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:container:ContainerComponent", name, args, opts);

        const gcpConfig = new pulumi.Config("gcp");
        const gcpProject = gcpConfig.require("project");
        const gcpRegion = gcpConfig.require("region");
        const gcpCredentials = gcpConfig.requireSecret("credentials");

        // Create an Artifact Registry repository
        this.repository = new gcp.artifactregistry.Repository("container-component-" + args.imageName + "-repo-" + args.environment, {
            description: args.environment + " repository for " + args.imageName + " Docker images",
            format: "DOCKER",
            location: gcpRegion,
            repositoryId: args.imageName + "-" + args.environment,
            cleanupPolicies: [
                {
                    id: "max_images",
                    action: "KEEP",
                    mostRecentVersions: {
                        keepCount: args.maxImages,
                    }
                },
                {
                    id: "all_artifacts",
                    action: "DELETE",
                    condition: {
                        olderThan: "43200s"
                    }
                }
            ]
        }, {
            parent: this,
        });

        // Form the repository URL
        const repoUrl = pulumi.concat(gcpRegion, "-docker.pkg.dev/", gcpProject, "/", this.repository.repositoryId);

        // Create a container image for the service.
        this.image = new docker.Image("container-component-" + args.imageName + "-image-" + args.environment, {
            imageName: pulumi.concat(repoUrl, "/", args.imageName),
            build: {
                context: args.appPath,
                platform: "linux/amd64",
                args: {
                    // Cloud Run currently requires x86_64 images
                    // https://cloud.google.com/run/docs/container-contract#languages
                    DOCKER_DEFAULT_PLATFORM: "linux/amd64",
                },
            },
            registry: {
                server: repoUrl,
                username: "_json_key",
                password: gcpCredentials,
            }
        }, {
            dependsOn: [this.repository],
            parent: this,
        });

        const repoDigest = this.image.repoDigest.apply(imageName => {
            return imageName ?? "";
        });

        // Create a Cloud Run service for the container image.
        this.service = new gcp.cloudrun.Service("container-component-" + args.imageName + "-service-" + args.environment, {
            location: gcpRegion,
            template: {
                spec: {
                    containers: [
                        {
                            image: repoDigest,
                            resources: {
                                limits: {
                                    memory: args.memory,
                                    cpu: args.cpu.toString(),
                                },
                            },
                            ports: [
                                {
                                    containerPort: args.containerPort,
                                },
                            ],
                        }
                    ],
                    containerConcurrency: args.concurrency,
                }
            },
        }, {
            dependsOn: [this.image],
            parent: this,
        });

        // Create an IAM member to allow the service to be publicly accessible.
        this.invoker = new gcp.cloudrun.IamMember("container-component-" + args.imageName + "-invoker-" + args.environment, {
            location: gcpRegion,
            service: this.service.name,
            role: "roles/run.invoker",
            member: "allUsers",
        }, {
            dependsOn: [this.service],
            parent: this,
        });

        this.serviceUrl = this.service.statuses[0].url;

        // We also need to register all the expected outputs for this
        // component resource that will get returned by default.
        this.registerOutputs({
            serviceUrl: this.serviceUrl,
        });
    }
}

export interface ContainerComponentArgs {
    environment: pulumi.Input<string>;
    imageName: pulumi.Input<string>;
    maxImages: pulumi.Input<number>;
    appPath: pulumi.Input<string>;
    memory: pulumi.Input<string>;
    cpu: pulumi.Input<string>;
    containerPort: pulumi.Input<number>;
    concurrency: pulumi.Input<number>;
}