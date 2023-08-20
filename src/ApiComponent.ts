import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class ApiComponent extends pulumi.ComponentResource {
    private readonly httpApi: aws.apigatewayv2.Api;
    private readonly stage: aws.apigatewayv2.Stage;
    private readonly apiMapping: aws.apigatewayv2.ApiMapping;
    public readonly endpoint: pulumi.Output<string>;

    constructor(name: string, args: ApiComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:container:ApiComponent", name, args, opts);

        const awsConfig = new pulumi.Config("aws");
        const awsRegion = awsConfig.require("region");
        const awsAccessKey = awsConfig.requireSecret("accessKey");
        const awsSecretKey = awsConfig.requireSecret("secretKey");

        const region = () => {
            for (const [key, value] of Object.entries(aws.Region)) {
                if (value == awsRegion) {
                    return aws.Region[key];
                }
            }
        }

        const awsProvider = new aws.Provider("api-component-aws-" + args.environment, {
            region: region(),
            accessKey: awsAccessKey,
            secretKey: awsSecretKey,
        });

        // Create an HTTP API for the load balancer to route to
        this.httpApi = new aws.apigatewayv2.Api("api-component-" + args.imageName + "-api-" + args.environment, {
            name: args.imageName,
            protocolType: "HTTP",
            disableExecuteApiEndpoint: true,
            target: args.containerUrl,
            routeKey: "$default",
            corsConfiguration: {
                allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allowHeaders: ["*"],
                allowOrigins: [args.appDomain],
                allowCredentials: true,
                exposeHeaders: ["*"],
            },
        }, {
            provider: awsProvider,
        });

        if (args.environment != "prod") {
            this.stage = new aws.apigatewayv2.Stage("api-component-" + args.imageName + "-stage-" + args.environment, {
                apiId: this.httpApi.id,
                autoDeploy: true,
                name: args.environment,
            }, {
                provider: awsProvider,
            });
            this.apiMapping = new aws.apigatewayv2.ApiMapping("api-component-" + args.imageName + "-mapping-" + args.environment, {
                apiId: this.httpApi.id,
                domainName: args.apiDomain,
                stage: this.stage.name,
                apiMappingKey: pulumi.interpolate`${args.imageName}/${args.environment}`,
            }, {
                provider: awsProvider,
            });
        } else {
            this.apiMapping = new aws.apigatewayv2.ApiMapping("api-component-" + args.imageName + "-mapping-" + args.environment, {
                apiId: this.httpApi.id,
                domainName: args.apiDomain,
                stage: "$default",
                apiMappingKey: pulumi.interpolate`${args.imageName}`,
            }, {
                provider: awsProvider,
            });
        }

        if (args.environment != "prod") {
            this.endpoint = pulumi.interpolate`https://${args.apiDomain}/${args.imageName}/${args.environment}`;
        } else {
            this.endpoint = pulumi.interpolate`https://${args.apiDomain}/${args.imageName}`;
        }

        this.registerOutputs({
            endpoint: this.endpoint,
        });
    }
}

export interface ApiComponentArgs {
    environment: pulumi.Input<string>
    imageName: pulumi.Input<string>
    containerUrl: pulumi.Input<string>
    appDomain: pulumi.Input<string>
    apiDomain: pulumi.Input<string>
}