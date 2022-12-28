const { host, apiToken, image } = require('./configuration');
const rp = require('request-promise');
const { gql, GraphQLClient, ClientError } = require('graphql-request');
const _ = require('lodash');

class CodefreshAPI {

    async createIssue(issue) {

        console.log(`Create issue request ${issue.number}=${issue.url}, image: ${image}`);

        return rp({
            method: 'POST',
            uri: `${host}/api/annotations`,
            body: {
                entityId: image,
                entityType: 'image-issues',
                key: `${issue.number}`,
                value: {
                    url : issue.url,
                    title : issue.title
                }
            },
            headers: {
                'Authorization': `Bearer ${apiToken}`
            },
            json: true
        });
    }

    async getJiraContext(name) {
        return rp({
            method: 'GET',
            uri: `${host}/api/contexts/${name}?regex=true&type=atlassian&decrypt=true`,
            headers: {
                'Authorization': `Bearer ${apiToken}`
            },
            json: true
        });
    }

    async getJiraIssue(context, issueKey) {
        return rp({
            method: 'GET',
            uri: `${host}/api/atlassian/issues/${issueKey}?jira-context=${context}`,
            headers: {
                'Authorization': `Bearer ${apiToken}`
            },
            json: true
        });
    }

    async getUserInfo() {
        try {
            return await rp({
                method: 'GET',
                uri: `${host}/api/user`,
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                },
                json: true
            });
        } catch (e) {
            return this._handleError(e);
        }
    }

    async shouldReportToGitops() {
        try {
            const user = await this.getUserInfo();
            const accountName = _.get(user, 'activeAccountName');
            const accounts = _.get(user, 'account', []);
            const activeAccount = _.find(accounts, (account) => account.name === accountName);
            return _.get(activeAccount, 'features.gitopsImageReporting', false);
        } catch (e) {
            console.log('Unable to check Git Ops image reporting');
            return false;
        }
    }

    async createIssueAnnotation(imageName, issue) {
        console.log(`creating issue annotation ${issue.number}=${issue.url}, image: ${imageName}`);
        try {
            const saveAnnotationMutation = gql`mutation saveAnnotation($annotation: AnnotationArgs!) {
                saveAnnotation(annotation: $annotation)
            }`;
            const vars = {
                annotation: {
                    logicEntityId: { 'id': imageName },
                    entityType: 'image',
                    key: `${issue.number}`,
                    type: 'issue',
                    issueValue: {
                        url: issue.url,
                        title: issue.title,
                        assignee: issue.assignee,
                        avatarURL: issue.avatarURL,
                        status: issue.status
                    },
                }
            };
            return await this._doGraphqlRequest(saveAnnotationMutation, vars);
        } catch (e) {
            console.log('Failed to create issue annotation');
        }
        return null;
    }

    async _doGraphqlRequest(query, variables) {
        const graphQLClient = new GraphQLClient(`${host}/2.0/api/graphql`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`
            },
        });

        return await graphQLClient.request(query, variables);
    }
}
module.exports = new CodefreshAPI();
