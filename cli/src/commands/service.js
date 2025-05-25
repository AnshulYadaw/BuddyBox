const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const Conf = require('conf');
const config = new Conf();

const program = new Command('service');

// List services command
program
  .command('list')
  .description('List all services')
  .action(async () => {
    const spinner = ora('Fetching services...').start();

    try {
      const response = await axios.get('/service');
      
      spinner.succeed(chalk.green('Services fetched successfully'));
      console.log(chalk.blue('\nServices:'));
      response.data.data.services.forEach(service => {
        console.log(chalk.yellow(`\nName: ${service.name}`));
        console.log(`Status: ${service.status}`);
        console.log(`Description: ${service.description}`);
      });
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch services'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Get service status command
program
  .command('status')
  .description('Get service status')
  .argument('<serviceName>', 'Name of the service')
  .action(async (serviceName) => {
    const spinner = ora(`Fetching status for ${serviceName}...`).start();

    try {
      const response = await axios.get(`/service/${serviceName}/status`);
      
      spinner.succeed(chalk.green('Status fetched successfully'));
      console.log(chalk.blue('\nService Status:'));
      const status = response.data.data.status;
      console.log(`Name: ${status.name}`);
      console.log(`Active: ${status.active ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`Running: ${status.running ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`Enabled: ${status.enabled ? chalk.green('Yes') : chalk.red('No')}`);
      if (status.lastError) {
        console.log(`Last Error: ${chalk.red(status.lastError)}`);
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch service status'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Start service command
program
  .command('start')
  .description('Start a service')
  .argument('<serviceName>', 'Name of the service')
  .action(async (serviceName) => {
    const spinner = ora(`Starting ${serviceName}...`).start();

    try {
      await axios.post(`/service/${serviceName}/start`);
      spinner.succeed(chalk.green(`Service ${serviceName} started successfully`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to start service'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Stop service command
program
  .command('stop')
  .description('Stop a service')
  .argument('<serviceName>', 'Name of the service')
  .action(async (serviceName) => {
    const spinner = ora(`Stopping ${serviceName}...`).start();

    try {
      await axios.post(`/service/${serviceName}/stop`);
      spinner.succeed(chalk.green(`Service ${serviceName} stopped successfully`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop service'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Restart service command
program
  .command('restart')
  .description('Restart a service')
  .argument('<serviceName>', 'Name of the service')
  .action(async (serviceName) => {
    const spinner = ora(`Restarting ${serviceName}...`).start();

    try {
      await axios.post(`/service/${serviceName}/restart`);
      spinner.succeed(chalk.green(`Service ${serviceName} restarted successfully`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to restart service'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Get service logs command
program
  .command('logs')
  .description('Get service logs')
  .argument('<serviceName>', 'Name of the service')
  .option('-l, --lines <number>', 'Number of log lines to fetch', '100')
  .action(async (serviceName, options) => {
    const spinner = ora(`Fetching logs for ${serviceName}...`).start();

    try {
      const response = await axios.get(`/service/${serviceName}/logs`, {
        params: { lines: options.lines }
      });
      
      spinner.succeed(chalk.green('Logs fetched successfully'));
      console.log(chalk.blue('\nService Logs:'));
      console.log(response.data.data.logs);
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch service logs'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Update service config command
program
  .command('config')
  .description('Update service configuration')
  .argument('<serviceName>', 'Name of the service')
  .option('-f, --file <path>', 'Path to configuration file')
  .action(async (serviceName, options) => {
    const spinner = ora(`Updating configuration for ${serviceName}...`).start();

    try {
      let config;
      if (options.file) {
        // Read config from file
        const fs = require('fs');
        config = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      } else {
        // Prompt for config
        const answers = await inquirer.prompt([
          {
            type: 'editor',
            name: 'config',
            message: 'Enter service configuration (JSON format):',
            validate: input => {
              try {
                JSON.parse(input);
                return true;
              } catch (e) {
                return 'Please enter valid JSON';
              }
            }
          }
        ]);
        config = JSON.parse(answers.config);
      }

      await axios.put(`/service/${serviceName}/config`, { config });
      spinner.succeed(chalk.green(`Service ${serviceName} configuration updated successfully`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to update service configuration'));
      console.error(error.response?.data?.message || error.message);
    }
  });

module.exports = program; 