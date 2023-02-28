const _ = require('lodash');
const chalk = require('chalk');
const { imageEnricherJiraInfo } = require('@codefresh-io/cf-report-image-toolbox');
const { exec } = require('child_process');

const configuration = require('./configuration');

const PLATFORM = {
    CLASSIC: 'CLASSIC'
};

// Export link
async function _saveLink(url) {
    return new Promise((resolve) => {
        function handleResult(error, stdout, stderr) {
            if (error) {
                console.warn(`Cannot save Jira link. ${error.message}`);
                return resolve();
            }
            if (stderr) {
                console.warn(`Cannot save Jira link. ${stderr}`);
                return resolve();
            }

            console.log(`Exported Jira link: ${url}`);
            resolve();
        }

        const { CF_VOLUME_PATH, LINK_VAR_NAME } = process.env;
        exec(`echo ${LINK_VAR_NAME}=${url} >> ${CF_VOLUME_PATH}/env_vars_to_export`, handleResult);
    });
}

async function execute() {
    console.log(`Looking for Issues from message ${configuration.message}`);

    const email = _.get(configuration, 'jira.basic_auth.email');
    const apiToken = _.get(configuration, 'jira.basic_auth.api_token');

    await imageEnricherJiraInfo({
        platform: PLATFORM.CLASSIC,
        cfHost: configuration.host,
        cfApiKey: configuration.apiToken,
        imageName: configuration.image,
        projectName: configuration.projectName,
        message: configuration.message,
        jira: {
            host: configuration.jira.host,
            authentication: {
                ...(email && apiToken && { basic: { email, apiToken } }),
                personalAccessToken: configuration.jira.personalAccessToken,
            },
            context: configuration.jira.context,
        },
        failOnNotFound: configuration.failOnNotFound,
    }, _saveLink);
}

execute()
  .catch(e => {
      console.log(chalk.red(e.message));
      process.exit(1);
  });
